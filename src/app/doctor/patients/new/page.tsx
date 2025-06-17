
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { PATIENTS_COLLECTION, USERS_COLLECTION, addDoc, collection, serverTimestamp, db, query, where, getDocs } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect } from "react"; 
import type { UserProfile } from "@/types/homeoconnect";

const patientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), // Optional, but if provided must be valid email
  age: z.coerce.number().min(0, { message: "Age must be a positive number." }).max(120),
  sex: z.enum(["male", "female", "other"], { required_error: "Sex is required." }),
  complications: z.string().min(5, { message: "Please describe complications (min 5 characters)." }),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function NewPatientPage() {
  const router = useRouter();
  const { user, loading: authLoading, userProfile, setPageLoading } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      age: "" as unknown as number,
      sex: undefined,
      complications: "",
    },
  });

  useEffect(() => {
    setPageLoading(false);
  }, [setPageLoading]);


  const onSubmit = async (data: PatientFormValues) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
      toast({ variant: "destructive", title: "Error", description: "You are not authorized or database is not available." });
      return;
    }
    
    let authUid: string | null = null;
    let foundPatientProfile: UserProfile | null = null;

    if (data.email) {
      try {
        const patientUserQuery = query(
          collection(db, USERS_COLLECTION),
          where("email", "==", data.email),
          where("role", "==", "patient")
        );
        const querySnapshot = await getDocs(patientUserQuery);
        if (!querySnapshot.empty) {
          foundPatientProfile = querySnapshot.docs[0].data() as UserProfile;
          authUid = querySnapshot.docs[0].id; // This is the Firebase Auth UID
          toast({
            title: "Patient Account Found",
            description: `Existing patient account for ${foundPatientProfile.displayName} (${data.email}) will be linked.`,
          });
        } else {
           toast({
            title: "No Existing Patient Account",
            description: `No existing Medicall patient account found for ${data.email}. A new clinic record will be created. The patient can sign up later with this email to link their account.`,
            duration: 7000,
          });
        }
      } catch (error) {
        console.error("Error searching for patient user account:", error);
        toast({ variant: "destructive", title: "Search Error", description: "Could not verify patient email. Proceeding without linking." });
      }
    }

    try {
      const newPatientData = {
        ...data,
        doctorId: user.uid, 
        authUid: authUid, 
        email: data.email || null, // Save email even if no account linked
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, PATIENTS_COLLECTION), newPatientData);
      toast({ title: "Success", description: `Patient "${data.name}" created successfully.` });
      router.push("/doctor/patients");
    } catch (error) {
      console.error("Error creating patient:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create patient. Please try again." });
    }
  };

  if (authLoading) {
    return null; 
  }


  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/doctor/patients">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Add New Patient</h1>
          <p className="text-muted-foreground">Enter the details for the new patient.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Patient Information</CardTitle>
          <CardDescription>Please fill in all required fields accurately. Providing an email can link to an existing patient's Medicall account.</CardDescription>
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
               <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient's Email Address (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="patient@example.com" {...field} />
                    </FormControl>
                    <FormDescription>If the patient has a Medicall account, using their registered email will link it.</FormDescription>
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
                        <Input type="number" placeholder="e.g., 35" {...field} value={field.value === undefined || field.value === null ? '' : String(field.value)} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Link href="/doctor/patients">
                  <Button type="button" variant="outline" disabled={form.formState.isSubmitting}>Cancel</Button>
                </Link>
                <Button type="submit" disabled={form.formState.isSubmitting || authLoading}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {form.formState.isSubmitting ? "Saving..." : "Save Patient"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

