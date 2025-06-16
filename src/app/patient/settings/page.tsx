
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Palette, ShieldCheck, DownloadCloud, Loader2 } from "lucide-react"; // Added Loader2
import React, { useEffect, useState } from "react"; // Added useEffect, useState
import { useAuth } from "@/context/AuthContext"; // Import useAuth

export default function PatientSettingsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth(); // Get setPageLoading
  // Placeholder states for settings
  const [medicationReminders, setMedicationReminders] = React.useState(true);
  const [appointmentAlerts, setAppointmentAlerts] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [dataLoading, setDataLoading] = useState(true); // Local state for this page

  useEffect(() => {
    // This page doesn't fetch data currently
    setPageLoading(true);
    setDataLoading(true);
    setTimeout(() => {
      setDataLoading(false);
      setPageLoading(false);
    }, 200);
  }, [setPageLoading]);

  if (authLoading) {
    return null; // DashboardShell handles the primary loader
  }
   if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,4rem)-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and account settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Bell className="text-primary"/> Notifications</CardTitle>
            <CardDescription>Control how you receive alerts and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="medication-reminders" className="font-medium">
                Medication Reminders
              </Label>
              <Switch
                id="medication-reminders"
                checked={medicationReminders}
                onCheckedChange={setMedicationReminders}
                aria-label="Toggle medication reminders"
              />
            </div>
            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="appointment-alerts" className="font-medium">
                Appointment Alerts
              </Label>
              <Switch
                id="appointment-alerts"
                checked={appointmentAlerts}
                onCheckedChange={setAppointmentAlerts}
                aria-label="Toggle appointment alerts"
              />
            </div>
             <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="chat-notifications" className="font-medium">
                Chat Message Alerts
              </Label>
              <Switch
                id="chat-notifications"
                defaultChecked
                aria-label="Toggle chat message alerts"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Palette className="text-accent"/> Appearance</CardTitle>
            <CardDescription>Customize the app's look.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="dark-mode" className="font-medium">
                Dark Mode
              </Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={(checked) => {
                  setDarkMode(checked);
                  if (checked) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }}
                aria-label="Toggle dark mode"
              />
            </div>
            <p className="text-sm text-muted-foreground p-2">Font size and other display options coming soon.</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><ShieldCheck className="text-destructive"/> Account</CardTitle>
            <CardDescription>Manage your account security and data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2"><ShieldCheck className="h-4 w-4"/>Change Password</Button>
            <Button variant="outline" className="w-full justify-start gap-2"><DownloadCloud className="h-4 w-4"/>Download My Data</Button>
            <Button variant="destructive" className="w-full justify-start gap-2"><ShieldCheck className="h-4 w-4"/>Delete My Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
