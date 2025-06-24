
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2, LinkIcon, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { PATIENTS_COLLECTION, doc, getFirestoreDoc, updateDoc, serverTimestamp, db } from "@/lib/firebase";
import type { Patient } from "@/types/homeoconnect";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const patientFormSchema = z.object({
  complications: z.string().min(5, { message: "Please describe complications (min 5 characters)." }),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const { user, loading: authLoading, userProfile } = useAuth();
  const { toast } = useToast();
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [pageDataLoading, setPageDataLoading] = useState(true);
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      complications: "",
    },
  });

  const fetchPatient = useCallback(async () => {
    if (!user || !db || !patientId || userProfile?.role !== 'doctor') return;
    
    setPageDataLoading(true);
    try {
      const patientDocRef = doc(db, PATIENTS_COLLECTION, patientId);
      const docSnap = await getFirestoreDoc(patientDocRef);
      if (docSnap.exists() && docSnap.data().doctorId === user.uid) {
        const fetchedPatientData = docSnap.data() as Patient; 
        setPatientData(fetchedPatientData);
        form.reset({
          complications: fetchedPatientData.complications,
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Patient not found or you do not have permission to edit." });
        router.push("/doctor/patients");
      }
    } catch (error) {
      console.error("Error fetching patient for edit:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load patient data for editing." });
    } finally {
      setPageDataLoading(false);
    }
  }, [patientId, user, userProfile, router, toast, form]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPatient();
    } else if (!authLoading) {
       setPageDataLoading(false);
    }
  }, [authLoading, user, fetchPatient]);

  const onSubmit = async (data: PatientFormValues) => {
    if (!user || !db || !patientId || userProfile?.role !== 'doctor' || !patientData) {
      toast({ variant: "destructive", title: "Error", description: "You are not authorized or patient data is missing." });
      return;
    }
    
    const patientDocRef = doc(db, PATIENTS_COLLECTION, patientId);

    try {
      await updateDoc(patientDocRef, {
        complications: data.complications,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Success", description: `Patient "${patientData.name}" updated successfully.` });
      router.push(`/doctor/patients/${patientId}`); 
    } catch (error) {
      console.error("Error updating patient:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update patient. Please try again." });
    }
  };

  if (authLoading || pageDataLoading) { 
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!patientData) {
      return <p>Patient could not be loaded.</p>
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href={patientId ? `/doctor/patients/${patientId}` : "/doctor/patients"}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Edit Patient Clinical Notes</h1>
          <p className="text-muted-foreground">Update the patient's clinic-specific information.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><User className="text-primary"/>Patient Record</CardTitle>
          <CardDescription>Patient-managed details are read-only. You can edit the clinical notes for your record.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <Input value={patientData.name} readOnly disabled />
                </FormItem>
                 <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <Input value={patientData.email} readOnly disabled />
                </FormItem>
                 <FormItem>
                    <FormLabel>Age</FormLabel>
                    <Input value={patientData.age} readOnly disabled />
                </FormItem>
                 <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <Input value={patientData.sex} className="capitalize" readOnly disabled />
                </FormItem>
            </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="complications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health Complications / Clinical Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the patient's primary health issues, symptoms, medical history for this clinic..."
                        className="resize-y min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Link href={patientId ? `/doctor/patients/${patientId}` : "/doctor/patients"}>
                  <Button type="button" variant="outline" disabled={form.formState.isSubmitting}>Cancel</Button>
                </Link>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
