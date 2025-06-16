
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// Removed unused Patient import, will use PatientFormValues for form data
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { PATIENTS_COLLECTION, addDoc, collection, serverTimestamp, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const patientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce.number().min(0, { message: "Age must be a positive number." }).max(120),
  sex: z.enum(["male", "female", "other"], { required_error: "Sex is required." }),
  complications: z.string().min(5, { message: "Please describe complications (min 5 characters)." }),
  // authUid is intentionally NOT part of this form, as it's linked later
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function NewPatientPage() {
  const router = useRouter();
  const { user, loading: authLoading, userProfile } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      age: undefined, 
      sex: undefined,
      complications: "",
    },
  });

  const onSubmit = async (data: PatientFormValues) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
      toast({ variant: "destructive", title: "Error", description: "You are not authorized or database is not available." });
      return;
    }

    try {
      const newPatientData = {
        ...data,
        doctorId: user.uid, 
        authUid: null, // Explicitly set to null or leave undefined; doctor doesn't set this on creation
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), newPatientData);
      toast({ title: "Success", description: `Patient "${data.name}" created successfully.` });
      router.push("/doctor/patients");
    } catch (error) {
      console.error("Error creating patient:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create patient. Please try again." });
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  // This check should be handled by DashboardShell or AuthContext redirects for unauthorized roles
  // if (!user || userProfile?.role !== 'doctor') {
  //    router.push('/login'); 
  //    return <div className="flex justify-center items-center h-full"><p>Unauthorized</p></div>;
  // }


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
          <CardDescription>Please fill in all required fields accurately.</CardDescription>
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
                        <Input type="number" placeholder="e.g., 35" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))}/>
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
                  <Button type="button" variant="outline">Cancel</Button>
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
