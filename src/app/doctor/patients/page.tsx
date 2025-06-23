
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Patient } from "@/types/homeoconnect";
import { MoreHorizontal, PlusCircle, Search, User, Edit, Trash2, FileText, Loader2, Link as LinkIcon, Link2Off } from "lucide-react";
import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, PATIENTS_COLLECTION, collection, query, where, getDocs, doc, deleteDoc } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function DoctorPatientsPage() {
  const { user, loading: authLoading, userProfile, setPageLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!user || !userProfile || userProfile.role !== 'doctor') return;
    
    setPageLoading(true);
    try {
      // The query now fetches all patients for the doctor, regardless of status.
      // This is more robust against older data that may not have a 'status' field.
      const q = query(collection(db, PATIENTS_COLLECTION), where("doctorId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedPatients = querySnapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(),
        } as Patient))
        // We filter out archived patients on the client side.
        // This handles cases where 'status' is undefined, treating them as active.
        .filter(patient => patient.status !== 'archived');
        
      setPatients(fetchedPatients);
    } catch (error: any) {
      console.error("Error fetching patients: ", error);
      if (error.code === 'failed-precondition' && error.message?.toLowerCase().includes('index')) {
        toast({
            variant: "destructive",
            title: "Database Index Required",
            description: "An index is needed to view patients. Please check your Firebase console to create it.",
            duration: 20000,
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not load patients." });
      }
    } finally {
      setPageLoading(false);
    }
  }, [user, userProfile, toast, setPageLoading]);
  
  useEffect(() => {
    if (!authLoading && user) {
      fetchPatients();
    }
  }, [authLoading, user, fetchPatients]);


  const filteredPatients = useMemo(() => {
    return patients
      .filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.complications && patient.complications.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchTerm]);

  const handleDeletePatient = async (patientId: string, patientName: string) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
        toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
        return;
    }
    if (window.confirm(`Are you sure you want to permanently delete patient "${patientName}"? This action cannot be undone.`)) {
      setDeletingPatientId(patientId);
      try {
        await deleteDoc(doc(db, PATIENTS_COLLECTION, patientId));
        toast({ title: "Success", description: `Patient "${patientName}" has been deleted.` });
        setPatients(prev => prev.filter(p => p.id !== patientId));
      } catch (error) {
        console.error("Error deleting patient: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete patient." });
      } finally {
        setDeletingPatientId(null);
      }
    }
  };
  
  if (authLoading) {
    return null; 
  }

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
          <CardDescription>
            A total of {filteredPatients.length} patient(s) found {searchTerm && `matching "${searchTerm}"`}.
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, or complication..."
              className="w-full pl-10 bg-background border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] hidden sm:table-cell">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Age</TableHead>
                    <TableHead className="hidden md:table-cell">Sex</TableHead>
                    <TableHead>Complications</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="hidden sm:table-cell">
                        <Image 
                          src={`https://avatar.vercel.sh/${patient.id}.svg`} 
                          alt={patient.name} 
                          width={40} 
                          height={40} 
                          className="rounded-full object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{patient.email || "N/A"}</TableCell>
                      <TableCell className="hidden md:table-cell">{patient.age}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{patient.sex}</TableCell>
                      <TableCell className="max-w-xs truncate" title={patient.complications}>{patient.complications}</TableCell>
                       <TableCell className="hidden sm:table-cell">
                        {patient.authUid ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <LinkIcon className="mr-1 h-3 w-3" /> Linked
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Link2Off className="mr-1 h-3 w-3" /> Not Linked
                          </Badge>
                        )}
                      </TableCell>
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
                              onClick={() => handleDeletePatient(patient.id, patient.name)} 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              disabled={deletingPatientId === patient.id}
                            >
                               {deletingPatientId === patient.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              {deletingPatientId === patient.id ? 'Deleting...' : 'Delete Patient'}
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
              <p className="font-semibold">
                {searchTerm ? "No patients found." : "You haven't added any patients yet."}
              </p>
              <p>
                {searchTerm 
                  ? "Try adjusting your search terms." 
                  : "Click 'Add New Patient' to get started."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
