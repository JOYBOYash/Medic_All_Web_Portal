
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, CalendarClock, Pill, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, PATIENTS_COLLECTION, APPOINTMENTS_COLLECTION, MEDICINES_COLLECTION, collection, query, where, getDocs, orderBy, limit, Timestamp } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DashboardStats {
  totalPatients: number;
  upcomingAppointments: number;
  appointmentsToday: number;
  totalMedicines: number;
}

interface RecentPatientActivityItem {
  id: string;
  name: string;
  activity: string;
  img: string;
  createdAt?: Date; 
}

export default function DoctorDashboardPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentPatients, setRecentPatients] = useState<RecentPatientActivityItem[]>([]);
  
  const fetchDashboardData = useCallback(async () => {
    if (!user || !db || userProfile?.role !== 'doctor') return;

    setPageLoading(true); 
    try {
      // Fetch total patients
      const patientsQuery = query(collection(db, PATIENTS_COLLECTION), where("doctorId", "==", user.uid));
      const patientsSnapshot = await getDocs(patientsQuery);
      const totalPatients = patientsSnapshot.size;

      // Fetch upcoming appointments
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));

      const upcomingAppointmentsQuery = query(
        collection(db, APPOINTMENTS_COLLECTION),
        where("doctorId", "==", user.uid),
        where("status", "==", "scheduled"),
        where("appointmentDate", ">=", Timestamp.fromDate(startOfToday))
      );
      const upcomingAppointmentsSnapshot = await getDocs(upcomingAppointmentsQuery);
      const upcomingAppointmentsCount = upcomingAppointmentsSnapshot.size;

      let appointmentsTodayCount = 0;
      const endOfTodayForCompare = new Date(new Date().setHours(23, 59, 59, 999));

      upcomingAppointmentsSnapshot.docs.forEach(doc => {
        const aptDate = (doc.data().appointmentDate as Timestamp).toDate();
        if (aptDate >= startOfToday && aptDate <= endOfTodayForCompare) {
          appointmentsTodayCount++;
        }
      });

      // Fetch medicines count
      const medicinesQuery = query(collection(db, MEDICINES_COLLECTION), where("doctorId", "==", user.uid));
      const medicinesSnapshot = await getDocs(medicinesQuery);
      const totalMedicines = medicinesSnapshot.size;

      setDashboardStats({
        totalPatients,
        upcomingAppointments: upcomingAppointmentsCount,
        appointmentsToday: appointmentsTodayCount,
        totalMedicines,
      });

      // Fetch recent patients
      const recentPatientsQuery = query(
        collection(db, PATIENTS_COLLECTION),
        where("doctorId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const recentPatientsSnapshot = await getDocs(recentPatientsQuery);
      const fetchedRecentPatients = recentPatientsSnapshot.docs.map(docSnap => {
        const patientData = docSnap.data();
        const createdAtDate = patientData.createdAt?.toDate ? patientData.createdAt.toDate() : new Date();
        return {
          id: docSnap.id,
          name: patientData.name,
          activity: `Registered on ${format(createdAtDate, "PP")}`,
          img: `https://picsum.photos/seed/${docSnap.id}/40/40`,
          createdAt: createdAtDate
        };
      }) as RecentPatientActivityItem[];
      setRecentPatients(fetchedRecentPatients);

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      if (err.code === 'failed-precondition' && err.message?.toLowerCase().includes('query requires an index')) {
        toast({
          variant: "destructive",
          title: "Database Index Required",
          description: "A database index is needed for dashboard queries. Please check the Firebase console to create the required index.",
          duration: 20000 
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not load dashboard data." });
      }
    } finally {
      setPageLoading(false);
    }
  }, [user, userProfile, setPageLoading, toast]);
  
  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    } else if (!authLoading) {
      setPageLoading(false);
    }
  }, [authLoading, user, fetchDashboardData, setPageLoading]);

  const statsToDisplay = useMemo(() => {
    if (!dashboardStats) {
      return [
        { title: "Total Patients", value: <Loader2 className="h-5 w-5 animate-spin" />, icon: <Users className="h-6 w-6 text-primary" /> },
        { title: "Upcoming Appointments", value: <Loader2 className="h-5 w-5 animate-spin" />, icon: <CalendarClock className="h-6 w-6 text-accent" />, trend: "" },
        { title: "Medicines in DB", value: <Loader2 className="h-5 w-5 animate-spin" />, icon: <Pill className="h-6 w-6 text-destructive" /> },
      ];
    }
    return [
      { title: "Total Patients", value: dashboardStats.totalPatients.toString(), icon: <Users className="h-6 w-6 text-primary" /> },
      { title: "Upcoming Appointments", value: dashboardStats.upcomingAppointments.toString(), icon: <CalendarClock className="h-6 w-6 text-accent" />, trend: `${dashboardStats.appointmentsToday} today` },
      { title: "Medicines in DB", value: dashboardStats.totalMedicines.toString(), icon: <Pill className="h-6 w-6 text-destructive" /> },
    ];
  }, [dashboardStats]);


  const quickActions = [
    { label: "Add New Patient", href: "/doctor/patients/new", icon: <PlusCircle /> },
    { label: "Schedule Appointment", href: "/doctor/appointments/new", icon: <CalendarClock /> },
    { label: "Manage Medicines", href: "/doctor/medicines", icon: <Pill /> },
  ];
  
  if (authLoading) {
     return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userProfile?.displayName || "Doctor"}!</p>
        </div>
        <Link href="/doctor/patients/new">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Patient
            </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsToDisplay.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend && <p className="text-xs text-muted-foreground">{stat.trend}</p>}
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
            <CardDescription>Overview of recent patient registrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!dashboardStats && !recentPatients.length ? (
                <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
            ) : recentPatients.length > 0 ? (
              recentPatients.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Image src={item.img} alt={item.name} width={40} height={40} className="rounded-full object-cover"/>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.activity}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent patient registrations.</p>
            )}
             <Link href="/doctor/patients">
                <Button variant="link" className="p-0 h-auto text-primary">View all patients</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
