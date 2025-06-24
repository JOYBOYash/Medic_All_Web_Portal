
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClinicDetails, UserProfile } from "@/types/homeoconnect";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, UserCircle, Building, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const userProfileSchema = z.object({
  displayName: z.string().min(2, "Display name is too short."),
  email: z.string().email("Invalid email address."),
});

const clinicDetailsSchema = z.object({
  clinicName: z.string().min(3, "Clinic name is too short."),
  address: z.string().min(5, "Address is too short."),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."), 
  specialization: z.string().optional(),
});

type UserProfileFormValues = z.infer<typeof userProfileSchema>;
type ClinicDetailsFormValues = z.infer<typeof clinicDetailsSchema>;

// Mock data - replace with actual data fetching from Firestore
const mockClinic: ClinicDetails = {
  id: "doc123", 
  clinicName: "Princeton-Plainsboro Teaching Hospital (Medicall Wing)",
  address: "123 Fictional St, Princeton, NJ",
  phoneNumber: "+16095550123",
  specialization: "Diagnostic Homeopathy, Rare Conditions",
};

export default function DoctorProfilePage() {
  const { userProfile, loading: authLoading } = useAuth();
  
  const profileForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      displayName: "", 
      email: "",       
    },
  });

  const clinicForm = useForm<ClinicDetailsFormValues>({
    resolver: zodResolver(clinicDetailsSchema),
    defaultValues: mockClinic, 
  });

  useEffect(() => {
    if (userProfile) {
        profileForm.reset({
          displayName: userProfile.displayName || "",
          email: userProfile.email || "",
        });
        clinicForm.reset(mockClinic);
      }
  }, [userProfile, profileForm, clinicForm]);


  const onProfileSubmit = (data: UserProfileFormValues) => {
    console.log("Profile update:", data);
    alert("Profile updated successfully (Medicall placeholder)!");
  };

  const onClinicSubmit = (data: ClinicDetailsFormValues) => {
    console.log("Clinic details update:", data);
    alert("Clinic details updated successfully (Medicall placeholder)!");
  };

  if (authLoading || !userProfile) { 
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Profile & Clinic Details</h1>
        <p className="text-muted-foreground">Manage your personal and clinic information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><UserCircle className="h-6 w-6 text-primary" /> Your Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-6">
              <Image
                src={userProfile.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16e"}
                alt={userProfile.displayName || "Doctor"}
                width={150}
                height={150}
                className="rounded-full border-4 border-primary shadow-md mb-4 object-cover"
                data-ai-hint="doctor portrait"
              />
            </div>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <FormField
                  control={profileForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl><Input placeholder="Dr. John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" placeholder="name@example.com" {...field} readOnly /></FormControl>
                      <FormMessage />
                       <FormDescription>Email cannot be changed here.</FormDescription>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  {profileForm.formState.isSubmitting ? "Saving..." : "Save Profile Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Building className="h-6 w-6 text-accent" /> Clinic Details</CardTitle>
            <CardDescription>Manage your clinic's information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...clinicForm}>
              <form onSubmit={clinicForm.handleSubmit(onClinicSubmit)} className="space-y-6">
                <FormField
                  control={clinicForm.control}
                  name="clinicName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Name</FormLabel>
                      <FormControl><Input placeholder="My Homeopathy Clinic" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clinicForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Address</FormLabel>
                      <FormControl><Textarea placeholder="123 Main St, Anytown, USA" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clinicForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Phone Number</FormLabel>
                      <FormControl><Input type="tel" placeholder="+12345678900" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clinicForm.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., Pediatric Homeopathy, Chronic Diseases" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={clinicForm.formState.isSubmitting}>
                   {clinicForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  {clinicForm.formState.isSubmitting ? "Saving..." : "Save Clinic Details"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
