"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Palette, ShieldCheck } from "lucide-react";
import React from "react";

export default function DoctorSettingsPage() {
  // Placeholder states for settings
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false); // This would ideally sync with system/global theme

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
                  // This is a placeholder. Actual dark mode toggling needs to manipulate `<html>` class.
                  // See Shadcn documentation for theme toggling.
                  if (checked) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }}
                aria-label="Toggle dark mode"
              />
            </div>
            {/* More appearance settings can be added here */}
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
