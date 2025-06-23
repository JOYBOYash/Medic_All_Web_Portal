
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; 
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Appointment, Patient } from "@/types/homeoconnect";
import { format, startOfDay, addDays } from "date-fns";
import { PlusCircle, Search, CalendarClock, Users, MoreHorizontal, Edit, Eye, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, APPOINTMENTS_COLLECTION, PATIENTS_COLLECTION, collection, query, where, getDocs, Timestamp, deleteDoc, doc } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";


interface EnrichedAppointment extends Appointment {
  patientName: string;
  patientAvatar?: string;
}

function AppointmentDayCard({ title, date, appointments }: { title: string, date: Date, appointments: EnrichedAppointment[] }) {
    return (
        <Card className="shadow-lg flex flex-col h-full">
            <CardHeader>
                <CardTitle className="font-headline">{title}</CardTitle>
                <CardDescription>{format(date, "PPP")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                {appointments.length > 0 ? (
                    <ScrollArea className="h-64">
                        <div className="space-y-3 pr-4">
                            {appointments.map(apt => (
                                <div key={apt.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Image src={apt.patientAvatar || `https://images.unsplash.com/photo-1633332755192-727a05c4013d`} alt={apt.patientName} width={32} height={32} className="rounded-full object-cover" data-ai-hint="profile person"/>
                                        <div>
                                            <p className="font-semibold text-sm">{apt.patientName}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(apt.appointmentDate), "p")}</p>
                                        </div>
                                    </div>
                                    <Link href={`/doctor/appointments/edit/${apt.id}`}>
                                        <Button variant="ghost" size="icon">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <CalendarClock className="h-10 w-10 mb-2 opacity-50" />
                        <p>No appointments scheduled.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function DoctorAppointmentsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]); 
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const fetchAppointmentsAndPatients = async () => {
      if (!user || !db || userProfile?.role !== 'doctor') return;

      setDataLoading(true);
      setPageLoading(true);
      try {
        const patientsQuery = query(collection(db, PATIENTS_COLLECTION), where("doctorId", "==", user.uid));
        const patientsSnapshot = await getDocs(patientsQuery);
        const patientsMap = new Map<string, Patient>();
        patientsSnapshot.docs.forEach(doc => patientsMap.set(doc.id, { id: doc.id, ...doc.data() } as Patient));

        const appointmentsQuery = query(collection(db, APPOINTMENTS_COLLECTION), where("doctorId", "==", user.uid));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        
        const fetchedAppointments = appointmentsSnapshot.docs.map(docSnap => {
          const aptData = docSnap.data() as Appointment;
          const patient = patientsMap.get(aptData.patientId);
          return {
            ...aptData,
            id: docSnap.id,
            appointmentDate: (aptData.appointmentDate as unknown as Timestamp).toDate(),
            createdAt: (aptData.createdAt as unknown as Timestamp).toDate(),
            updatedAt: (aptData.updatedAt as unknown as Timestamp).toDate(),
            nextAppointmentDate: aptData.nextAppointmentDate ? (aptData.nextAppointmentDate as unknown as Timestamp).toDate() : undefined,
            patientName: patient?.name || "Unknown Patient",
            patientAvatar: `https://images.unsplash.com/photo-1633332755192-727a05c4013d`,
          } as EnrichedAppointment;
        });
        setAppointments(fetchedAppointments);

      } catch (err: any) {
        console.error("Error fetching appointments: ", err);
        if (err.code === 'failed-precondition' && err.message?.toLowerCase().includes('query requires an index')) {
          toast({
            variant: "destructive",
            title: "Database Index Required",
            description: "A database index is needed to load appointments. Please check the Firebase console to create it.",
            duration: 20000 
          });
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not load appointments." });
        }
      } finally {
        setDataLoading(false);
        setPageLoading(false);
      }
    };
    fetchAppointmentsAndPatients();
  }, [user, userProfile, toast, setPageLoading, authLoading]);

  const { todayAppointments, tomorrowAppointments, dayAfterAppointments } = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(new Date(), 1));
    const dayAfter = startOfDay(addDays(new Date(), 2));

    const todayApts = appointments
        .filter(apt => startOfDay(new Date(apt.appointmentDate)).getTime() === today.getTime())
        .sort((a,b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
    const tomorrowApts = appointments
        .filter(apt => startOfDay(new Date(apt.appointmentDate)).getTime() === tomorrow.getTime())
        .sort((a,b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
    const dayAfterApts = appointments
        .filter(apt => startOfDay(new Date(apt.appointmentDate)).getTime() === dayAfter.getTime())
        .sort((a,b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

    return {
        todayAppointments: todayApts,
        tomorrowAppointments: tomorrowApts,
        dayAfterAppointments: dayAfterApts
    };
  }, [appointments]);


  const filteredAppointmentsByDate = useMemo(() => {
    let filtered = appointments;
    if (selectedDate) {
      filtered = filtered.filter(apt => format(new Date(apt.appointmentDate), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"));
    }
    if (searchTerm) {
      filtered = filtered.filter(apt => apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered.sort((a,b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  }, [appointments, selectedDate, searchTerm]);

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
        toast({ variant: "destructive", title: "Unauthorized", description: "Not authorized." });
        return;
    }
    if(confirm("Are you sure you want to delete this appointment?")){
      try {
        await deleteDoc(doc(db, APPOINTMENTS_COLLECTION, appointmentId));
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
        toast({title: "Success", description: `Appointment deleted.`});
      } catch (error) {
        console.error("Error deleting appointment: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete appointment." });
      } 
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Manage Appointments</h1>
          <p className="text-muted-foreground">Oversee all scheduled and past patient consultations.</p>
        </div>
        <Link href="/doctor/appointments/new"> 
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Schedule New Appointment
          </Button>
        </Link>
      </div>

       <div className="space-y-4">
        <h2 className="text-2xl font-bold font-headline text-primary-foreground_dark">Upcoming Schedule</h2>
        {dataLoading ? (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-lg">
                        <CardHeader><Skeleton className="h-6 w-3/5" /></CardHeader>
                        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                    </Card>
                ))}
           </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AppointmentDayCard title="Today" date={new Date()} appointments={todayAppointments} />
                <AppointmentDayCard title="Tomorrow" date={addDays(new Date(), 1)} appointments={tomorrowAppointments} />
                <AppointmentDayCard title="Day After Tomorrow" date={addDays(new Date(), 2)} appointments={dayAfterAppointments} />
            </div>
        )}
      </div>

      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-bold font-headline text-primary-foreground_dark">Find by Date</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
            <Card className="shadow-lg">
                <CardHeader>
                <CardTitle className="font-headline">Select Date</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border p-0"
                />
                </CardContent>
            </Card>
            </div>

            <div className="lg:col-span-2">
            <Card className="shadow-lg">
                <CardHeader>
                <CardTitle className="font-headline">
                    Appointments for {selectedDate ? format(selectedDate, "PPP") : "All Dates"}
                </CardTitle>
                <CardDescription>
                    {dataLoading ? "Loading..." : `${filteredAppointmentsByDate.length} appointment(s) found.`}
                </CardDescription>
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                    type="search"
                    placeholder="Search by patient name..."
                    className="w-full pl-10 bg-background border rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                </CardHeader>
                <CardContent>
                {dataLoading ? (
                    <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ): filteredAppointmentsByDate.length > 0 ? (
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] hidden sm:table-cell">Time</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead className="hidden md:table-cell">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredAppointmentsByDate.map((apt) => (
                            <TableRow key={apt.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium hidden sm:table-cell">{format(new Date(apt.appointmentDate), "p")}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Image src={apt.patientAvatar || `https://images.unsplash.com/photo-1633332755192-727a05c4013d`} alt={apt.patientName} width={32} height={32} className="rounded-full object-cover" data-ai-hint="profile person"/>
                                    <span>{apt.patientName}</span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                <span className={`px-2 py-1 text-xs rounded-full font-semibold
                                ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : ''}
                                ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                                ${apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                                `}>
                                {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                </span>
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
                                    <Link href={`/doctor/patients/${apt.patientId}`}>
                                    <DropdownMenuItem><Users className="mr-2 h-4 w-4" /> View Patient Profile</DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                    onClick={() => handleDeleteAppointment(apt.id)}
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
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                    <CalendarClock className="mx-auto h-12 w-12 mb-4" />
                    <p className="font-semibold">No appointments found for this selection.</p>
                    <p>Try a different date or clear search terms.</p>
                    </div>
                )}
                </CardContent>
            </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
