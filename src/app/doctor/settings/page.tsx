
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Palette, ShieldCheck, Moon, Sun, Monitor, Loader2, Save } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"]
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const { changeUserPassword } = useAuth();
  const { toast } = useToast();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  });
  
  const onSubmit = async (data: PasswordFormValues) => {
    const result = await changeUserPassword(data.currentPassword, data.newPassword);
    if(result.success) {
      toast({ title: "Success", description: "Your password has been changed." });
      form.reset();
      setOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error || "Failed to change password."});
      form.setError("currentPassword", { message: result.error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Change Password</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            Enter your current password and a new password below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={form.formState.isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

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
            <ChangePasswordDialog />
            <Button variant="outline" className="w-full" disabled>Two-Factor Authentication</Button>
            <Button variant="destructive" className="w-full" disabled>Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
