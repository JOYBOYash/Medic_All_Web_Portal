
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, UserCircle, Loader2, ChevronsUpDown, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserProfile, ChatRoom, ChatMessage } from "@/types/homeoconnect";
import { db, collection, query, where, getDocs, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp, writeBatch, PATIENTS_COLLECTION, USERS_COLLECTION, CHAT_ROOMS_COLLECTION, getFirestoreDoc, increment, updateDoc, deleteDoc, limit } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export default function PatientChatPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<UserProfile | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);


  useEffect(() => {
    const fetchAssociatedDoctors = async () => {
        if (!user || !userProfile || !db) {
            setDataLoading(false);
            return;
        }
        setDataLoading(true);
        try {
            const patientQuery = query(collection(db, PATIENTS_COLLECTION), where("authUid", "==", user.uid));
            const patientSnapshots = await getDocs(patientQuery);
            if (patientSnapshots.empty) {
                toast({ title: "No Doctors Found", description: "You are not yet associated with any doctor's clinic." });
                return;
            }
            const doctorIds = [...new Set(patientSnapshots.docs.map(doc => doc.data().doctorId as string))];

            if (doctorIds.length > 0) {
                const doctorsQuery = query(collection(db, USERS_COLLECTION), where("id", "in", doctorIds));
                const doctorsSnapshot = await getDocs(doctorsQuery);
                const fetchedDoctors = doctorsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
                setDoctors(fetchedDoctors);
                if(fetchedDoctors.length > 0) {
                    setSelectedDoctor(fetchedDoctors[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching associated doctors:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load your doctors list." });
        } finally {
            setDataLoading(false);
        }
    };
    if (!authLoading) {
      fetchAssociatedDoctors();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, userProfile]);
  
  useEffect(() => {
    if(user && selectedDoctor) {
        const ids = [user.uid, selectedDoctor.id];
        ids.sort();
        setChatRoomId(ids.join('_'));
    }
  }, [user, selectedDoctor]);

  useEffect(() => {
    if (!chatRoomId) {
        setMessages([]);
        return;
    };

    // Listen for room changes (for unread count)
    const roomUnsubscribe = onSnapshot(doc(db, CHAT_ROOMS_COLLECTION, chatRoomId), (doc) => {
        if (doc.exists()) {
            setChatRoom(doc.data() as ChatRoom);
        }
    });

    // Listen for messages
    const messagesQuery = query(
        collection(db, CHAT_ROOMS_COLLECTION, chatRoomId, 'messages'),
        orderBy('timestamp', 'asc')
    );

    const messagesUnsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
        const fetchedMessages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        } as ChatMessage));
        setMessages(fetchedMessages);
    });

    return () => {
        roomUnsubscribe();
        messagesUnsubscribe();
    };
  }, [chatRoomId]);

   // Mark messages as read when the chat is open
  useEffect(() => {
    if (chatRoomId && user && (chatRoom?.unreadCounts?.[user.uid] || 0) > 0) {
      const roomRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId);
      updateDoc(roomRef, {
          [`unreadCounts.${user.uid}`]: 0
      }).catch(err => console.error("Failed to mark patient chat as read", err));
    }
  }, [chatRoom, chatRoomId, user, messages]); // Re-run if messages change


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === "" || !selectedDoctor || !user || !userProfile || !chatRoomId) return;

    setIsSending(true);

    const recipientId = selectedDoctor.id;
    const senderId = user.uid;

    const newMsgPayload = {
      text: inputText,
      senderId: senderId,
      timestamp: serverTimestamp(),
    };

    const lastMessageData = {
        text: inputText,
        senderId: senderId,
        timestamp: serverTimestamp(),
    };
    
    const chatRoomRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId);

    try {
        const docSnap = await getFirestoreDoc(chatRoomRef);
        const batch = writeBatch(db);
        
        const newMessageRef = doc(collection(chatRoomRef, "messages"));
        batch.set(newMessageRef, newMsgPayload);

        if (docSnap.exists()) {
            batch.update(chatRoomRef, {
                lastMessage: lastMessageData,
                updatedAt: serverTimestamp(),
                [`unreadCounts.${recipientId}`]: increment(1),
            });
        } else {
            batch.set(chatRoomRef, {
                participants: [senderId, recipientId],
                participantInfo: {
                    [senderId]: { displayName: userProfile.displayName, photoURL: userProfile.photoURL },
                    [recipientId]: { displayName: selectedDoctor.displayName, photoURL: selectedDoctor.photoURL }
                },
                lastMessage: lastMessageData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                unreadCounts: {
                    [senderId]: 0,
                    [recipientId]: 1,
                },
            });
        }
        await batch.commit();
        setInputText("");

    } catch(error) {
        console.error("Error sending message:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to send message." });
    } finally {
        setIsSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete || !chatRoomId) return;

    const messageRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId, "messages", messageToDelete.id);
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId);

    try {
      const batch = writeBatch(db);
      
      const lastMessageQuery = query(collection(roomRef, "messages"), orderBy("timestamp", "desc"), limit(2));
      const lastMessagesSnap = await getDocs(lastMessageQuery);
      
      const isDeletingLastMessage = lastMessagesSnap.docs.length > 0 && lastMessagesSnap.docs[0].id === messageToDelete.id;

      if (isDeletingLastMessage) {
        if (lastMessagesSnap.docs.length > 1) {
          const newLastMessage = lastMessagesSnap.docs[1].data();
          batch.update(roomRef, { lastMessage: { text: newLastMessage.text, senderId: newLastMessage.senderId, timestamp: newLastMessage.timestamp }, updatedAt: serverTimestamp() });
        } else {
          batch.update(roomRef, { lastMessage: null, updatedAt: serverTimestamp() });
        }
      }

      batch.delete(messageRef);
      await batch.commit();

      toast({ title: "Success", description: "Message deleted." });
    } catch (error) {
        console.error("Error deleting message:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete message. You may not have permission." });
    } finally {
        setMessageToDelete(null);
    }
  };

  if (authLoading || dataLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
    <div className="flex flex-col h-[calc(100vh-var(--header-height,4rem)-2rem)] md:h-[calc(100vh-var(--header-height,4rem)-4rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Chat with Your Doctor</h1>
        <p className="text-muted-foreground">Get quick assistance for non-urgent matters. For emergencies, please call appropriate services.</p>
      </div>

      <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
        <CardHeader className="border-b">
           <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border">
                        <AvatarImage src={selectedDoctor?.photoURL || `https://avatar.vercel.sh/${selectedDoctor?.id}.svg`} alt={selectedDoctor?.displayName || "Doctor"} />
                        <AvatarFallback>{selectedDoctor?.displayName?.charAt(0) || <UserCircle />}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="font-headline text-lg">{selectedDoctor?.displayName || "Select a Doctor"}</CardTitle>
                        <CardDescription className="text-green-500 flex items-center gap-1">
                            {selectedDoctor && <><span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span> Online</>}
                        </CardDescription>
                    </div>
                </div>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={popoverOpen} className="w-[200px] justify-between">
                            Switch Doctor
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandInput placeholder="Search doctor..." />
                            <CommandList>
                                <CommandEmpty>No doctors found.</CommandEmpty>
                                <CommandGroup>
                                    {doctors.map((doctor) => (
                                        <CommandItem
                                            key={doctor.id}
                                            value={doctor.displayName || doctor.id}
                                            onSelect={() => {
                                                setSelectedDoctor(doctor);
                                                setPopoverOpen(false);
                                            }}
                                        >
                                            {doctor.displayName}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-4 bg-secondary/20" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg) => {
                const isOwnMessage = msg.senderId === user?.uid;
                const isRecent = msg.timestamp && (new Date().getTime() - msg.timestamp.getTime()) < FIVE_MINUTES_IN_MS;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex items-end gap-2 group", isOwnMessage ? "justify-end" : "justify-start"
                    )}
                  >
                    {isOwnMessage && isRecent && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => setMessageToDelete(msg)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    {msg.senderId !== user?.uid && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedDoctor?.photoURL || undefined} alt={selectedDoctor?.displayName || "Doctor"} />
                        <AvatarFallback><UserCircle size={16}/></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md p-3 rounded-xl shadow ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-card text-card-foreground rounded-bl-none border"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {msg.timestamp ? formatDistanceToNow(msg.timestamp, { addSuffix: true }) : 'sending...'}
                      </p>
                    </div>
                    {msg.senderId === user?.uid && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName || "User"} />
                         <AvatarFallback>{userProfile?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )
            })}
          </div>
        </ScrollArea>

        <CardContent className="p-0 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-3 bg-background">
            <Button variant="ghost" size="icon" type="button" disabled>
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Input
              type="text"
              placeholder={selectedDoctor ? "Type your message..." : "Please select a doctor first"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
              disabled={!selectedDoctor || isSending}
            />
            <Button type="submit" size="icon" disabled={!inputText.trim() || !selectedDoctor || isSending}>
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>

    <AlertDialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your message.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMessage} className={cn(buttonVariants({ variant: "destructive" }))}>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
