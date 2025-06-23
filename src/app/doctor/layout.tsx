
"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { LayoutDashboard, Users, Pill, Stethoscope, Settings, UserCircle, MessageSquareHeart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, onSnapshot, CHAT_ROOMS_COLLECTION, ChatRoom } from "@/lib/firebase";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile } = useAuth();
  const { notificationPrefs } = useSettings();
  const { toast } = useToast();
  const pathname = usePathname();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!user || !db || userProfile?.role !== 'doctor') return;

    const q = query(
        collection(db, CHAT_ROOMS_COLLECTION),
        where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let totalUnread = 0;
        const currentRooms: ChatRoom[] = [];

        querySnapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const updatedRoom = { id: change.doc.id, ...change.doc.data() } as ChatRoom;
                const previousRoom = chatRooms.find(r => r.id === updatedRoom.id);
                const prevUnread = previousRoom?.unreadCounts?.[user.uid] || 0;
                const newUnread = updatedRoom.unreadCounts?.[user.uid] || 0;

                // Notify if a new message has arrived and user is not on chat page
                if (newUnread > prevUnread && notificationPrefs.chatAlerts && pathname !== '/doctor/chat') {
                    const otherParticipantId = updatedRoom.participants.find(p => p !== user.uid) || '';
                    const patientInfo = updatedRoom.participantInfo[otherParticipantId];
                    toast({
                        title: "New Message",
                        description: `You have a new message from ${patientInfo?.displayName || 'a patient'}.`
                    });
                }
            }
        });

        querySnapshot.forEach((doc) => {
            const room = { id: doc.id, ...doc.data() } as ChatRoom;
            currentRooms.push(room);
            totalUnread += room.unreadCounts?.[user.uid] || 0;
        });

        setChatRooms(currentRooms);
        setUnreadChatCount(totalUnread);
    });

    return () => unsubscribe();
  }, [user, userProfile, notificationPrefs.chatAlerts, toast, chatRooms, pathname]);

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
