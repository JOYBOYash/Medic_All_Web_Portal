
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, collection, query, where, onSnapshot, orderBy, doc, setDoc, addDoc, serverTimestamp, writeBatch, getDocs, updateDoc, increment, CHAT_ROOMS_COLLECTION, deleteDoc, limit } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { ChatRoom, ChatMessage, UserProfile } from "@/types/homeoconnect";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, UserCircle, MessageSquare, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export default function DoctorChatPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !userProfile || userProfile.role !== 'doctor') {
        setDataLoading(false);
        return;
    }
    
    setDataLoading(true);

    const q = query(
      collection(db, CHAT_ROOMS_COLLECTION),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rooms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
      setChatRooms(rooms);
      // If a room is selected, update its state from the new snapshot
      if (selectedRoom) {
        const updatedSelectedRoom = rooms.find(r => r.id === selectedRoom.id);
        if (updatedSelectedRoom) {
          setSelectedRoom(updatedSelectedRoom);
        }
      }
      setDataLoading(false);
    }, (error) => {
      console.error("Error fetching chat rooms: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load conversations." });
      setDataLoading(false);
    });

    return () => unsubscribe();

  }, [user, userProfile, authLoading, toast, selectedRoom]);
  
  useEffect(() => {
    if (!selectedRoom?.id) {
        setMessages([]);
        return;
    }

    const messagesQuery = query(
        collection(db, CHAT_ROOMS_COLLECTION, selectedRoom.id, "messages"),
        orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
        const fetchedMessages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        } as ChatMessage));
        setMessages(fetchedMessages);
    });
    
    return () => unsubscribe();

  }, [selectedRoom]);

  // Mark messages as read when a room is selected
  useEffect(() => {
    if (selectedRoom?.id && user && (selectedRoom.unreadCounts?.[user.uid] || 0) > 0) {
      const roomRef = doc(db, CHAT_ROOMS_COLLECTION, selectedRoom.id);
      updateDoc(roomRef, {
          [`unreadCounts.${user.uid}`]: 0
      }).catch(err => console.error("Failed to mark chat as read", err));
    }
  }, [selectedRoom, user]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === "" || !selectedRoom || !user || !userProfile) return;

    setIsSending(true);
    
    const recipientId = selectedRoom.participants.find(p => p !== user.uid);
    if (!recipientId) {
        toast({ variant: "destructive", title: "Error", description: "Recipient not found." });
        setIsSending(false);
        return;
    }

    const chatRoomRef = doc(db, CHAT_ROOMS_COLLECTION, selectedRoom.id);
    
    const newMsgPayload = {
        text: inputText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
    };
    
    const lastMessageData = {
        text: inputText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
    };

    try {
        const batch = writeBatch(db);
        const newMessageRef = doc(collection(chatRoomRef, "messages"));
        batch.set(newMessageRef, newMsgPayload);

        batch.update(chatRoomRef, { 
            lastMessage: lastMessageData, 
            updatedAt: serverTimestamp(),
            [`unreadCounts.${recipientId}`]: increment(1)
        });

        await batch.commit();
        setInputText("");
    } catch (error) {
        console.error("Error sending message:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not send message." });
    } finally {
        setIsSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete || !selectedRoom) return;

    const messageRef = doc(db, CHAT_ROOMS_COLLECTION, selectedRoom.id, "messages", messageToDelete.id);
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, selectedRoom.id);

    try {
      const batch = writeBatch(db);
      
      // Check if this is the last message to update the room's lastMessage field
      const lastMessageQuery = query(collection(roomRef, "messages"), orderBy("timestamp", "desc"), limit(2));
      const lastMessagesSnap = await getDocs(lastMessageQuery);
      
      const isDeletingLastMessage = lastMessagesSnap.docs.length > 0 && lastMessagesSnap.docs[0].id === messageToDelete.id;

      if (isDeletingLastMessage) {
        if (lastMessagesSnap.docs.length > 1) {
          // There's a message before this one, so update lastMessage to it
          const newLastMessage = lastMessagesSnap.docs[1].data();
          batch.update(roomRef, { lastMessage: { text: newLastMessage.text, senderId: newLastMessage.senderId, timestamp: newLastMessage.timestamp }, updatedAt: serverTimestamp() });
        } else {
          // This is the only message, so clear lastMessage
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

  const getParticipantInfo = (room: ChatRoom, currentUserId: string) => {
      const otherParticipantId = room.participants.find(p => p !== currentUserId);
      if (!otherParticipantId) return { name: "Unknown", photoURL: "" };
      const info = room.participantInfo[otherParticipantId];
      return { name: info?.displayName || "Patient", photoURL: info?.photoURL || `https://avatar.vercel.sh/${otherParticipantId}.svg` };
  }

  if (dataLoading || authLoading) {
     return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
    <div className="h-[calc(100vh-var(--header-height,4rem)-2rem)] md:h-[calc(100vh-var(--header-height,4rem)-4rem)] flex flex-col">
       <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Patient Conversations</h1>
        <p className="text-muted-foreground">Manage all your patient communications in one place.</p>
      </div>

      <Card className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr] shadow-lg overflow-hidden">
        {/* Mobile View: Show back button if a chat is selected */}
        {selectedRoom && (
            <div className="md:hidden p-2 border-b">
                <Button variant="ghost" size="sm" onClick={() => setSelectedRoom(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Conversations
                </Button>
            </div>
        )}

        {/* Conversations List */}
        <div className={cn("flex-col border-r bg-muted/50", selectedRoom ? "hidden md:flex" : "flex")}>
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold font-headline">Chats ({chatRooms.length})</h2>
            </div>
            <ScrollArea className="flex-1">
                {chatRooms.length > 0 ? chatRooms.map(room => {
                    const patientInfo = getParticipantInfo(room, user?.uid || '');
                    const unreadCount = room.unreadCounts?.[user?.uid || ''] || 0;
                    return (
                        <div key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            className={cn(
                                "flex items-center gap-3 p-3 cursor-pointer border-b hover:bg-secondary/50",
                                selectedRoom?.id === room.id && "bg-secondary"
                            )}
                        >
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={patientInfo.photoURL} alt={patientInfo.name} />
                                <AvatarFallback><UserCircle /></AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate">
                                <p className={cn("font-semibold", unreadCount > 0 && "font-bold")}>{patientInfo.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{room.lastMessage?.text || "No messages yet."}</p>
                            </div>
                            <div className="flex flex-col items-end self-start">
                                {room.updatedAt && <p className="text-xs text-muted-foreground">{formatDistanceToNow(room.updatedAt.toDate(), { addSuffix: true })}</p>}
                                {unreadCount > 0 && (
                                    <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No active conversations.</div>
                )}
            </ScrollArea>
        </div>
        
        {/* Chat Interface */}
        <div className={cn("flex-col", selectedRoom ? "flex" : "hidden md:flex")}>
            {selectedRoom ? (
                <>
                    <CardHeader className="border-b">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border">
                                <AvatarImage src={getParticipantInfo(selectedRoom, user?.uid || '').photoURL} />
                                <AvatarFallback><UserCircle /></AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="font-headline text-lg">{getParticipantInfo(selectedRoom, user?.uid || '').name}</CardTitle>
                                <CardDescription className="text-green-500 flex items-center gap-1">
                                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span> Online
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <ScrollArea className="flex-1 p-4 bg-secondary/20" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            {messages.map(msg => {
                                const isOwnMessage = msg.senderId === user?.uid;
                                const isRecent = msg.timestamp && (new Date().getTime() - msg.timestamp.getTime()) < FIVE_MINUTES_IN_MS;
                                return (
                                    <div key={msg.id} className={cn("flex items-end gap-2 group", isOwnMessage ? "justify-end" : "justify-start")}>
                                        {isOwnMessage && isRecent && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => setMessageToDelete(msg)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {msg.senderId !== user?.uid && <Avatar className="h-8 w-8"><AvatarImage src={getParticipantInfo(selectedRoom, user?.uid || '').photoURL} /></Avatar>}
                                        <div className={cn("max-w-xs lg:max-w-md p-3 rounded-xl shadow", isOwnMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none border")}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                            <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{msg.timestamp ? formatDistanceToNow(msg.timestamp) : 'sending...'}</p>
                                        </div>
                                        {msg.senderId === user?.uid && <Avatar className="h-8 w-8"><AvatarImage src={userProfile?.photoURL || undefined} /></Avatar>}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <CardContent className="p-0 border-t">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-3 bg-background">
                            <Input
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                autoComplete="off"
                                disabled={isSending}
                            />
                            <Button type="submit" size="icon" disabled={!inputText.trim() || isSending}>
                                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </Button>
                        </form>
                    </CardContent>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                    <MessageSquare className="h-20 w-20 mb-4 opacity-50"/>
                    <h2 className="text-xl font-semibold">Select a conversation</h2>
                    <p>Choose a patient from the list to view your chat history.</p>
                </div>
            )}
        </div>
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
