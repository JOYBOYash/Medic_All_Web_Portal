
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Pill, MessageSquareHeart, FileText, User, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, getDocs, limit, orderBy, Timestamp, doc, getFirestoreDoc, PATIENTS_COLLECTION, APPOINTMENTS_COLLECTION, USERS_COLLECTION } from "@/lib/firebase";
import { Appointment, PrescribedMedicine, UserProfile } from "@/types/homeoconnect";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EnrichedAppointment extends Appointment {
  doctorName?: string;
}

export default function PatientDashboardPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();
  const [dataLoading, setDataLoading] = useState(true);
  const [upcomingAppointment, setUpcomingAppointment] = useState<EnrichedAppointment | null>(null);
  const [currentMedications, setCurrentMedications] = useState<PrescribedMedicine[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !db || !userProfile) {
        setDataLoading(false);
        setPageLoading(false);
        return;
      }
      setDataLoading(true);
      setPageLoading(true);

      try {
        const patientQuery = query(collection(db, PATIENTS_COLLECTION), where("authUid", "==", user.uid), limit(1));
        const patientSnapshot = await getDocs(patientQuery);

        if (patientSnapshot.empty) {
          toast({ variant: "default", title: "No Patient Record", description: "No patient record linked to your account. Please contact your doctor." });
          return;
        }
        const patientRecord = { id: patientSnapshot.docs[0].id, ...patientSnapshot.docs[0].data() };

        // Fetch upcoming appointment
        const appointmentQuery = query(
          collection(db, APPOINTMENTS_COLLECTION),
          where("patientId", "==", patientRecord.id),
          where("status", "==", "scheduled"),
          where("appointmentDate", ">=", Timestamp.now()),
          orderBy("appointmentDate"),
          limit(1)
        );
        const appointmentSnapshot = await getDocs(appointmentQuery);

        if (!appointmentSnapshot.empty) {
          const apt = { id: appointmentSnapshot.docs[0].id, ...appointmentSnapshot.docs[0].data() } as Appointment;
          const doctorDocRef = doc(db, USERS_COLLECTION, apt.doctorId);
          const doctorSnap = await getFirestoreDoc(doctorDocRef);
          const doctorName = doctorSnap.exists() ? (doctorSnap.data() as UserProfile).displayName : "Doctor";
          setUpcomingAppointment({ ...apt, doctorName: doctorName || "Doctor" });
        }

        // Fetch recent medications from last completed appointment
        const medicationQuery = query(
          collection(db, APPOINTMENTS_COLLECTION),
          where("patientId", "==", patientRecord.id),
          where("status", "==", "completed"),
          orderBy("appointmentDate", "desc"),
          limit(1)
        );
        const medicationSnapshot = await getDocs(medicationQuery);
        if (!medicationSnapshot.empty) {
          const lastApt = medicationSnapshot.docs[0].data() as Appointment;
          setCurrentMedications(lastApt.prescriptions || []);
        }

      } catch (error) {
        console.error("Error fetching patient dashboard data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load dashboard data." });
      } finally {
        setDataLoading(false);
        setPageLoading(false);
      }
    };

    if (!authLoading) {
      fetchDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, userProfile, toast]);

  const quickAccessActions = [
    { label: "View Past Appointments", href: "/patient/appointments?tab=past", icon: <FileText /> },
    { label: "Chat with Doctor", href: "/patient/chat", icon: <MessageSquareHeart /> },
    { label: "Update Profile", href: "/patient/profile", icon: <User /> },
  ];
  
  if (authLoading || dataLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,4rem)-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Patient Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userProfile?.displayName || "Patient"}!</p>
        </div>
        <Link href="/patient/appointments">
            <Button>
                <CalendarDays className="mr-2 h-4 w-4" /> My Appointments
            </Button>
        </Link>
      </div>

      {upcomingAppointment ? (
        <Card className="shadow-md bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline text-primary">Upcoming Appointment</CardTitle>
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <CardDescription>Your next consultation is scheduled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold">With {upcomingAppointment.doctorName}</p>
            <p className="text-muted-foreground">{format(upcomingAppointment.appointmentDate.toDate(), "PPP 'at' p")}</p>
            <div className="flex gap-2 pt-2">
              <Link href="/patient/appointments">
                  <Button variant="default" size="sm">View Details</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
            <CardContent className="p-6 text-center text-muted-foreground">
                <p>No upcoming appointments. </p>
                 <Link href="/patient/appointments">
                    <Button variant="link" className="p-0 h-auto">Request a new appointment</Button>
                </Link>
            </CardContent>
        </Card>
      )}


      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline">Recent Medications</CardTitle>
              <Pill className="h-6 w-6 text-accent" />
            </div>
            <CardDescription>From your last completed appointment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentMedications.length > 0 ? (
              currentMedications.map((med) => (
                <div key={med.medicineId} className="p-3 border rounded-lg bg-secondary/30">
                  <p className="font-semibold">{med.medicineName}</p>
                  <p className="text-sm text-muted-foreground">{med.quantity}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center pt-4">No recent medications found.</p>
            )}
            <Link href="/patient/medications">
              <Button variant="link" className="p-0 h-auto text-primary mt-2">View all medications</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline">Quick Access</CardTitle>
            <CardDescription>Navigate to important sections easily.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickAccessActions.map((action) => (
               <Link href={action.href} key={action.label}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  {action.icon && React.cloneElement(action.icon, {className: "h-4 w-4"})}
                  {action.label}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
