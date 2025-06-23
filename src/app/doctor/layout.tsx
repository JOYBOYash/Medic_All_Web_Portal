
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { LayoutDashboard, Users, Pill, Stethoscope, Settings, UserCircle, MessageSquareHeart } from "lucide-react";

const doctorNavItems: NavItem[] = [
  { title: "Dashboard", href: "/doctor/dashboard", icon: <LayoutDashboard /> },
  { title: "Patients", href: "/doctor/patients", icon: <Users /> },
  { title: "Appointments", href: "/doctor/appointments", icon: <Stethoscope /> },
  { title: "Chat", href: "/doctor/chat", icon: <MessageSquareHeart /> },
  { title: "Medicines", href: "/doctor/medicines", icon: <Pill /> },
  { title: "Clinic Settings", href: "/doctor/settings", icon: <Settings /> },
  { title: "Profile", href: "/doctor/profile", icon: <UserCircle /> },
];

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Here you would typically fetch the pageTitle dynamically or pass it from page components
  // For simplicity, we are not passing pageTitle from here.
  // Individual pages can set their own titles via <Head> or a context.
  return (
    <DashboardShell navItems={doctorNavItems} userRole="doctor">
      {children}
    </DashboardShell>
  );
}
