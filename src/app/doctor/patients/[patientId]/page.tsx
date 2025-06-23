
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Edit, PlusCircle, User as UserIcon, CalendarDays, Pill, BriefcaseMedical, Loader2, MoreHorizontal, Eye, Trash2, FileText, Link as LinkIcon, Link2Off, Mail } from "lucide-react";
import type { Patient, Appointment } from "@/types/homeoconnect";
import { useAuth } from "@/context/AuthContext";
import { db, PATIENTS_COLLECTION, APPOINTMENTS_COLLECTION, doc, getFirestoreDoc, collection, query, where, getDocs, Timestamp, deleteDoc } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";


export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  
  const patientId = params.patientId as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const fetchPatientData = useCallback(async () => {
    if (!user || !db || !patientId || userProfile?.role !== 'doctor') return;
    
    setPageLoading(true);
    try {
      const patientDocRef = doc(db, PATIENTS_COLLECTION, patientId);
      const patientDocSnap = await getFirestoreDoc(patientDocRef);

      if (patientDocSnap.exists() && patientDocSnap.data().doctorId === user.uid) {
        setPatient({ 
          id: patientDocSnap.id, 
          ...patientDocSnap.data(),
          createdAt: patientDocSnap.data().createdAt?.toDate ? patientDocSnap.data().createdAt.toDate() : new Date(),
          updatedAt: patientDocSnap.data().updatedAt?.toDate ? patientDocSnap.data().updatedAt.toDate() : new Date(),
         } as Patient);
      } else {
        toast({ variant: "destructive", title: "Error", description: "Patient not found or access denied." });
        router.push("/doctor/patients"); 
        return; 
      }

      const appointmentsQuery = query(
        collection(db, APPOINTMENTS_COLLECTION),
        where("patientId", "==", patientId),
        where("doctorId", "==", user.uid) 
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const fetchedAppointments = appointmentsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        appointmentDate: (docSnap.data().appointmentDate as Timestamp).toDate(),
        createdAt: (docSnap.data().createdAt as Timestamp).toDate(),
        updatedAt: (docSnap.data().updatedAt as Timestamp).toDate(),
        nextAppointmentDate: docSnap.data().nextAppointmentDate ? (docSnap.data().nextAppointmentDate as Timestamp).toDate() : undefined,
      } as Appointment));
      setAppointments(fetchedAppointments);

    } catch (error) {
      console.error("Error fetching patient data: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load patient data." });
    } finally {
      setPageLoading(false);
    }
  }, [patientId, user, userProfile, setPageLoading, toast, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPatientData();
    } else if (!authLoading) {
      setPageLoading(false);
    }
  }, [authLoading, user, fetchPatientData, setPageLoading]);

  const upcomingAppointments = useMemo(() => 
    appointments
      .filter(apt => apt.status === 'scheduled' && new Date(apt.appointmentDate) >= new Date())
      .sort((a,b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()), 
  [appointments]);
  
  const pastAppointments = useMemo(() => 
    appointments
      .filter(apt => apt.status === 'completed' || apt.status === 'cancelled' || (apt.status === 'scheduled' && new Date(apt.appointmentDate) < new Date()))
      .sort((a,b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()), 
  [appointments]);


  const handleDeleteAppointment = async (appointmentId: string) => {
     if (!user || !db || userProfile?.role !== 'doctor') {
        toast({ variant: "destructive", title: "Unauthorized", description: "Not authorized." });
        return;
    }
    if (confirm("Are you sure you want to delete this appointment?")) {
      try {
        await deleteDoc(doc(db, APPOINTMENTS_COLLECTION, appointmentId));
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
        toast({ title: "Success", description: "Appointment deleted." });
      } catch (error) {
        console.error("Error deleting appointment: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete appointment." });
      }
    }
  };


  if (authLoading || !patient) { 
    return null; 
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/doctor/patients">
            <Button variant="outline" size="icon" aria-label="Back to patients list">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            </Link>
            <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark flex items-center gap-2">
                {patient.name}
                {patient.authUid ? (
                    <Badge variant="default" className="bg-green-100 text-green-700 text-xs px-2 py-0.5">
                        <LinkIcon className="mr-1 h-3 w-3"/> Linked
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        <Link2Off className="mr-1 h-3 w-3"/> Not Linked
                    </Badge>
                )}
            </h1>
            <p className="text-muted-foreground">Patient Details & History</p>
            </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/doctor/patients/${patient.id}/edit`}>
            <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
          </Link>
          <Link href={`/doctor/appointments/new?patientId=${patient.id}`}>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> New Appointment</Button>
          </Link>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><UserIcon className="text-primary"/>Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <Image src={`https://avatar.vercel.sh/${patient.id}.svg`} alt={patient.name} width={60} height={60} className="rounded-full object-cover"/>
            <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{patient.name}</p>
            </div>
          </div>
           <div>
            <p className="text-sm font-medium text-muted-foreground">Age</p>
            <p className="text-lg">{patient.age} years</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sex</p>
            <p className="text-lg capitalize">{patient.sex}</p>
          </div>
          <div className="lg:col-span-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Mail className="h-4 w-4"/>Email</p>
            <p className="text-base">{patient.email || "Not provided"}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-sm font-medium text-muted-foreground">Health Complications / History</p>
            <p className="text-base whitespace-pre-wrap">{patient.complications || "Not specified"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><BriefcaseMedical className="text-accent"/>Appointments History</CardTitle>
          <CardDescription>Manage and review all appointments for {patient.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments.length})</TabsTrigger>
              <TabsTrigger value="past">Past & Cancelled ({pastAppointments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {upcomingAppointments.length > 0 ? (
                <AppointmentsTable appointments={upcomingAppointments} patientName={patient.name} onDelete={handleDeleteAppointment} />
              ) : (
                <p className="text-center text-muted-foreground py-6">No upcoming appointments scheduled.</p>
              )}
            </TabsContent>
            <TabsContent value="past">
              {pastAppointments.length > 0 ? (
                 <AppointmentsTable appointments={pastAppointments} patientName={patient.name} onDelete={handleDeleteAppointment} />
              ) : (
                <p className="text-center text-muted-foreground py-6">No past appointments found.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


interface AppointmentsTableProps {
  appointments: Appointment[];
  patientName: string;
  onDelete: (appointmentId: string) => Promise<void>;
}

function AppointmentsTable({ appointments, patientName, onDelete }: AppointmentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Prescriptions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((apt) => (
            <TableRow key={apt.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium">
                {format(new Date(apt.appointmentDate), "PPP, p")}
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 text-xs rounded-full font-semibold
                  ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : ''}
                  ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                  ${apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell max-w-xs truncate">
                {apt.prescriptions.length > 0 
                  ? apt.prescriptions.map(p => p.medicineName).join(', ') 
                  : "None"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <Link href={`/doctor/appointments/edit/${apt.id}`}> 
                      <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View/Edit Details</DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(apt.id)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Appointment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
