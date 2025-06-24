
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile, Patient } from "@/types/homeoconnect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserCircle, Save, ShieldAlert, Loader2, Building } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, doc, updateDoc, serverTimestamp, query, collection, where, getDocs, PATIENTS_COLLECTION, USERS_COLLECTION, writeBatch } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const patientProfileSchema = z.object({
  displayName: z.string().min(2, "Display name is too short"),
  contactNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").optional().or(z.literal('')),
  address: z.string().optional(),
});

type PatientProfileFormValues = z.infer<typeof patientProfileSchema>;

interface ClinicRecord extends Patient {
    doctorName: string;
}

const patientAvatarOptions = [
    { name: 'Avatar 1', url: 'https://avatar.vercel.sh/pat-a.svg' },
    { name: 'Avatar 2', url: 'https://avatar.vercel.sh/pat-b.svg' },
    { name: 'Avatar 3', url: 'https://avatar.vercel.sh/pat-c.svg' },
    { name: 'Avatar 4', url: 'https://avatar.vercel.sh/pat-d.svg' },
    { name: 'Avatar 5', url: 'https://avatar.vercel.sh/pat-e.svg' },
    { name: 'Avatar 6', url: 'https://avatar.vercel.sh/pat-f.svg' },
];

export default function PatientProfilePage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [clinicRecords, setClinicRecords] = useState<ClinicRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.photoURL || "");

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
    setSelectedAvatar(profile.photoURL || "");
  }, [form]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !userProfile || !db) {
        setDataLoading(false);
        return;
      }
      setDataLoading(true);

      try {
        const patientQuery = query(collection(db, PATIENTS_COLLECTION), where("authUid", "==", user.uid));
        const patientSnapshot = await getDocs(patientQuery);
        
        let fetchedClinicRecords: Patient[] = [];
        if (!patientSnapshot.empty) {
          fetchedClinicRecords = patientSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
        }

        const doctorIds = [...new Set(fetchedClinicRecords.map(rec => rec.doctorId))];
        const doctorsMap = new Map<string, string>();
        if (doctorIds.length > 0) {
            const doctorChunks: string[][] = [];
            for (let i = 0; i < doctorIds.length; i += 30) {
                doctorChunks.push(doctorIds.slice(i, i + 30));
            }
            
            for (const chunk of doctorChunks) {
                 const doctorsQuery = query(collection(db, USERS_COLLECTION), where("id", "in", chunk));
                 const doctorsSnapshot = await getDocs(doctorsQuery);
                 doctorsSnapshot.forEach(d => doctorsMap.set(d.id, d.data().displayName || "Unknown Doctor"));
            }
        }

        const enrichedRecords = fetchedClinicRecords.map(rec => ({
            ...rec,
            doctorName: doctorsMap.get(rec.doctorId) || "Unknown Doctor",
        }));
        setClinicRecords(enrichedRecords);
        
        resetForm(userProfile);

      } catch (error) {
        console.error("Error fetching patient profile data:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load profile data." });
      } finally {
        setDataLoading(false);
      }
    };
    
    if (!authLoading && user && userProfile) {
      fetchProfileData();
    } else if (!authLoading) {
      setDataLoading(false);
    }
  }, [authLoading, user, userProfile, toast, resetForm]);

  const onSubmit = async (data: PatientProfileFormValues) => {
    if (!user || !db) return;
    
    try {
        const batch = writeBatch(db);
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        batch.update(userDocRef, {
            displayName: data.displayName,
            contactNumber: data.contactNumber,
            address: data.address,
            photoURL: selectedAvatar,
            updatedAt: serverTimestamp(),
        });

        // Also update the photoURL in the chatRoom participantInfo
        const chatRoomsQuery = query(collection(db, "chatRooms"), where("participants", "array-contains", user.uid));
        const chatRoomsSnapshot = await getDocs(chatRoomsQuery);
        chatRoomsSnapshot.forEach(roomDoc => {
          const roomRef = doc(db, "chatRooms", roomDoc.id);
          batch.update(roomRef, {
            [`participantInfo.${user.uid}.photoURL`]: selectedAvatar,
            [`participantInfo.${user.uid}.displayName`]: data.displayName
          });
        });

        await batch.commit();

        await refreshUserProfile();
        toast({ title: "Success", description: "Your profile has been updated." });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    }
  };

  if (authLoading || dataLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
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
              src={selectedAvatar || "https://avatar.vercel.sh/default.svg"}
              alt={userProfile.displayName || "Patient"}
              width={150}
              height={150}
              className="rounded-full border-4 border-primary shadow-md mb-4 object-cover"
            />
          </div>

          <div className="mb-8">
            <Label>Choose Avatar</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
                {patientAvatarOptions.map((avatar) => (
                    <button
                      key={avatar.name}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.url)}
                      className={cn(
                        "rounded-full p-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        selectedAvatar === avatar.url && "ring-2 ring-primary"
                      )}
                      aria-label={`Select ${avatar.name}`}
                    >
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={avatar.url} alt={avatar.name} />
                         <AvatarFallback>??</AvatarFallback>
                      </Avatar>
                    </button>
                ))}
            </div>
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
