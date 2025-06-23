
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PrescribedMedicine, Appointment } from "@/types/homeoconnect";
import { Pill, Bell, ListChecks, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, getDocs, orderBy, Timestamp, PATIENTS_COLLECTION, APPOINTMENTS_COLLECTION } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MedicationWithContext extends PrescribedMedicine {
  reminderEnabled: boolean;
  appointmentId: string;
  appointmentDate: Date;
}

export default function PatientMedicationsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();
  const [medications, setMedications] = useState<MedicationWithContext[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchMedications = async () => {
      if (!user || !db || !userProfile) {
        setDataLoading(false);
        setPageLoading(false);
        return;
      }
      setDataLoading(true);
      setPageLoading(true);

      try {
        const patientQuery = query(collection(db, PATIENTS_COLLECTION), where("authUid", "==", user.uid));
        const patientSnapshot = await getDocs(patientQuery);
        if (patientSnapshot.empty) return;
        
        const patientIds = patientSnapshot.docs.map(d => d.id);
        if (patientIds.length === 0) return;

        const appointmentsQuery = query(
          collection(db, APPOINTMENTS_COLLECTION),
          where("patientId", "in", patientIds),
          where("status", "==", "completed"),
          orderBy("appointmentDate", "desc")
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const allPrescriptions = appointmentsSnapshot.docs.flatMap(doc => {
          const appointment = { id: doc.id, ...doc.data() } as Appointment;
          return (appointment.prescriptions || []).map(p => ({
            ...p,
            reminderEnabled: true, // Default state
            appointmentId: appointment.id,
            appointmentDate: (appointment.appointmentDate as unknown as Timestamp).toDate(),
          }));
        });
        
        setMedications(allPrescriptions);

      } catch (error) {
        console.error("Error fetching medications:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load medications." });
      } finally {
        setDataLoading(false);
        setPageLoading(false);
      }
    };

    if (!authLoading) {
      fetchMedications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, userProfile]);

  const toggleReminder = (appointmentId: string, medicineId: string) => {
    setMedications(prevMeds =>
      prevMeds.map(med =>
        med.appointmentId === appointmentId && med.medicineId === medicineId 
        ? { ...med, reminderEnabled: !med.reminderEnabled } : med
      )
    );
  };

  const MedicationCard = ({ medication }: { medication: MedicationWithContext }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-lg">{medication.medicineName}</CardTitle>
            <CardDescription>{medication.quantity}</CardDescription>
          </div>
          <Pill className={`h-6 w-6 ${medication.reminderEnabled ? 'text-accent' : 'text-muted-foreground'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <h4 className="font-semibold text-sm mb-1">Dosage Schedule:</h4>
          <ul className="list-none space-y-1 text-sm">
            {medication.repetition.morning && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Morning</span></li>}
            {medication.repetition.afternoon && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Afternoon</span></li>}
            {medication.repetition.evening && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Evening</span></li>}
          </ul>
        </div>
        {medication.instructions && (
          <p className="text-xs text-muted-foreground mb-3 p-2 border border-dashed rounded-md">
            <strong>Instructions:</strong> {medication.instructions}
          </p>
        )}
        <p className="text-xs text-muted-foreground mb-3">
          Prescribed on: {format(medication.appointmentDate, "PPP")}
        </p>
        <div className="flex items-center justify-between mt-4 p-2 border-t">
          <Label htmlFor={`reminder-${medication.appointmentId}-${medication.medicineId}`} className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" /> Medication Reminder
          </Label>
          <Switch
            id={`reminder-${medication.appointmentId}-${medication.medicineId}`}
            checked={medication.reminderEnabled}
            onCheckedChange={() => toggleReminder(medication.appointmentId, medication.medicineId)}
            aria-label={`Toggle reminder for ${medication.medicineName}`}
          />
        </div>
      </CardContent>
    </Card>
  );

  if (dataLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">My Medications</h1>
          <p className="text-muted-foreground">A list of all medications prescribed from your past consultations.</p>
        </div>
        <Button variant="outline" disabled>
            <ListChecks className="mr-2 h-4 w-4" /> Medication Log (Coming Soon)
        </Button>
      </div>

      {medications.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {medications.map((med, index) => <MedicationCard key={`${med.appointmentId}-${med.medicineId}-${index}`} medication={med} />)}
        </div>
      ) : (
        <Card className="text-center py-10 shadow-md">
            <CardContent className="text-muted-foreground">
                <Image src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae" data-ai-hint="medication pharmacy" alt="Assorted medication pills" width={200} height={150} className="mx-auto mb-4 rounded-lg object-cover"/>
                <p className="font-semibold">No medications found in your history.</p>
                <p>Your prescribed medications will appear here after a consultation.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
