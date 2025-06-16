
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { format as formatDateFn } from "date-fns";
import { ArrowLeft, CalendarIcon, PlusCircle, Save, Trash2, Clock, Users, Loader2 } from "lucide-react";
import { Appointment, Patient, Medicine, PainSeverity, painSeverityOptions, commonSymptomsOptions } from "@/types/homeoconnect"; // Removed PrescribedMedicine as it's part of Appointment
import { useAuth } from "@/context/AuthContext";
import { db, APPOINTMENTS_COLLECTION, PATIENTS_COLLECTION, MEDICINES_COLLECTION, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";


const prescriptionSchema = z.object({
  medicineId: z.string().min(1, "Medicine is required."), 
  medicineName: z.string(), 
  quantity: z.string().min(1, "Quantity is required."),
  repetition: z.object({
    morning: z.boolean().default(false),
    afternoon: z.boolean().default(false),
    evening: z.boolean().default(false),
  }).refine(data => data.morning || data.afternoon || data.evening, {
    message: "At least one repetition time must be selected.",
    path: ["morning"], 
  }),
  instructions: z.string().optional(),
});

const appointmentFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required."), 
  appointmentDate: z.date({ required_error: "Appointment date is required." }),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  patientRemarks: z.string().optional(),
  doctorNotes: z.string().optional(),
  painSeverity: z.enum(["none", "mild", "moderate", "severe", "excruciating"]).optional(),
  symptoms: z.array(z.string()).optional(), 
  prescriptions: z.array(prescriptionSchema).optional(),
  nextAppointmentDate: z.date().optional(),
  // doctorId is not in form, added programmatically
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);


  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: preselectedPatientId || "",
      appointmentDate: undefined,
      appointmentTime: "",
      patientRemarks: "",
      doctorNotes: "",
      symptoms: [],
      prescriptions: [],
      nextAppointmentDate: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "prescriptions",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !db || userProfile?.role !== 'doctor') {
        setDataLoading(false);
        return;
      }
      setDataLoading(true);
      try {
        const patientsQuery = query(collection(db, PATIENTS_COLLECTION), where("doctorId", "==", user.uid));
        const patientsSnapshot = await getDocs(patientsQuery);
        const fetchedPatients = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        setPatients(fetchedPatients);

        const medicinesQuery = query(collection(db, MEDICINES_COLLECTION), where("doctorId", "==", user.uid));
        const medicinesSnapshot = await getDocs(medicinesQuery);
        const fetchedMedicines = medicinesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
        setMedicines(fetchedMedicines);

      } catch (error) {
        console.error("Error fetching data for new appointment: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load patient or medicine data." });
      }
      setDataLoading(false);
    };
    if (!authLoading && user && userProfile?.role === 'doctor') {
      fetchData();
    } else if (!authLoading && !user) {
      setDataLoading(false);
    }
  }, [user, userProfile, authLoading, toast]);
  
  useEffect(() => {
    const selectedDate = form.watch("appointmentDate");
    if (selectedDate) {
      const dayOfWeek = selectedDate.getDay(); 
      if (dayOfWeek === 0 || dayOfWeek === 6) { 
        setAvailableTimeSlots(["10:00", "11:00", "12:00"]);
      } else { 
        setAvailableTimeSlots(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"]);
      }
      form.setValue("appointmentTime", ""); 
    } else {
      setAvailableTimeSlots([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("appointmentDate")]); // form is stable, watch is the dependency


  const onSubmit = async (data: AppointmentFormValues) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
        toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized to schedule appointments." });
        return;
    }
    setIsSubmittingForm(true);

    const appointmentDateTime = new Date(data.appointmentDate);
    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0); // Set seconds and ms to 0

    // Omit id, createdAt, updatedAt for new document
    const finalData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
      patientId: data.patientId,
      doctorId: user.uid, // Add doctorId
      appointmentDate: Timestamp.fromDate(appointmentDateTime),
      patientRemarks: data.patientRemarks,
      doctorNotes: data.doctorNotes,
      painSeverity: data.painSeverity as PainSeverity | undefined, // Cast for safety
      symptoms: data.symptoms,
      prescriptions: data.prescriptions?.map(p => ({
        ...p,
      })) || [],
      nextAppointmentDate: data.nextAppointmentDate ? Timestamp.fromDate(data.nextAppointmentDate) : undefined,
      status: "scheduled",
    };

    try {
        await addDoc(collection(db, APPOINTMENTS_COLLECTION), {
            ...finalData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        toast({ title: "Success", description: "New appointment scheduled successfully." });
        router.push(preselectedPatientId ? `/doctor/patients/${preselectedPatientId}` : "/doctor/appointments");
    } catch (error) {
        console.error("Error scheduling appointment:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to schedule appointment. Please try again." });
    }
    setIsSubmittingForm(false);
  };

  if (authLoading || dataLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  // Role/auth checks are primarily handled by DashboardShell/AuthContext
  // if (!user || userProfile?.role !== 'doctor') {
  //    // router.push('/login'); // Avoid direct push in render phase
  //    return null;
  // }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={preselectedPatientId ? `/doctor/patients/${preselectedPatientId}` : "/doctor/appointments"}>
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Schedule New Appointment</h1>
          <p className="text-muted-foreground">Fill in the details to create a new consultation.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Users className="text-primary"/>Patient & Date</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!preselectedPatientId || patients.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder={patients.length === 0 ? "No patients found" : "Select patient"} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {patients.length > 0 ? 
                            patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Age: {p.age})</SelectItem>) :
                            <SelectItem value="" disabled>No patients available for this doctor</SelectItem>
                          }
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Appointment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? formatDateFn(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appointmentTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch("appointmentDate") || availableTimeSlots.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {availableTimeSlots.length > 0 ? 
                            availableTimeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>) :
                            <SelectItem value="" disabled>No slots available or select date first</SelectItem>
                          }
                        </SelectContent>
                      </Select>
                       <FormDescription className="text-xs">Available slots shown for selected date.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Clock className="text-accent"/>Consultation Details</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="patientRemarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Remarks (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Any specific notes from/about the patient for this appointment..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="painSeverity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pain Severity (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select pain severity" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {painSeverityOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                    <FormLabel>Common Symptoms (Optional)</FormLabel>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border rounded-md">
                    {commonSymptomsOptions.map((symptom) => (
                        <FormField
                        key={symptom.value}
                        control={form.control}
                        name="symptoms"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                checked={field.value?.includes(symptom.value)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? field.onChange([...(field.value || []), symptom.value])
                                    : field.onChange(
                                        (field.value || []).filter(
                                        (value) => value !== symptom.value
                                        )
                                    );
                                }}
                                />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">{symptom.label}</FormLabel>
                            </FormItem>
                        )}
                        />
                    ))}
                    </div>
                    <FormMessage>{form.formState.errors.symptoms?.message}</FormMessage>
                </FormItem>
              </CardContent>
            </Card>
          </div>
          
          <Card className="shadow-lg">
            <CardHeader><CardTitle className="font-headline">Prescriptions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {fields.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-md space-y-4 relative">
                   <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                  </Button>
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.medicineId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicine</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const selectedMed = medicines.find(m => m.id === value);
                            field.onChange(value); 
                            form.setValue(`prescriptions.${index}.medicineName`, selectedMed?.name || "");
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder={medicines.length === 0 ? "No medicines found" : "Select medicine"} /></SelectTrigger></FormControl>
                          <SelectContent>
                            {medicines.map(med => <SelectItem key={med.id} value={med.id}>{med.name} ({med.description || 'No description'})</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity/Dosage</FormLabel>
                        <FormControl><Input placeholder="e.g., 5 pills, 1 teaspoon" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Repetition</FormLabel>
                    <div className="flex items-center space-x-4">
                      {['morning', 'afternoon', 'evening'].map(time => (
                        <FormField
                          key={time}
                          control={form.control}
                          name={`prescriptions.${index}.repetition.${time as 'morning' | 'afternoon' | 'evening'}`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal capitalize">{time}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                     <FormMessage>{(form.formState.errors.prescriptions?.[index]?.repetition as any)?.message}</FormMessage>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.instructions`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructions (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., with food, before sleep" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => append({ medicineId: "", medicineName: "", quantity: "", repetition: { morning: false, afternoon: false, evening: false }, instructions: "" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Prescription
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
             <CardHeader><CardTitle className="font-headline">Follow-up & Notes</CardTitle></CardHeader>
             <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="doctorNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor's Private Notes (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Internal notes for this consultation..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="nextAppointmentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Next Follow-up Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? formatDateFn(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
          </Card>

          <div className="flex justify-end space-x-4 pt-4">
            <Link href={preselectedPatientId ? `/doctor/patients/${preselectedPatientId}` : "/doctor/appointments"}>
              <Button type="button" variant="outline" disabled={isSubmittingForm}>Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmittingForm || authLoading || dataLoading || !patients.length}>
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSubmittingForm ? "Saving..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
