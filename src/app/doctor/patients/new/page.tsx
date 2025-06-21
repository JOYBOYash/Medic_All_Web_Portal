
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2, UserSearch, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { PATIENTS_COLLECTION, USERS_COLLECTION, addDoc, collection, serverTimestamp, db, query, where, getDocs } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/types/homeoconnect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const patientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  age: z.coerce.number().min(0, { message: "Age must be a positive number." }).max(120),
  sex: z.enum(["male", "female", "other"], { required_error: "Sex is required." }),
  complications: z.string().min(5, { message: "Please describe complications (min 5 characters)." }),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

type SearchStatus = 'idle' | 'searching' | 'found' | 'not_found' | 'already_exists' | 'error';

export default function NewPatientPage() {
  const router = useRouter();
  const { user, userProfile, setPageLoading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'search' | 'details'>('search');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [foundPatientProfile, setFoundPatientProfile] = useState<UserProfile | null>(null);
  
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
  }, [setPageLoading, step]);

  const handleSearch = async () => {
    if (!searchEmail.trim() || !user) return;
    setSearchStatus('searching');
    setFoundPatientProfile(null);

    try {
      const patientUserQuery = query(
        collection(db, USERS_COLLECTION),
        where("email", "==", searchEmail.toLowerCase()),
        where("role", "==", "patient")
      );
      const userSnapshot = await getDocs(patientUserQuery);

      if (userSnapshot.empty) {
        setSearchStatus('not_found');
        form.reset({ name: '', email: searchEmail, age: '' as any, sex: undefined, complications: '' });
        setStep('details');
        return;
      }

      const foundProfile = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as UserProfile;
      setFoundPatientProfile(foundProfile);

      const patientRecordQuery = query(
        collection(db, PATIENTS_COLLECTION),
        where("authUid", "==", foundProfile.id),
        where("doctorId", "==", user.uid)
      );
      const patientRecordSnapshot = await getDocs(patientRecordQuery);

      if (!patientRecordSnapshot.empty) {
        setSearchStatus('already_exists');
        // Do not proceed to details step
        return;
      }

      setSearchStatus('found');
      form.reset({
        name: foundProfile.displayName || '',
        email: foundProfile.email || searchEmail,
        age: '' as any,
        sex: undefined,
        complications: '',
      });
      setStep('details');

    } catch (error) {
      console.error("Error searching for patient:", error);
      setSearchStatus('error');
    }
  };

  const onSubmit = async (data: PatientFormValues) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
      toast({ variant: "destructive", title: "Error", description: "You are not authorized or database is not available." });
      return;
    }
    
    try {
      const newPatientData = {
        ...data,
        doctorId: user.uid, 
        authUid: foundPatientProfile?.id || null, // Use the found profile's UID
        email: data.email, 
        status: 'active',
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

  const renderSearchAlert = () => {
    switch (searchStatus) {
      case 'searching':
        return <Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertDescription>Searching for patient...</AlertDescription></Alert>;
      case 'already_exists':
        return <Alert variant="destructive"><AlertTitle>Patient Already Exists</AlertTitle><AlertDescription>This patient is already registered in your clinic.</AlertDescription></Alert>;
      case 'error':
         return <Alert variant="destructive"><AlertTitle>Search Error</AlertTitle><AlertDescription>An error occurred. Please try again.</AlertDescription></Alert>;
      default:
        return null;
    }
  }

  const renderDetailsAlert = () => {
      if (searchStatus === 'found' && foundPatientProfile) {
          return <Alert variant="default" className="bg-green-50 border-green-200"><UserPlus className="h-4 w-4 text-green-700"/><AlertTitle className="text-green-800">Patient Account Found</AlertTitle><AlertDescription className="text-green-700">Account for **{foundPatientProfile.displayName}** found and will be linked. Please complete the clinical details below.</AlertDescription></Alert>
      }
      if (searchStatus === 'not_found') {
          return <Alert variant="default" className="bg-blue-50 border-blue-200"><UserPlus className="h-4 w-4 text-blue-700"/><AlertTitle className="text-blue-800">No Patient Account Found</AlertTitle><AlertDescription className="text-blue-700">Please fill out the details manually. If the patient creates an account later with this email, it can be linked.</AlertDescription></Alert>
      }
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
          <p className="text-muted-foreground">
            {step === 'search' ? "Search for a patient by their email address." : "Fill in the patient's clinical details."}
          </p>
        </div>
      </div>

      {step === 'search' ? (
        <Card className="shadow-lg max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Search for Patient</CardTitle>
            <CardDescription>Enter the patient's email to see if they have a Medicall account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                type="email"
                placeholder="patient@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchStatus === 'searching' || !searchEmail.trim()}>
                <UserSearch className="mr-2 h-4 w-4" />
                {searchStatus === 'searching' ? "Searching..." : "Search"}
              </Button>
            </div>
            <div className="pt-2">
              {renderSearchAlert()}
            </div>
            <p className="text-center text-sm text-muted-foreground pt-4">Or</p>
            <Button variant="secondary" className="w-full" onClick={() => {
                setSearchStatus('not_found');
                form.reset({ name: '', email: '', age: '' as any, sex: undefined, complications: '' });
                setStep('details');
            }}>
              <UserPlus className="mr-2 h-4 w-4"/>
              Add Patient Manually Without Searching
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Patient Information</CardTitle>
            <CardDescription>Please fill in all required fields accurately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="mb-4">
                {renderDetailsAlert()}
            </div>
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
                      <FormLabel>Patient's Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="patient@example.com" {...field} disabled={searchStatus === 'found'} />
                      </FormControl>
                      <FormDescription>This email will be used to link the patient's account.</FormDescription>
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
                  <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={() => setStep('search')}>Back to Search</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {form.formState.isSubmitting ? "Saving..." : "Save Patient"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
