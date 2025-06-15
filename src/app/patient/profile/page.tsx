"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserProfile, Patient } from "@/types/homeoconnect"; // Assuming Patient type might have more fields patient can edit
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserCircle, Save, ShieldAlert, Contact } from "lucide-react";
import Image from "next/image";

// Combine relevant fields for patient profile form
const patientProfileSchema = z.object({
  displayName: z.string().min(2, "Display name is too short"),
  email: z.string().email("Invalid email address."), // Usually not editable by user directly
  // photoURL: z.string().url("Invalid URL for photo.").optional().or(z.literal('')),
  // From Patient type, if editable by patient:
  age: z.coerce.number().min(0).max(120).optional(), // Assuming age might be updatable
  sex: z.enum(["male", "female", "other"]).optional(),
  // complications might be more of a doctor's note, but patient might add/edit some summary
  symptomsSummary: z.string().optional(), 
  contactNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").optional().or(z.literal('')),
  address: z.string().optional(),
});

type PatientProfileFormValues = z.infer<typeof patientProfileSchema>;

// Mock data - replace with actual data fetching
const mockPatientUser: UserProfile & Partial<Patient> & { contactNumber?: string, address?: string, symptomsSummary?: string } = {
  id: "patient123",
  email: "patient.zero@example.com",
  role: "patient",
  displayName: "Patient Zero",
  photoURL: "https://placehold.co/150x150.png?text=PZ",
  age: 33,
  sex: "male",
  complications: "Frequent headaches, fatigue (Doctor's view)", // This would be from Doctor's record
  symptomsSummary: "I often get tension headaches, especially in the evening. Also, I feel tired most days.", // Patient's input
  contactNumber: "+15551234567",
  address: "456 Patient Lane, Healthville, CA",
};

export default function PatientProfilePage() {
  const [profileData, setProfileData] = useState(mockPatientUser);

  const form = useForm<PatientProfileFormValues>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      displayName: profileData.displayName || "",
      email: profileData.email || "",
      // photoURL: profileData.photoURL || "",
      age: profileData.age,
      sex: profileData.sex,
      symptomsSummary: profileData.symptomsSummary || "",
      contactNumber: profileData.contactNumber || "",
      address: profileData.address || "",
    },
  });

  const onSubmit = (data: PatientProfileFormValues) => {
    console.log("Patient profile update:", data);
    // Placeholder: Update user profile in Firebase Auth / Firestore
    setProfileData(prev => ({ ...prev, ...data }));
    alert("Profile updated successfully (placeholder)!");
  };

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
              src={profileData.photoURL || "https://placehold.co/150x150.png"}
              alt={profileData.displayName || "Patient"}
              width={150}
              height={150}
              className="rounded-full border-4 border-primary shadow-md mb-4"
              data-ai-hint="patient avatar"
            />
            {/* Input for photoURL or file upload can be added here */}
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
                      <FormControl><Input type="email" {...field} readOnly /></FormControl>
                      <FormDescription>Email cannot be changed here.</FormDescription>
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
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl><Input type="number" placeholder="Your Age" {...field} /></FormControl>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
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
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Your residential address" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="symptomsSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>My Symptoms Summary (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Briefly describe your current or recurring symptoms for your doctor's reference." {...field} className="min-h-[100px]"/></FormControl>
                    <FormDescription>This summary can help your doctor during consultations.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? "Saving..." : "Save Profile Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg mt-8">
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><ShieldAlert className="text-destructive"/> Important Medical Information</CardTitle>
            <CardDescription>This section is managed by your doctor. Contact them for any updates.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2 p-4 border rounded-lg bg-secondary/30">
                <h4 className="font-semibold">Main Health Complications (as per doctor's record):</h4>
                <p className="text-muted-foreground">{profileData.complications || "Not specified by doctor."}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">If this information is incorrect or outdated, please discuss it with your doctor during your next appointment or via chat.</p>
        </CardContent>
      </Card>

    </div>
  );
}
