
"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appointment, UserProfile } from "@/types/homeoconnect";
import { format } from "date-fns";
import { CalendarCheck, CalendarX, History, MessageCircle, Loader2, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, getDocs, doc, Timestamp, PATIENTS_COLLECTION, APPOINTMENTS_COLLECTION, USERS_COLLECTION } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface EnrichedAppointment extends Appointment {
  doctorName?: string;
  doctorPhotoURL?: string | null;
}

function PatientAppointmentsContent() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "past" ? "past" : "upcoming";
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user || !db || !userProfile) {
        setDataLoading(false);
        return;
      }
      setDataLoading(true);

      try {
        const patientQuery = query(collection(db, PATIENTS_COLLECTION), where("authUid", "==", user.uid));
        const patientSnapshot = await getDocs(patientQuery);

        if (patientSnapshot.empty) {
          toast({ title: "No Linked Record", description: "No patient record from a clinic is linked to your account." });
          setDataLoading(false);
          return;
        }

        const patientIds = patientSnapshot.docs.map(d => d.id);
        if (patientIds.length === 0) {
          setDataLoading(false);
          return;
        }
        
        const appointmentsQuery = query(collection(db, APPOINTMENTS_COLLECTION), where("patientId", "in", patientIds));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);

        if (appointmentsSnapshot.empty) {
            setDataLoading(false);
            return;
        }

        const doctorIds = [...new Set(appointmentsSnapshot.docs.map(d => d.data().doctorId as string))];
        const doctorsMap = new Map<string, UserProfile>();

        if (doctorIds.length > 0) {
            const doctorChunks: string[][] = [];
            for (let i = 0; i < doctorIds.length; i += 30) {
                doctorChunks.push(doctorIds.slice(i, i + 30));
            }
            
            for (const chunk of doctorChunks) {
                 const doctorsQuery = query(collection(db, USERS_COLLECTION), where("id", "in", chunk));
                 const doctorsSnapshot = await getDocs(doctorsQuery);
                 doctorsSnapshot.docs.forEach(d => {
                    doctorsMap.set(d.id, { id: d.id, ...d.data() } as UserProfile);
                 });
            }
        }
        
        const fetchedAppointments = appointmentsSnapshot.docs.map(docSnap => {
          const aptData = docSnap.data() as Appointment;
          const doctor = doctorsMap.get(aptData.doctorId);
          return {
            ...aptData,
            id: docSnap.id,
            appointmentDate: (aptData.appointmentDate as unknown as Timestamp).toDate(),
            doctorName: doctor?.displayName || "Unknown Doctor",
            doctorPhotoURL: doctor?.photoURL || `https://avatar.vercel.sh/${aptData.doctorId}.svg`,
          } as EnrichedAppointment;
        });

        setAppointments(fetchedAppointments);

      } catch (error) {
        console.error("Error fetching appointments:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load appointments." });
      } finally {
        setDataLoading(false);
      }
    };

    if (!authLoading) {
      fetchAppointments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, userProfile]);

  const upcomingAppointments = useMemo(() =>
    appointments.filter(apt => apt.status === 'scheduled' && new Date(apt.appointmentDate) >= new Date()).sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()),
    [appointments]);

  const pastAppointments = useMemo(() =>
    appointments.filter(apt => apt.status !== 'scheduled' || new Date(apt.appointmentDate) < new Date()).sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()),
    [appointments]);
    
  const AppointmentCard = ({ appointment }: { appointment: EnrichedAppointment }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-lg">
              {format(new Date(appointment.appointmentDate), "PPP 'at' p")}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
                <Image src={appointment.doctorPhotoURL || `https://avatar.vercel.sh/${appointment.doctorId}.svg`} alt={appointment.doctorName || "Doctor"} width={24} height={24} className="rounded-full object-cover"/>
                With {appointment.doctorName || "Doctor"}
            </CardDescription>
          </div>
          {appointment.status === 'scheduled' && <CalendarCheck className="h-6 w-6 text-green-500" />}
          {appointment.status === 'completed' && <History className="h-6 w-6 text-blue-500" />}
          {appointment.status === 'cancelled' && <CalendarX className="h-6 w-6 text-red-500" />}
        </div>
      </CardHeader>
      <CardContent>
        {appointment.status === 'completed' && appointment.prescriptions.length > 0 && (
          <div className="mb-3">
            <h4 className="font-semibold text-sm mb-1">Prescriptions:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {appointment.prescriptions.map((p, i) => <li key={p.medicineId + i}>{p.medicineName} - {p.quantity}</li>)}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled><Download className="mr-1 h-3 w-3" /> View Details</Button>
          {appointment.status === 'scheduled' && (
            <Button variant="destructive" size="sm" disabled>Cancel</Button>
          )}
           <Link href={`/patient/chat?doctorId=${appointment.doctorId}`}>
            <Button variant="ghost" size="sm" className="text-primary"><MessageCircle className="mr-1 h-3 w-3"/> Contact Doctor</Button>
           </Link>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading || dataLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">My Appointments</h1>
          <p className="text-muted-foreground">View your upcoming and past appointments.</p>
        </div>
         <p className="text-sm text-muted-foreground">To schedule a new appointment, please contact your doctor's clinic directly.</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past & Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">
          {upcomingAppointments.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {upcomingAppointments.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Image src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe" data-ai-hint="calendar schedule" alt="A calendar on a wall" width={200} height={150} className="mx-auto mb-4 rounded-lg object-cover"/>
              <p className="font-semibold">No upcoming appointments.</p>
              <p>Contact your clinic if you need to schedule one.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          {pastAppointments.length > 0 ? (
             <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {pastAppointments.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Image src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8" data-ai-hint="history book" alt="An open book representing history" width={200} height={150} className="mx-auto mb-4 rounded-lg object-cover"/>
              <p className="font-semibold">No past appointments found.</p>
              <p>Your appointment history will appear here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PatientAppointmentsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <PatientAppointmentsContent />
        </Suspense>
    );
}
