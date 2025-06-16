
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appointment } from "@/types/homeoconnect";
import { format } from "date-fns";
import { CalendarCheck, CalendarX, History, PlusCircle, Download, MessageCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

// Mock data - replace with API call
const mockAppointments: Appointment[] = [
  { id: "apt1", patientId: "user1", doctorId: "doc1", appointmentDate: new Date(new Date().setDate(new Date().getDate() + 5)), status: "scheduled", prescriptions: [], createdAt: new Date(), updatedAt: new Date(), doctorNotes: "Dr. Eva Green" },
  { id: "apt2", patientId: "user1", doctorId: "doc2", appointmentDate: new Date(new Date().setDate(new Date().getDate() - 10)), status: "completed", prescriptions: [{ medicineId: "med1", medicineName: "Arnica", quantity: "10 pills", repetition: {morning:true, afternoon:false, evening:true}}], createdAt: new Date(), updatedAt: new Date(), doctorNotes: "Dr. John Appleseed" },
  { id: "apt3", patientId: "user1", doctorId: "doc1", appointmentDate: new Date(new Date().setDate(new Date().getDate() - 30)), status: "completed", prescriptions: [{ medicineId: "med2", medicineName: "Nux Vomica", quantity: "5 drops", repetition: {morning:true, afternoon:true, evening:true}}], createdAt: new Date(), updatedAt: new Date(), doctorNotes: "Dr. Eva Green" },
  { id: "apt4", patientId: "user1", doctorId: "doc3", appointmentDate: new Date(new Date().setDate(new Date().getDate() + 12)), status: "scheduled", prescriptions: [], createdAt: new Date(), updatedAt: new Date(), doctorNotes: "Dr. Jane Doe" },
  { id: "apt5", patientId: "user1", doctorId: "doc2", appointmentDate: new Date(new Date().setDate(new Date().getDate() - 60)), status: "cancelled", prescriptions: [], createdAt: new Date(), updatedAt: new Date(), doctorNotes: "Dr. John Appleseed" },
];


export default function PatientAppointmentsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth(); // Get setPageLoading
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments); 
  const [dataLoading, setDataLoading] = useState(true); // Local state for this page's data

  useEffect(() => {
    // Simulate data fetching for now
    // In a real app, you'd fetch appointments for the logged-in patient here
    setPageLoading(true);
    setDataLoading(true);
    setTimeout(() => {
      // setAppointments(fetchedAppointments); // From API
      setDataLoading(false);
      setPageLoading(false);
    }, 500); // Simulate network delay
  }, [setPageLoading]);


  const upcomingAppointments = useMemo(() => 
    appointments.filter(apt => apt.status === 'scheduled' && new Date(apt.appointmentDate) >= new Date()).sort((a,b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()), 
  [appointments]);
  
  const pastAppointments = useMemo(() => 
    appointments.filter(apt => apt.status === 'completed' || apt.status === 'cancelled' || (apt.status === 'scheduled' && new Date(apt.appointmentDate) < new Date())).sort((a,b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()), 
  [appointments]);

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-lg">
              {format(new Date(appointment.appointmentDate), "PPP 'at' p")}
            </CardTitle>
            <CardDescription>With {appointment.doctorNotes || "Doctor"}</CardDescription> 
          </div>
          {appointment.status === 'scheduled' && new Date(appointment.appointmentDate) >= new Date() && <CalendarCheck className="h-6 w-6 text-green-500" />}
          {appointment.status === 'completed' && <History className="h-6 w-6 text-blue-500" />}
          {appointment.status === 'cancelled' && <CalendarX className="h-6 w-6 text-red-500" />}
        </div>
      </CardHeader>
      <CardContent>
        {appointment.status === 'completed' && appointment.prescriptions.length > 0 && (
          <div className="mb-3">
            <h4 className="font-semibold text-sm mb-1">Prescriptions:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {appointment.prescriptions.map(p => <li key={p.medicineId}>{p.medicineName} - {p.quantity}</li>)}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"><Download className="mr-1 h-3 w-3" /> View Details</Button>
          {appointment.status === 'scheduled' && new Date(appointment.appointmentDate) >= new Date() && (
            <>
              <Button variant="outline" size="sm">Reschedule</Button>
              <Button variant="destructive" size="sm">Cancel</Button>
            </>
          )}
           <Link href="/patient/chat">
            <Button variant="ghost" size="sm" className="text-primary"><MessageCircle className="mr-1 h-3 w-3"/> Contact Doctor</Button>
           </Link>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading) {
    return null; // DashboardShell handles the primary loader
  }
  if (dataLoading) { // Show local loader if this page is still fetching its specific data
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
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">My Appointments</h1>
          <p className="text-muted-foreground">View your upcoming and past appointments.</p>
        </div>
        <Link href="#schedule-new"> 
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Request New Appointment
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
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
              <Image src="https://placehold.co/200x150.png" data-ai-hint="calendar empty" alt="No upcoming appointments" width={200} height={150} className="mx-auto mb-4 rounded-lg"/>
              <p className="font-semibold">No upcoming appointments.</p>
              <p>Feel free to request a new one if needed.</p>
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
              <Image src="https://placehold.co/200x150.png" data-ai-hint="history empty" alt="No past appointments" width={200} height={150} className="mx-auto mb-4 rounded-lg"/>
              <p className="font-semibold">No past appointments found.</p>
              <p>Your appointment history will appear here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
