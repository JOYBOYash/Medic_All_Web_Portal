
"use client";

import React, { useState, useEffect } from "react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { LayoutDashboard, Users, Pill, Stethoscope, Settings, UserCircle, MessageSquareHeart, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, onSnapshot, CHAT_ROOMS_COLLECTION, ChatRoom } from "@/lib/firebase";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { usePathname, useRouter } from "next/navigation";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { notificationPrefs } = useSettings();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (authLoading) return; // Don't run logic until auth state is resolved
    if (!user || userProfile?.role !== 'doctor') {
      router.replace('/login?role=doctor&error=role_mismatch');
    }
  }, [authLoading, user, userProfile, router]);


  useEffect(() => {
    if (!user || !db || userProfile?.role !== 'doctor') return;

    const q = query(
        collection(db, CHAT_ROOMS_COLLECTION),
        where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let totalUnread = 0;
        const currentRooms: ChatRoom[] = [];

        const modifiedRooms = querySnapshot.docChanges()
          .filter(change => change.type === "modified")
          .map(change => ({ id: change.doc.id, ...change.doc.data() } as ChatRoom));

        querySnapshot.forEach((doc) => {
            const room = { id: doc.id, ...doc.data() } as ChatRoom;
            currentRooms.push(room);
            totalUnread += room.unreadCounts?.[user.uid] || 0;
        });

        // Only show toast for new messages
        if (querySnapshot.metadata.hasPendingWrites === false) {
           modifiedRooms.forEach(updatedRoom => {
              const previousRoom = currentRooms.find(r => r.id === updatedRoom.id);
              const prevUnread = previousRoom?.unreadCounts?.[user.uid] || 0;
              const newUnread = updatedRoom.unreadCounts?.[user.uid] || 0;

              if (newUnread > prevUnread && notificationPrefs.chatAlerts && pathname !== '/doctor/chat') {
                  const otherParticipantId = updatedRoom.participants.find(p => p !== user.uid) || '';
                  const patientInfo = updatedRoom.participantInfo[otherParticipantId];
                  toast({
                      title: "New Message",
                      description: `You have a new message from ${patientInfo?.displayName || 'a patient'}.`
                  });
              }
           })
        }
        
        setUnreadChatCount(totalUnread);
    }, (error) => {
      console.error("Error fetching chat rooms for unread count:", error);
    });

    return () => unsubscribe();
  }, [user, userProfile, notificationPrefs.chatAlerts, toast, pathname]);


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

  if (authLoading || !user || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell navItems={doctorNavItems} userRole="doctor">
      {children}
    </DashboardShell>
  );
}
