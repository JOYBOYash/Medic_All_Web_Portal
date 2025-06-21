
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserProfile, Patient } from "@/types/homeoconnect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserCircle, Save, ShieldAlert, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, doc, updateDoc, serverTimestamp, getFirestoreDoc, query, collection, where, getDocs, PATIENTS_COLLECTION, USERS_COLLECTION } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const patientProfileSchema = z.object({
  displayName: z.string().min(2, "Display name is too short"),
  email: z.string().email("Invalid email address.").optional(), // Email is read-only from auth
  contactNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").optional().or(z.literal('')),
  address: z.string().optional(),
});

type PatientProfileFormValues = z.infer<typeof patientProfileSchema>;

export default function PatientProfilePage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<PatientProfileFormValues>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      displayName: "",
      email: "",
      contactNumber: "",
      address: "",
    },
  });

  const resetForm = useCallback((profile: UserProfile, patient: Patient | null) => {
    form.reset({
      displayName: profile.displayName || "",
      email: profile.email || "",
      contactNumber: profile.contactNumber || "",
      address: profile.address || "",
    });
  }, [form]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !userProfile || !db) {
        setDataLoading(false);
        setPageLoading(false);
        return;
      }
      setDataLoading(true);
      setPageLoading(true);

      try {
        const patientQuery = query(collection(db, PATIENTS_COLLECTION), where("authUid", "==", user.uid), limit(1));
        const patientSnapshot = await getDocs(patientQuery);
        
        let fetchedPatientRecord: Patient | null = null;
        if (!patientSnapshot.empty) {
          fetchedPatientRecord = { id: patientSnapshot.docs[0].id, ...patientSnapshot.docs[0].data() } as Patient;
          setPatientRecord(fetchedPatientRecord);
        }
        
        // Use userProfile from context as the source of truth for editable fields
        resetForm(userProfile, fetchedPatientRecord);

      } catch (error) {
        console.error("Error fetching patient profile data:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load profile data." });
      } finally {
        setDataLoading(false);
        setPageLoading(false);
      }
    };
    
    if (!authLoading && user && userProfile) {
      fetchProfileData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, userProfile, toast, resetForm]);

  const onSubmit = async (data: PatientProfileFormValues) => {
    if (!user || !db) return;
    
    try {
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        await updateDoc(userDocRef, {
            displayName: data.displayName,
            contactNumber: data.contactNumber,
            address: data.address,
            updatedAt: serverTimestamp(),
        });
        toast({ title: "Success", description: "Your profile has been updated." });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,4rem)-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">My Profile</h1>
        <p className="text-muted-foreground">View and manage your personal information and health summary.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline"><UserCircle className="h-6 w-6 text-primary"/> Personal Information</CardTitle>
          <CardDescription>Keep your details up to date for better service.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <Image
              src={userProfile?.photoURL || "https://placehold.co/150x150.png"}
              alt={userProfile?.displayName || "Patient"}
              width={150}
              height={150}
              className="rounded-full border-4 border-primary shadow-md mb-4"
              data-ai-hint="patient avatar"
            />
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" {...field} readOnly disabled /></FormControl>
                      <FormDescription>Email cannot be changed.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl><Input type="tel" placeholder="+1234567890" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {patientRecord && (
                    <>
                         <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl><Input value={patientRecord.age} readOnly disabled /></FormControl>
                            <FormDescription>Managed by your doctor.</FormDescription>
                        </FormItem>
                         <FormItem>
                            <FormLabel>Sex</FormLabel>
                             <FormControl><Input value={patientRecord.sex} className="capitalize" readOnly disabled /></FormControl>
                             <FormDescription>Managed by your doctor.</FormDescription>
                        </FormItem>
                    </>
                )}
              </div>
               <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Your residential address" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                 {form.formState.isSubmitting ? "Saving..." : "Save Profile Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {patientRecord && (
        <Card className="shadow-lg mt-8">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><ShieldAlert className="text-destructive"/> Doctor's Notes on Record</CardTitle>
                <CardDescription>This section is managed by your doctor and cannot be edited by you.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 p-4 border rounded-lg bg-secondary/30">
                    <h4 className="font-semibold">Main Health Complications:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{patientRecord.complications || "Not specified by doctor."}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">If this information is incorrect or outdated, please discuss it with your doctor.</p>
            </CardContent>
        </Card>
      )}

    </div>
  );
}
