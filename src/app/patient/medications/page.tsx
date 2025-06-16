
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PrescribedMedicine } from "@/types/homeoconnect";
import { format } from "date-fns";
import { Pill, Bell, Clock, ListChecks, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

// Mock data - replace with API call
const mockPrescriptions: PrescribedMedicine[] = [
  { medicineId: "med1", medicineName: "Arnica Montana 30C", quantity: "5 pills", repetition: { morning: true, afternoon: false, evening: true }, instructions: "Take on empty stomach." },
  { medicineId: "med2", medicineName: "Nux Vomica 200CH", quantity: "3 pills", repetition: { morning: false, afternoon: false, evening: true }, instructions: "After dinner, before sleep." },
  { medicineId: "med3", medicineName: "Pulsatilla 6X", quantity: "10 drops in water", repetition: { morning: true, afternoon: true, evening: false } },
];

interface MedicationWithReminder extends PrescribedMedicine {
  reminderEnabled: boolean;
  lastTaken?: Date; 
}

export default function PatientMedicationsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth(); // Get setPageLoading
  const [medications, setMedications] = useState<MedicationWithReminder[]>(
    mockPrescriptions.map(p => ({ ...p, reminderEnabled: true }))
  );
  const [dataLoading, setDataLoading] = useState(true); // Local state

  useEffect(() => {
    // Simulate data fetching
    setPageLoading(true);
    setDataLoading(true);
    setTimeout(() => {
      // setMedications(fetchedMeds); // From API
      setDataLoading(false);
      setPageLoading(false);
    }, 500); 
  }, [setPageLoading]);

  const toggleReminder = (medicineId: string) => {
    setMedications(prevMeds => 
      prevMeds.map(med => 
        med.medicineId === medicineId ? { ...med, reminderEnabled: !med.reminderEnabled } : med
      )
    );
  };
  
  const markAsTaken = (medicineId: string, timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    alert(`${medicineId} marked as taken for ${timeOfDay} (placeholder).`);
    setMedications(prevMeds => 
      prevMeds.map(med => 
        med.medicineId === medicineId ? { ...med, lastTaken: new Date() } : med 
      )
    );
  };

  const MedicationCard = ({ medication }: { medication: MedicationWithReminder }) => (
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
            {medication.repetition.morning && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Morning</span> <Button size="xs" variant="outline" onClick={() => markAsTaken(medication.medicineId, 'morning')}>Take</Button></li>}
            {medication.repetition.afternoon && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Afternoon</span> <Button size="xs" variant="outline" onClick={() => markAsTaken(medication.medicineId, 'afternoon')}>Take</Button></li>}
            {medication.repetition.evening && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Evening</span> <Button size="xs" variant="outline" onClick={() => markAsTaken(medication.medicineId, 'evening')}>Take</Button></li>}
          </ul>
        </div>
        {medication.instructions && (
          <p className="text-xs text-muted-foreground mb-3 p-2 border border-dashed rounded-md">
            <strong>Instructions:</strong> {medication.instructions}
          </p>
        )}
         {medication.lastTaken && (
          <p className="text-xs text-green-600 mb-3">
            Last taken: {format(medication.lastTaken, "PPp")}
          </p>
        )}
        <div className="flex items-center justify-between mt-4 p-2 border-t">
          <Label htmlFor={`reminder-${medication.medicineId}`} className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" /> Medication Reminder
          </Label>
          <Switch
            id={`reminder-${medication.medicineId}`}
            checked={medication.reminderEnabled}
            onCheckedChange={() => toggleReminder(medication.medicineId)}
            aria-label={`Toggle reminder for ${medication.medicineName}`}
          />
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading) {
    return null; // DashboardShell handles the primary loader
  }
  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,4rem)-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">My Medications</h1>
          <p className="text-muted-foreground">Manage your current prescriptions and reminders.</p>
        </div>
        <Button variant="outline">
            <ListChecks className="mr-2 h-4 w-4" /> View Medication History
        </Button>
      </div>

      {medications.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {medications.map(med => <MedicationCard key={med.medicineId} medication={med} />)}
        </div>
      ) : (
        <Card className="text-center py-10 shadow-md">
            <CardContent className="text-muted-foreground">
                <Image src="https://placehold.co/200x150.png" data-ai-hint="empty pharmacy" alt="No current medications" width={200} height={150} className="mx-auto mb-4 rounded-lg"/>
                <p className="font-semibold">No current medications prescribed.</p>
                <p>Your active prescriptions will appear here.</p>
            </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><Clock className="text-primary"/> Medication Timers & Log</CardTitle>
            <CardDescription>Set custom timers and log your medication intake (Feature coming soon).</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
            <Image src="https://placehold.co/300x180.png" data-ai-hint="timer log" alt="Medication Timers" width={300} height={180} className="mx-auto mb-4 rounded-lg"/>
            <p>Advanced timers and a detailed log to help you stay on track with your treatment plan.</p>
        </CardContent>
      </Card>
    </div>
  );
}
