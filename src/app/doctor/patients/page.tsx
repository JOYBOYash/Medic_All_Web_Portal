"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Patient } from "@/types/homeoconnect";
import { MoreHorizontal, PlusCircle, Search, User, Edit, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import React, { useState, useMemo } from "react";
import Image from "next/image";

// Mock data - replace with API call
const mockPatients: Patient[] = [
  { id: "1", doctorId: "doc1", name: "Alice Wonderland", age: 30, sex: "female", complications: "Anxiety, Insomnia", createdAt: new Date(), updatedAt: new Date() },
  { id: "2", doctorId: "doc1", name: "Bob The Builder", age: 45, sex: "male", complications: "Back Pain", createdAt: new Date(), updatedAt: new Date() },
  { id: "3", doctorId: "doc1", name: "Charlie Brown", age: 8, sex: "male", complications: "Allergies", createdAt: new Date(), updatedAt: new Date() },
  { id: "4", doctorId: "doc1", name: "Diana Prince", age: 35, sex: "female", complications: "Migraines", createdAt: new Date(), updatedAt: new Date() },
  { id: "5", doctorId: "doc1", name: "Edward Scissorhands", age: 28, sex: "male", complications: "Skin Rashes", createdAt: new Date(), updatedAt: new Date() },
];

export default function DoctorPatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>(mockPatients); // Later, this will be fetched

  const filteredPatients = useMemo(() => {
    return patients.filter(patient =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.complications.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  const handleDeletePatient = (patientId: string) => {
    // Placeholder for delete logic
    if(confirm("Are you sure you want to delete this patient? This action cannot be undone.")){
      setPatients(prev => prev.filter(p => p.id !== patientId));
      alert(`Patient ${patientId} deleted (placeholder)`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Manage Patients</h1>
          <p className="text-muted-foreground">View, add, or edit patient information.</p>
        </div>
        <Link href="/doctor/patients/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Patient
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Patient List</CardTitle>
          <CardDescription>A total of {filteredPatients.length} patients found.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search patients by name or complication..."
              className="w-full pl-10 bg-background border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] hidden sm:table-cell">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Age</TableHead>
                    <TableHead className="hidden md:table-cell">Sex</TableHead>
                    <TableHead>Complications</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="hidden sm:table-cell">
                        <Image 
                          src={`https://placehold.co/40x40.png?text=${patient.name.charAt(0)}`} 
                          alt={patient.name} 
                          width={40} 
                          height={40} 
                          className="rounded-full"
                          data-ai-hint="person avatar" 
                        />
                      </TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{patient.age}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{patient.sex}</TableCell>
                      <TableCell className="max-w-xs truncate" title={patient.complications}>{patient.complications}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <Link href={`/doctor/patients/${patient.id}`}>
                              <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/doctor/patients/${patient.id}/edit`}>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/doctor/appointments/new?patientId=${patient.id}`}>
                                <DropdownMenuItem>
                                    <FileText className="mr-2 h-4 w-4" />
                                    New Appointment
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeletePatient(patient.id)} 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Patient
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
              <User className="mx-auto h-12 w-12 mb-4" />
              <p className="font-semibold">No patients found.</p>
              <p>Try adjusting your search or add a new patient.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
