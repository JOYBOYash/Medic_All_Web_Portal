import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { LayoutDashboard, CalendarDays, Pill, MessageSquareHeart, UserCircle, Settings } from "lucide-react";

const patientNavItems: NavItem[] = [
  { title: "Dashboard", href: "/patient/dashboard", icon: <LayoutDashboard /> },
  { title: "My Appointments", href: "/patient/appointments", icon: <CalendarDays /> },
  { title: "My Medications", href: "/patient/medications", icon: <Pill /> },
  { title: "Chat with Doctor", href: "/patient/chat", icon: <MessageSquareHeart /> },
  { title: "Profile", href: "/patient/profile", icon: <UserCircle /> },
  { title: "Settings", href: "/patient/settings", icon: <Settings /> },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell navItems={patientNavItems} userRole="patient">
      {children}
    </DashboardShell>
  );
}
