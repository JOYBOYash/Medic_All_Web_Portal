
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // Shadcn calendar
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Appointment } from "@/types/homeoconnect";
import { format } from "date-fns";
import { PlusCircle, Search, CalendarClock, Users, MoreHorizontal, Edit, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Mock data - replace with API call (appointments for THIS doctor)
const mockDoctorAppointments: (Appointment & { patientName: string, patientAvatar?: string })[] = [
  { id: "apt_doc_1", patientId: "pat1", doctorId: "doc1", appointmentDate: new Date(new Date().setDate(new Date().getDate() + 2)), status: "scheduled", prescriptions: [], createdAt: new Date(), updatedAt: new Date(), patientName: "Alice Wonderland", patientAvatar: "https://placehold.co/40x40.png?text=AW" },
  { id: "apt_doc_2", patientId: "pat2", doctorId: "doc1", appointmentDate: new Date(new Date().setDate(new Date().getDate() + 2)), status: "scheduled", prescriptions: [], createdAt: new Date(), updatedAt: new Date(), patientName: "Bob The Builder", patientAvatar: "https://placehold.co/40x40.png?text=BTB" },
  { id: "apt_doc_3", patientId: "pat3", doctorId: "doc1", appointmentDate: new Date(new Date().setDate(new Date().getDate() - 1)), status: "completed", prescriptions: [{ medicineId: "m1", medicineName: "Arnica", quantity: "10", repetition: {morning:true, afternoon:false, evening:true} }], createdAt: new Date(), updatedAt: new Date(), patientName: "Charlie Brown", patientAvatar: "https://placehold.co/40x40.png?text=CB" },
  { id: "apt_doc_4", patientId: "pat1", doctorId: "doc1", appointmentDate: new Date(new Date().setDate(new Date().getDate() + 5)), status: "scheduled", prescriptions: [], createdAt: new Date(), updatedAt: new Date(), patientName: "Alice Wonderland", patientAvatar: "https://placehold.co/40x40.png?text=AW" },
];


export default function DoctorAppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [appointments, setAppointments] = useState(mockDoctorAppointments); // This would be fetched for the logged-in doctor

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

  const handleDeleteAppointment = (appointmentId: string) => {
    if(confirm("Are you sure you want to delete this appointment?")){
      setAppointments(prev => prev.filter(a => a.id !== appointmentId));
      alert(`Appointment ${appointmentId} deleted (placeholder)`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Manage Appointments</h1>
          <p className="text-muted-foreground">Oversee all scheduled and past patient consultations.</p>
        </div>
        <Link href="/doctor/appointments/new"> {/* This might need patient selection first, or be a general scheduler */}
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
                {filteredAppointments.length} appointment(s) found.
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by patient name..."
                  className="w-full pl-10 bg-background border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!!selectedDate} // Optionally disable search when a date is selected, or filter further
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredAppointments.length > 0 ? (
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
                                <Link href={`/doctor/patients/${apt.patientId}/appointments/${apt.id}`}> {/* Example path */}
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
