
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Palette, ShieldCheck, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";


export default function DoctorSettingsPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false); 
  const [dataLoading, setDataLoading] = useState(true); // Local loader for page content


  useEffect(() => {
    if (authLoading) {
      // Auth context is still loading, page is effectively loading.
      // DashboardShell should handle the global loader via isPageLoading.
      // Ensure local loader is also on.
      setDataLoading(true);
      return; // Wait for authLoading to become false.
    }

    // authLoading is false.
    // This page has minimal setup beyond what AuthContext provides.
    // Turn off local loader and then global loader.
    setDataLoading(false); // Turn off the page's internal content loader.
    setPageLoading(false); // Explicitly turn off the DashboardShell's global loader overlay.

  }, [authLoading, setPageLoading]);

  // This guard is mostly for the initial render if AuthContext is still resolving.
  // DashboardShell also has a similar guard for the global loader.
  if (authLoading) { 
    return null; 
  }
  
  // This local 'dataLoading' controls the visibility of this page's own content loader
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
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Clinic Settings</h1>
        <p className="text-muted-foreground">Configure application settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Bell className="text-primary"/> Notifications</CardTitle>
            <CardDescription>Manage your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="appointment-reminders" className="font-medium">
                Appointment Reminders
              </Label>
              <Switch
                id="appointment-reminders"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                aria-label="Toggle appointment reminders"
              />
            </div>
            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="patient-messages" className="font-medium">
                Patient Messages
              </Label>
              <Switch
                id="patient-messages"
                defaultChecked
                aria-label="Toggle patient message notifications"
              />
            </div>
            <Button className="w-full mt-2">Advanced Notification Settings</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Palette className="text-accent"/> Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
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
            <p className="text-sm text-muted-foreground p-2">Further theme customization options coming soon.</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><ShieldCheck className="text-destructive"/> Account & Security</CardTitle>
            <CardDescription>Manage your account security settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full">Change Password</Button>
            <Button variant="outline" className="w-full">Two-Factor Authentication</Button>
            <Button variant="destructive" className="w-full">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
