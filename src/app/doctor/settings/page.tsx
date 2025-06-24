
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Palette, ShieldCheck, Moon, Sun, Monitor, Loader2 } from "lucide-react";
import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DoctorSettingsPage() {
  const { loading: authLoading } = useAuth();
  const { theme, setTheme, notificationPrefs, setNotificationPrefs } = useSettings();

  if (authLoading) { 
    return (
        <div className="flex h-full w-full items-center justify-center">
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
            <CardDescription>Manage your on-site notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="appointment-reminders" className="font-medium">
                Appointment Reminders
              </Label>
              <Switch
                id="appointment-reminders"
                checked={notificationPrefs.appointmentReminders}
                onCheckedChange={(checked) => setNotificationPrefs({ appointmentReminders: checked })}
                aria-label="Toggle appointment reminders"
              />
            </div>
            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="patient-messages" className="font-medium">
                New Chat Alerts
              </Label>
              <Switch
                id="patient-messages"
                checked={notificationPrefs.chatAlerts}
                onCheckedChange={(checked) => setNotificationPrefs({ chatAlerts: checked })}
                aria-label="Toggle new chat message alerts"
              />
            </div>
             <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="low-stock" className="font-medium">
                Low Stock Alerts
              </Label>
              <Switch
                id="low-stock"
                checked={notificationPrefs.lowStockAlerts}
                onCheckedChange={(checked) => setNotificationPrefs({ lowStockAlerts: checked })}
                aria-label="Toggle low stock alerts"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Palette className="text-accent"/> Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border">
              <Label htmlFor="theme-selector" className="font-medium">
                Theme
              </Label>
               <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-4 w-4"/> Light</div></SelectItem>
                    <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-4 w-4"/> Dark</div></SelectItem>
                    <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="h-4 w-4"/> System</div></SelectItem>
                </SelectContent>
                </Select>
            </div>
            <p className="text-sm text-muted-foreground p-2">Your preferences are saved in this browser.</p>
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
