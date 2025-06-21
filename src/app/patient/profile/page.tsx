
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile, Patient, ClinicDetails } from "@/types/homeoconnect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserCircle, Save, ShieldAlert, Loader2, Building } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, doc, updateDoc, serverTimestamp, query, collection, where, getDocs, PATIENTS_COLLECTION, USERS_COLLECTION } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const patientProfileSchema = z.object({
  displayName: z.string().min(2, "Display name is too short"),
  contactNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").optional().or(z.literal('')),
  address: z.string().optional(),
});

type PatientProfileFormValues = z.infer<typeof patientProfileSchema>;

interface ClinicRecord extends Patient {
    doctorName: string;
}

export default function PatientProfilePage() {
  const { user, userProfile, loading: authLoading, setPageLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [clinicRecords, setClinicRecords] = useState<ClinicRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<PatientProfileFormValues>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      displayName: "",
      contactNumber: "",
      address: "",
    },
  });

  const resetForm = useCallback((profile: UserProfile) => {
    form.reset({
      displayName: profile.displayName || "",
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
        // Fetch all patient records (clinic-specific) linked to this user
        const patientQuery = query(collection(db, PATIENTS_COLLECTION), where("authUid", "==", user.uid));
        const patientSnapshot = await getDocs(patientQuery);
        
        let fetchedClinicRecords: Patient[] = [];
        if (!patientSnapshot.empty) {
          fetchedClinicRecords = patientSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
        }

        // Get unique doctor IDs to fetch their names
        const doctorIds = [...new Set(fetchedClinicRecords.map(rec => rec.doctorId))];
        const doctorsMap = new Map<string, string>();
        if (doctorIds.length > 0) {
            // Firestore 'in' queries are limited to 10 items for web sdk, chunk if necessary.
            // For now, assuming less than 10 doctors per patient. If more, chunking is needed.
            const doctorsQuery = query(collection(db, USERS_COLLECTION), where("id", "in", doctorIds));
            const doctorsSnapshot = await getDocs(doctorsQuery);
            doctorsSnapshot.forEach(d => doctorsMap.set(d.id, d.data().displayName || "Unknown Doctor"));
        }

        // Enrich clinic records with doctor names
        const enrichedRecords = fetchedClinicRecords.map(rec => ({
            ...rec,
            doctorName: doctorsMap.get(rec.doctorId) || "Unknown Doctor",
        }));
        setClinicRecords(enrichedRecords);
        
        // Use userProfile from context as the source of truth for editable fields
        resetForm(userProfile);

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
    } else if (!authLoading) {
      setPageLoading(false);
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
        await refreshUserProfile(); // Refresh the profile in the context
        toast({ title: "Success", description: "Your profile has been updated." });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    }
  };

  if (authLoading || dataLoading) {
    return null; // The DashboardShell will display the loader
  }
  
  if (!userProfile) return <p>Could not load user profile.</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">My Profile</h1>
        <p className="text-muted-foreground">View and manage your personal information and health summary.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline"><UserCircle className="h-6 w-6 text-primary"/> Personal Information</CardTitle>
          <CardDescription>This information is shared across all your clinics.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <Image
              src={userProfile.photoURL || "https://placehold.co/150x150.png"}
              alt={userProfile.displayName || "Patient"}
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
                 <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input value={userProfile.email || ""} readOnly disabled /></FormControl>
                    <FormDescription>Email cannot be changed.</FormDescription>
                </FormItem>
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number (Optional)</FormLabel>
                      <FormControl><Input type="tel" placeholder="+1234567890" {...field} value={field.value || ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Your residential address" {...field} value={field.value || ""} /></FormControl>
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

      {clinicRecords.length > 0 && (
        <Card className="shadow-lg mt-8">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><ShieldAlert className="text-destructive"/> Clinic-Specific Records</CardTitle>
                <CardDescription>This section is managed by your doctors and cannot be edited by you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {clinicRecords.map(record => (
                    <div key={record.id} className="p-4 border rounded-lg bg-secondary/30">
                        <h4 className="font-semibold flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground"/>Clinic of {record.doctorName}</h4>
                        <p className="text-sm font-medium mt-2">Main Health Complications:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.complications || "Not specified by doctor."}</p>
                    </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">If any information is incorrect, please discuss it with the respective doctor.</p>
            </CardContent>
        </Card>
      )}

    </div>
  );
}
