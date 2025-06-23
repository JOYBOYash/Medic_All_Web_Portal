
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PrescribedMedicine, Appointment } from "@/types/homeoconnect";
import { Pill, Bell, ListChecks, BellRing } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, getDocs, orderBy, Timestamp, PATIENTS_COLLECTION, APPOINTMENTS_COLLECTION } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";

interface MedicationWithContext extends PrescribedMedicine {
  reminderEnabled: boolean;
  appointmentId: string;
  appointmentDate: Date;
}

export default function PatientMedicationsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();
  const { notificationPrefs } = useSettings();
  const [medications, setMedications] = useState<MedicationWithContext[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const scheduledTimers = useRef<NodeJS.Timeout[]>([]);

  const fetchMedications = useCallback(async () => {
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
          return (appointment.prescriptions || []).map(p => {
             const medKey = `${appointment.id}-${p.medicineId}`;
             const storedPref = typeof window !== 'undefined' ? localStorage.getItem(`reminder_${medKey}`) : null;
             const reminderEnabled = storedPref ? JSON.parse(storedPref) : true;
             return {
                ...p,
                reminderEnabled,
                appointmentId: appointment.id,
                appointmentDate: (appointment.appointmentDate as unknown as Timestamp).toDate(),
             }
          });
        });
        
        setMedications(allPrescriptions);

      } catch (error) {
        console.error("Error fetching medications:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load medications." });
      } finally {
        setDataLoading(false);
        setPageLoading(false);
      }
  }, [user, db, userProfile, toast, setPageLoading]);
  
  useEffect(() => {
    if (!authLoading) {
      fetchMedications();
    }
  }, [authLoading, fetchMedications]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);
  
  const requestNotificationAccess = () => {
     if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          if (permission !== 'granted') {
            toast({
              title: "Notifications Disabled",
              description: "You won't receive medication reminders. You can enable them in your browser settings.",
              variant: "default"
            });
          }
        });
      }
  }

  const toggleReminder = (appointmentId: string, medicineId: string) => {
    setMedications(prevMeds =>
      prevMeds.map(med => {
        if (med.appointmentId === appointmentId && med.medicineId === medicineId) {
          const newPref = !med.reminderEnabled;
          const medKey = `${med.appointmentId}-${med.medicineId}`;
          localStorage.setItem(`reminder_${medKey}`, JSON.stringify(newPref));
          if(newPref && notificationPermission === 'default') requestNotificationAccess();
          return { ...med, reminderEnabled: newPref };
        }
        return med;
      })
    );
  };
  
  useEffect(() => {
    scheduledTimers.current.forEach(timerId => clearTimeout(timerId));
    scheduledTimers.current = [];

    if (notificationPermission !== 'granted' || !notificationPrefs.medicationReminders) {
      return;
    }

    const reminderTimes = {
      morning: { hour: 8, minute: 0 },
      afternoon: { hour: 13, minute: 0 },
      evening: { hour: 20, minute: 0 },
    };

    const scheduleNotification = (medName: string) => {
      new Notification('Medication Reminder', {
        body: `It's time to take your ${medName}.`,
        icon: '/logo.png', // Assuming a logo exists in public folder
      });
    };

    const setDailyTimeout = (callback: () => void, hour: number, minute: number) => {
        const schedule = () => {
            const now = new Date();
            const nextNotificationTime = new Date();
            nextNotificationTime.setHours(hour, minute, 0, 0);

            if (now.getTime() > nextNotificationTime.getTime()) {
                nextNotificationTime.setDate(nextNotificationTime.getDate() + 1);
            }

            const timeoutMs = nextNotificationTime.getTime() - now.getTime();
            
            const timerId = setTimeout(() => {
                callback();
                schedule();
            }, timeoutMs);
            
            scheduledTimers.current.push(timerId);
        };
        schedule();
    };


    medications.forEach(med => {
      if (med.reminderEnabled) {
        if (med.repetition.morning) {
          setDailyTimeout(() => scheduleNotification(med.medicineName), reminderTimes.morning.hour, reminderTimes.morning.minute);
        }
        if (med.repetition.afternoon) {
          setDailyTimeout(() => scheduleNotification(med.medicineName), reminderTimes.afternoon.hour, reminderTimes.afternoon.minute);
        }
        if (med.repetition.evening) {
          setDailyTimeout(() => scheduleNotification(med.medicineName), reminderTimes.evening.hour, reminderTimes.evening.minute);
        }
      }
    });

    return () => {
      scheduledTimers.current.forEach(timerId => clearTimeout(timerId));
    };
  }, [medications, notificationPermission, notificationPrefs.medicationReminders]);


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
            {medication.repetition.morning && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Morning (approx. 8:00 AM)</span></li>}
            {medication.repetition.afternoon && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Afternoon (approx. 1:00 PM)</span></li>}
            {medication.repetition.evening && <li className="flex justify-between items-center p-1 rounded bg-secondary/30"><span>Evening (approx. 8:00 PM)</span></li>}
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

       {notificationPermission !== 'granted' && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellRing className="h-6 w-6 text-yellow-700" />
              <div>
                <h3 className="font-semibold text-yellow-800">Enable Notifications</h3>
                <p className="text-sm text-yellow-700">Click here to allow reminders for your medications.</p>
              </div>
            </div>
            <Button onClick={requestNotificationAccess} variant="outline" size="sm">Enable</Button>
          </CardContent>
        </Card>
      )}

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
