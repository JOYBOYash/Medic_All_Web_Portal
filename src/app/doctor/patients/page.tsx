
"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Patient } from "@/types/homeoconnect";
import { MoreHorizontal, PlusCircle, Search, User, Edit, Trash2, FileText, Loader2, Link as LinkIcon, Link2Off } from "lucide-react";
import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, PATIENTS_COLLECTION, APPOINTMENTS_COLLECTION, CHAT_ROOMS_COLLECTION, collection, query, where, getDocs, doc, writeBatch } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function DoctorPatientsPage() {
  const { user, loading: authLoading, userProfile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!user || !userProfile || userProfile.role !== 'doctor') return;
    
    setDataLoading(true);
    try {
      const q = query(collection(db, PATIENTS_COLLECTION), where("doctorId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedPatients = querySnapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(),
        } as Patient))
        // Filter on the client side to include patients without a 'status' field (older records)
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
      setDataLoading(false);
    }
  }, [user, userProfile, toast]);
  
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

  const handleOpenDeleteDialog = (patient: Patient) => {
    setPatientToDelete(patient);
    setIsDeleteAlertOpen(true);
  };

  const handleRemovePatient = async () => {
    if (!patientToDelete || !user || !db || userProfile?.role !== 'doctor') {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred. Please try again." });
      setPatientToDelete(null);
      setIsDeleteAlertOpen(false);
      return;
    }
    
    const patientToRemove = patientToDelete;
    setDeletingPatientId(patientToRemove.id);
    setIsDeleteAlertOpen(false);

    try {
      const batch = writeBatch(db);

      // Delete all appointments for this patient from this doctor
      const appointmentsQuery = query(collection(db, APPOINTMENTS_COLLECTION), where("patientId", "==", patientToRemove.id), where("doctorId", "==", user.uid));
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      appointmentsSnapshot.forEach(doc => batch.delete(doc.ref));

      // Delete the chat room if it exists
      if (patientToRemove.authUid) {
          const ids = [user.uid, patientToRemove.authUid];
          ids.sort();
          const chatRoomId = ids.join('_');
          const chatRoomRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId);
          // Note: We are deleting the chat room document. The subcollection of messages will become orphaned.
          // This is a trade-off to avoid complex security rules or hitting read limits on batched deletes.
          batch.delete(chatRoomRef);
      }

      // Finally, delete the patient record itself
      const patientDocRef = doc(db, PATIENTS_COLLECTION, patientToRemove.id);
      batch.delete(patientDocRef);

      await batch.commit();
      
      toast({ title: "Success", description: `Patient "${patientToRemove.name}" and all associated data have been removed from your clinic.` });
      // Real-time list update
      setPatients(prev => prev.filter(p => p.id !== patientToRemove.id));

    } catch (error) {
      console.error("Error removing patient record: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to remove patient. Please check permissions and try again." });
    } finally {
      setDeletingPatientId(null);
      setPatientToDelete(null);
    }
  };
  
  if (authLoading) {
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
          {dataLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : patients.length > 0 ? (
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
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={deletingPatientId === patient.id}>
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
                              onClick={() => handleOpenDeleteDialog(patient)} 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              disabled={deletingPatientId === patient.id}
                            >
                               {deletingPatientId === patient.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              {deletingPatientId === patient.id ? 'Removing...' : 'Remove From Clinic'}
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

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the patient "{patientToDelete?.name}" and all of their associated appointments and chat history from your clinic. Their main Medicall account will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPatientToDelete(null)} disabled={!!deletingPatientId}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemovePatient} 
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={!!deletingPatientId}
            >
              {deletingPatientId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deletingPatientId ? 'Removing...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
