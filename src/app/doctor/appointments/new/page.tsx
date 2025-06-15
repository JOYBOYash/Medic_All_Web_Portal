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
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, PlusCircle, Save, Trash2, Clock, Users } from "lucide-react";
import { Appointment, Patient, Medicine, PainSeverity, painSeverityOptions, commonSymptomsOptions, PrescribedMedicine } from "@/types/homeoconnect";

// Mock data
const mockPatients: Patient[] = [
  { id: "pat1", doctorId: "doc1", name: "Alice Wonderland", age: 30, sex: "female", complications: "Anxiety", createdAt: new Date(), updatedAt: new Date() },
  { id: "pat2", doctorId: "doc1", name: "Bob The Builder", age: 45, sex: "male", complications: "Back Pain", createdAt: new Date(), updatedAt: new Date() },
];
const mockMedicines: Medicine[] = [
  { id: "med1", doctorId: "doc1", name: "Arnica Montana", description: "30C", createdAt: new Date(), updatedAt: new Date() },
  { id: "med2", doctorId: "doc1", name: "Nux Vomica", description: "200CH", createdAt: new Date(), updatedAt: new Date() },
];

const prescriptionSchema = z.object({
  medicineId: z.string().min(1, "Medicine is required."),
  quantity: z.string().min(1, "Quantity is required."),
  repetition: z.object({
    morning: z.boolean().default(false),
    afternoon: z.boolean().default(false),
    evening: z.boolean().default(false),
  }).refine(data => data.morning || data.afternoon || data.evening, {
    message: "At least one repetition time must be selected.",
    path: ["morning"], // General path for the group
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
  symptoms: z.array(z.string()).optional(), // Using string array for selected symptom values
  prescriptions: z.array(prescriptionSchema).optional(),
  nextAppointmentDate: z.date().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");

  // In a real app, fetch these from your backend
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [medicines, setMedicines] = useState<Medicine[]>(mockMedicines);
  
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);


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
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "prescriptions",
  });
  
  // Effect to update available time slots when date changes
  useEffect(() => {
    const selectedDate = form.watch("appointmentDate");
    if (selectedDate) {
      // Placeholder: Fetch or calculate available slots for the selected date
      // This is a simplified example. Real slot calculation is complex.
      const dayOfWeek = selectedDate.getDay(); // 0 (Sun) to 6 (Sat)
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        setAvailableTimeSlots(["10:00", "11:00", "12:00"]);
      } else { // Weekday
        setAvailableTimeSlots(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"]);
      }
      form.setValue("appointmentTime", ""); // Reset time when date changes
    } else {
      setAvailableTimeSlots([]);
    }
  }, [form.watch("appointmentDate"), form]);


  const onSubmit = async (data: AppointmentFormValues) => {
    // Combine date and time
    const appointmentDateTime = new Date(data.appointmentDate);
    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes);

    const finalData = {
      ...data,
      appointmentDate: appointmentDateTime,
      // Map medicineId to medicineName for prescriptions if needed before saving
      prescriptions: data.prescriptions?.map(p => ({
        ...p,
        medicineName: medicines.find(m => m.id === p.medicineId)?.name || "Unknown Medicine",
      })),
      status: "scheduled", // Default status
    };
    console.log("New appointment data:", finalData);
    alert("New appointment scheduled (placeholder)!");
    router.push(preselectedPatientId ? `/doctor/patients/${preselectedPatientId}` : "/doctor/appointments");
  };

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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!preselectedPatientId}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Age: {p.age})</SelectItem>)}
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
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                {/* Symptoms could be a multi-select or tag input. For simplicity, using a text area for now or a few checkboxes. */}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {medicines.map(med => <SelectItem key={med.id} value={med.id}>{med.name} ({med.description})</SelectItem>)}
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
              <Button type="button" variant="outline" onClick={() => append({ medicineId: "", quantity: "", repetition: { morning: false, afternoon: false, evening: false }, instructions: "" })}>
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
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {form.formState.isSubmitting ? "Saving..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

