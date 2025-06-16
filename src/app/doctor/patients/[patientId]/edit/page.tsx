
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { PATIENTS_COLLECTION, doc, getFirestoreDoc, updateDoc, serverTimestamp, db } from "@/lib/firebase";
import type { Patient } from "@/types/homeoconnect";
import { useToast } from "@/hooks/use-toast";

const patientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce.number().min(0, { message: "Age must be a positive number." }).max(120),
  sex: z.enum(["male", "female", "other"], { required_error: "Sex is required." }),
  complications: z.string().min(5, { message: "Please describe complications (min 5 characters)." }),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const { user, loading: authLoading, userProfile } = useAuth();
  const { toast } = useToast();
  const [dataLoading, setDataLoading] = useState(true);
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      age: "" as unknown as number, // Initialize with empty string for controlled input
      sex: undefined,
      complications: "",
    },
  });

  useEffect(() => {
    const fetchPatient = async () => {
      if (!user || !db || !patientId || userProfile?.role !== 'doctor') {
        setDataLoading(false);
        return;
      }
      setDataLoading(true);
      try {
        const patientDocRef = doc(db, PATIENTS_COLLECTION, patientId);
        const docSnap = await getFirestoreDoc(patientDocRef);
        if (docSnap.exists() && docSnap.data().doctorId === user.uid) {
          const patientData = docSnap.data() as Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>; 
          form.reset({
            name: patientData.name,
            // react-hook-form will handle converting number to string for input if needed
            age: patientData.age, 
            sex: patientData.sex,
            complications: patientData.complications,
          });
        } else {
          toast({ variant: "destructive", title: "Error", description: "Patient not found or you do not have permission to edit." });
          router.push("/doctor/patients");
        }
      } catch (error) {
        console.error("Error fetching patient for edit:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load patient data for editing." });
      }
      setDataLoading(false);
    };
    
    if (!authLoading && user && userProfile?.role === 'doctor') {
      fetchPatient();
    } else if (!authLoading && !user) {
       setDataLoading(false);
       router.push("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, user, userProfile, authLoading, router, toast]); // form.reset is stable

  const onSubmit = async (data: PatientFormValues) => {
    if (!user || !db || !patientId || userProfile?.role !== 'doctor') {
      toast({ variant: "destructive", title: "Error", description: "You are not authorized or database is not available." });
      return;
    }

    try {
      const patientDocRef = doc(db, PATIENTS_COLLECTION, patientId);
      const existingPatientDoc = await getFirestoreDoc(patientDocRef);
      if (!existingPatientDoc.exists() || existingPatientDoc.data()?.doctorId !== user.uid) {
         toast({ variant: "destructive", title: "Error", description: "Patient not found or update not permitted." });
         return;
      }
      const existingData = existingPatientDoc.data();


      await updateDoc(patientDocRef, {
        ...data, 
        doctorId: existingData.doctorId, 
        authUid: existingData.authUid !== undefined ? existingData.authUid : null, 
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Success", description: `Patient "${data.name}" updated successfully.` });
      router.push(`/doctor/patients/${patientId}`); 
    } catch (error) {
      console.error("Error updating patient:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update patient. Please try again." });
    }
  };

  if (authLoading || dataLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Edit Patient Details</h1>
          <p className="text-muted-foreground">Update the patient's information.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Patient Information</CardTitle>
          <CardDescription>Modify the fields below as needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormDescription>Enter the patient's full legal name.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 35" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}> 
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="complications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health Complications</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the patient's primary health issues, symptoms, medical history..."
                        className="resize-y min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Be as detailed as possible.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Link href={patientId ? `/doctor/patients/${patientId}` : "/doctor/patients"}>
                  <Button type="button" variant="outline" disabled={form.formState.isSubmitting}>Cancel</Button>
                </Link>
                <Button type="submit" disabled={form.formState.isSubmitting || authLoading || dataLoading}>
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
    
