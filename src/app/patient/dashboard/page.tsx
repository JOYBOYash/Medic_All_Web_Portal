
"use client"; // Ensure this is a client component

import React, { useEffect, useState } from "react"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Pill, MessageSquareHeart, FileText, User, Loader2 } from "lucide-react"; 
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

export default function PatientDashboardPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);

  // Mock data - replace with actual data fetching later
  const upcomingAppointment = {
    doctorName: "Dr. Eva Green",
    specialty: "General Homeopathy",
    date: "Tomorrow, 10:00 AM",
    clinicName: "GreenLeaf Clinic",
  };

  const currentMedications = [
    { name: "Arnica Montana 30C", dosage: "5 pills, 3 times a day", nextRefill: "In 5 days" },
    { name: "Nux Vomica 200CH", dosage: "3 pills, after dinner", nextRefill: "In 12 days" },
  ];

  const quickAccessActions = [
    { label: "View Past Appointments", href: "/patient/appointments?filter=past", icon: <FileText /> },
    { label: "Chat with Doctor", href: "/patient/chat", icon: <MessageSquareHeart /> },
    { label: "Update Profile", href: "/patient/profile", icon: <User /> }, 
    { label: "View Clinic Info", href: "/patient/clinic-info", icon: <CalendarDays /> }, 
  ];

  useEffect(() => {
    // This effect manages loading state for this specific page.
    // It waits for the main AuthContext to finish its loading.
    if (authLoading) {
      setDataLoading(true); // Keep this page's content loader active
      return; // Wait until auth is resolved
    }

    // Auth is resolved, now we can 'load' this page's content.
    setDataLoading(true); // Start local loading for mock data
    setTimeout(() => {
      setDataLoading(false); // Finish local loading
      setPageLoading(false); // Turn off the global loader overlay
    }, 200); // A small delay to simulate content loading

  }, [authLoading, setPageLoading]);

  if (authLoading) {
    return null; // DashboardShell handles the primary loader while auth is resolving.
  }
  
  if (dataLoading) {
    // This is the local loader for the page content area
    return (
       <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,4rem)-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Patient Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userProfile?.displayName || "Patient"}!</p>
        </div>
        <Link href="/patient/appointments#schedule-new"> {/* This might need to point to a proper scheduling page/modal */}
            <Button>
                <CalendarDays className="mr-2 h-4 w-4" /> Request New Appointment
            </Button>
        </Link>
      </div>

      {upcomingAppointment && (
        <Card className="shadow-md bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline text-primary">Upcoming Appointment</CardTitle>
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <CardDescription>Your next consultation is scheduled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold">With {upcomingAppointment.doctorName} ({upcomingAppointment.specialty})</p>
            <p className="text-muted-foreground">{upcomingAppointment.date} at {upcomingAppointment.clinicName}</p>
            <div className="flex gap-2 pt-2">
              <Link href="/patient/appointments">
                  <Button variant="default" size="sm">View Details</Button>
              </Link>
              <Button variant="outline" size="sm">Reschedule</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline">Current Medications</CardTitle>
              <Pill className="h-6 w-6 text-accent" />
            </div>
            <CardDescription>Your active prescriptions and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentMedications.length > 0 ? (
              currentMedications.map((med) => (
                <div key={med.name} className="p-3 border rounded-lg bg-secondary/30">
                  <p className="font-semibold">{med.name}</p>
                  <p className="text-sm text-muted-foreground">{med.dosage}</p>
                  <p className="text-xs text-accent">Next refill: {med.nextRefill}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No active medications.</p>
            )}
            <Link href="/patient/medications">
              <Button variant="link" className="p-0 h-auto text-primary mt-2">View all medications & reminders</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline">Quick Access</CardTitle>
            <CardDescription>Navigate to important sections easily.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickAccessActions.map((action) => (
               <Link href={action.href} key={action.label}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  {action.icon && React.cloneElement(action.icon, {className: "h-4 w-4"})}
                  {action.label}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Health Insights</CardTitle>
          <CardDescription>Personalized tips and information (Coming Soon).</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
           <Image src="https://placehold.co/300x200.png" alt="Health Chart" data-ai-hint="health chart" width={300} height={200} className="mx-auto rounded-lg shadow-sm"/>
           <p className="mt-4 text-muted-foreground">Track your well-being and get personalized advice.</p>
        </CardContent>
      </Card>
    </div>
  );
}
