
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Appointment, Patient, Medicine, PainSeverity, painSeverityOptions, commonSymptomsOptions } from "@/types/homeoconnect";
import { useAuth } from "@/context/AuthContext";
import { db, APPOINTMENTS_COLLECTION, PATIENTS_COLLECTION, MEDICINES_COLLECTION, collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "@/lib/firebase";
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
  status: z.enum(["scheduled", "completed", "cancelled"]),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function EditAppointmentPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      appointmentDate: undefined,
      appointmentTime: "",
      patientRemarks: "",
      doctorNotes: "",
      symptoms: [],
      prescriptions: [],
      nextAppointmentDate: undefined,
      status: "scheduled",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "prescriptions",
  });

  const fetchAppointmentData = useCallback(async () => {
    if (!user || !db || !appointmentId || userProfile?.role !== 'doctor') return;
    setPageLoading(true);

    try {
      // Fetch Patients and Medicines
      const patientsQuery = query(collection(db, PATIENTS_COLLECTION), where("doctorId", "==", user.uid));
      const patientsSnapshot = await getDocs(patientsQuery);
      setPatients(patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));

      const medicinesQuery = query(collection(db, MEDICINES_COLLECTION), where("doctorId", "==", user.uid));
      const medicinesSnapshot = await getDocs(medicinesQuery);
      setMedicines(medicinesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
      
      // Fetch the specific appointment
      const appointmentDocRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
      const appointmentDocSnap = await getDoc(appointmentDocRef);

      if (appointmentDocSnap.exists() && appointmentDocSnap.data().doctorId === user.uid) {
        const aptData = appointmentDocSnap.data() as Appointment;
        setAppointment(aptData);
        
        const appointmentDate = (aptData.appointmentDate as unknown as Timestamp).toDate();

        // Populate form with fetched data
        form.reset({
          patientId: aptData.patientId,
          appointmentDate: appointmentDate,
          appointmentTime: formatDateFn(appointmentDate, "HH:mm"),
          patientRemarks: aptData.patientRemarks || "",
          doctorNotes: aptData.doctorNotes || "",
          painSeverity: aptData.painSeverity,
          symptoms: aptData.symptoms || [],
          prescriptions: aptData.prescriptions || [],
          nextAppointmentDate: aptData.nextAppointmentDate ? (aptData.nextAppointmentDate as unknown as Timestamp).toDate() : undefined,
          status: aptData.status,
        });

      } else {
        toast({ variant: "destructive", title: "Error", description: "Appointment not found or access denied." });
        router.push("/doctor/appointments");
      }

    } catch (error) {
      console.error("Error fetching appointment data: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load appointment data." });
    } finally {
      setPageLoading(false);
    }
  }, [user, userProfile, appointmentId, router, toast, form, setPageLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAppointmentData();
    } else if (!authLoading) {
      setPageLoading(false);
    }
  }, [user, authLoading, fetchAppointmentData, setPageLoading]);

  useEffect(() => {
    const selectedDate = form.watch("appointmentDate");
    if (selectedDate) {
      const dayOfWeek = selectedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        setAvailableTimeSlots(["10:00", "11:00", "12:00"]);
      } else { // Weekdays
        setAvailableTimeSlots(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"]);
      }
      // Don't reset time on initial load
    } else {
      setAvailableTimeSlots([]);
    }
  }, [form.watch("appointmentDate")]);


  const onSubmit = async (data: AppointmentFormValues) => {
    if (!user || !db || !appointmentId) {
        toast({ variant: "destructive", title: "Error", description: "Cannot update appointment." });
        return;
    }
    setIsSubmittingForm(true);
    setPageLoading(true);

    const appointmentDateTime = new Date(data.appointmentDate);
    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const finalData: Partial<Appointment> = {
      patientId: data.patientId,
      appointmentDate: Timestamp.fromDate(appointmentDateTime),
      patientRemarks: data.patientRemarks,
      doctorNotes: data.doctorNotes,
      painSeverity: data.painSeverity as PainSeverity | undefined,
      symptoms: data.symptoms,
      prescriptions: data.prescriptions?.map(p => ({ ...p })) || [],
      nextAppointmentDate: data.nextAppointmentDate ? Timestamp.fromDate(data.nextAppointmentDate) : undefined,
      status: data.status,
      updatedAt: serverTimestamp(),
    };

    try {
        const appointmentDocRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
        await updateDoc(appointmentDocRef, finalData);
        toast({ title: "Success", description: "Appointment updated successfully." });
        router.push(appointment?.patientId ? `/doctor/patients/${appointment.patientId}` : "/doctor/appointments");
    } catch (error) {
        console.error("Error updating appointment:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update appointment." });
    } finally {
        setIsSubmittingForm(false);
        setPageLoading(false);
    }
  };

  if (authLoading || !appointment) {
    return null; // Show loader via context
  }

  const patient = patients.find(p => p.id === appointment.patientId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={appointment?.patientId ? `/doctor/patients/${appointment.patientId}` : "/doctor/appointments"}>
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Edit Appointment</h1>
          <p className="text-muted-foreground">Editing appointment for {patient?.name || '...'}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline">Appointment Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </CardContent>
            </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Users className="text-primary"/>Patient & Date</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Input value={patient?.name || 'Loading...'} disabled />
                </FormItem>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch("appointmentDate")}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {availableTimeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                      <FormControl><Textarea placeholder="Any specific notes from/about the patient..." {...field} /></FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                          value={field.value}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger></FormControl>
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
              <Button type="button" variant="outline" onClick={() => append({ medicineId: "", medicineName: "", quantity: "", repetition: { morning: false, afternoon: false, evening: false }, instructions: "" })}>
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
            <Link href={appointment?.patientId ? `/doctor/patients/${appointment.patientId}` : "/doctor/appointments"}>
              <Button type="button" variant="outline" disabled={isSubmittingForm}>Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmittingForm || authLoading}>
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSubmittingForm ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
