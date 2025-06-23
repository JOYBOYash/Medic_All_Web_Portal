
"use client";

import React, { useState, useEffect } from "react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { LayoutDashboard, Users, Pill, Stethoscope, Settings, UserCircle, MessageSquareHeart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, onSnapshot, CHAT_ROOMS_COLLECTION, ChatRoom } from "@/lib/firebase";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!user || !db || userProfile?.role !== 'doctor') return;

    const q = query(
        collection(db, CHAT_ROOMS_COLLECTION),
        where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let totalUnread = 0;
        querySnapshot.forEach((doc) => {
            const room = doc.data() as ChatRoom;
            totalUnread += room.unreadCounts?.[user.uid] || 0;
        });
        setUnreadChatCount(totalUnread);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  const doctorNavItems: NavItem[] = [
    { title: "Dashboard", href: "/doctor/dashboard", icon: <LayoutDashboard /> },
    { title: "Patients", href: "/doctor/patients", icon: <Users /> },
    { title: "Appointments", href: "/doctor/appointments", icon: <Stethoscope /> },
    { 
      title: "Chat", 
      href: "/doctor/chat", 
      icon: <MessageSquareHeart />,
      badge: unreadChatCount > 0 ? String(unreadChatCount) : undefined
    },
    { title: "Medicines", href: "/doctor/medicines", icon: <Pill /> },
    { title: "Clinic Settings", href: "/doctor/settings", icon: <Settings /> },
    { title: "Profile", href: "/doctor/profile", icon: <UserCircle /> },
  ];

  return (
    <DashboardShell navItems={doctorNavItems} userRole="doctor">
      {children}
    </DashboardShell>
  );
}
