
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; 
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Appointment, Patient } from "@/types/homeoconnect"; // Added Patient
import { format } from "date-fns";
import { PlusCircle, Search, CalendarClock, Users, MoreHorizontal, Edit, Eye, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, APPOINTMENTS_COLLECTION, PATIENTS_COLLECTION, collection, query, where, getDocs, Timestamp, deleteDoc, doc } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface EnrichedAppointment extends Appointment {
  patientName: string;
  patientAvatar?: string;
}

export default function DoctorAppointmentsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]); 
  const [dataLoading, setDataLoading] = useState(true); // Local data loading

  useEffect(() => {
    const fetchAppointmentsAndPatients = async () => {
      if (!user || !db || userProfile?.role !== 'doctor') {
        setDataLoading(false);
        setPageLoading(false);
        return;
      }
      setDataLoading(true);
      setPageLoading(true);
      try {
        // Fetch patients first to map names to appointments
        const patientsQuery = query(collection(db, PATIENTS_COLLECTION), where("doctorId", "==", user.uid));
        const patientsSnapshot = await getDocs(patientsQuery);
        const patientsMap = new Map<string, Patient>();
        patientsSnapshot.docs.forEach(doc => patientsMap.set(doc.id, { id: doc.id, ...doc.data() } as Patient));

        // Fetch appointments
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
            patientAvatar: `https://placehold.co/40x40.png?text=${(patient?.name || 'P').charAt(0)}`,
          } as EnrichedAppointment;
        });
        setAppointments(fetchedAppointments);

      } catch (error) {
        console.error("Error fetching appointments: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load appointments." });
      } finally {
        setDataLoading(false);
        setPageLoading(false);
      }
    };

    if (!authLoading && user && userProfile?.role === 'doctor') {
      fetchAppointmentsAndPatients();
    } else if (!authLoading && !user) {
      setDataLoading(false);
      setPageLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, authLoading, toast]);


  const filteredAppointments = useMemo(() => {
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
      // setPageLoading(true); // Optional: loader for delete action
      try {
        await deleteDoc(doc(db, APPOINTMENTS_COLLECTION, appointmentId));
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
        toast({title: "Success", description: `Appointment deleted.`});
      } catch (error) {
        console.error("Error deleting appointment: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete appointment." });
      } 
      // finally { setPageLoading(false); }
    }
  };

  if (authLoading) {
    return null; // DashboardShell handles the primary loader
  }

  return (
    <div className="space-y-6">
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
                {dataLoading ? "Loading..." : `${filteredAppointments.length} appointment(s) found.`}
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
              ): filteredAppointments.length > 0 ? (
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
                      {filteredAppointments.map((apt) => (
                        <TableRow key={apt.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium hidden sm:table-cell">{format(new Date(apt.appointmentDate), "p")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                                <Image src={apt.patientAvatar || `https://placehold.co/32x32.png?text=${apt.patientName.charAt(0)}`} alt={apt.patientName} width={32} height={32} className="rounded-full" data-ai-hint="person avatar"/>
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
                                <Link href={`/doctor/appointments/new?appointmentId=${apt.id}&patientId=${apt.patientId}`}> 
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
  );
}

