
import React from "react"; // Added import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, CalendarClock, Pill } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function DoctorDashboardPage() {
  const stats = [
    { title: "Total Patients", value: "120", icon: <Users className="h-6 w-6 text-primary" />, 변화: "+5 this month" },
    { title: "Upcoming Appointments", value: "8", icon: <CalendarClock className="h-6 w-6 text-accent" />, 변화: "2 today" },
    { title: "Medicines in DB", value: "75", icon: <Pill className="h-6 w-6 text-destructive" />, 변화: "+3 new" },
  ];

  const quickActions = [
    { label: "Add New Patient", href: "/doctor/patients/new", icon: <PlusCircle /> },
    { label: "Schedule Appointment", href: "/doctor/appointments/new", icon: <CalendarClock /> },
    { label: "Manage Medicines", href: "/doctor/medicines", icon: <Pill /> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Dr. [DoctorName]!</p>
        </div>
        <Link href="/doctor/patients/new">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Patient
            </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.변화}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline">Quick Actions</CardTitle>
            <CardDescription>Access common tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((action) => (
              <Link href={action.href} key={action.label}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  {action.icon && React.cloneElement(action.icon, {className: "h-4 w-4"})}
                  {action.label}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline">Recent Patient Activity</CardTitle>
            <CardDescription>Overview of recent patient interactions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Placeholder for recent activity list */}
            {[
              { name: "Alice Wonderland", activity: "New appointment scheduled", time: "2h ago", img: "https://placehold.co/40x40.png?text=AW" },
              { name: "Bob The Builder", activity: "Prescription updated", time: "5h ago", img: "https://placehold.co/40x40.png?text=BB" },
              { name: "Charlie Brown", activity: "New patient registered", time: "1d ago", img: "https://placehold.co/40x40.png?text=CB" },
            ].map(item => (
              <div key={item.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <Image src={item.img} alt={item.name} width={40} height={40} className="rounded-full" data-ai-hint="person avatar"/>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.activity} - {item.time}</p>
                </div>
              </div>
            ))}
             <Link href="/doctor/patients">
                <Button variant="link" className="p-0 h-auto text-primary">View all patients</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
