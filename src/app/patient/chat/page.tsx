
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareHeart, Send, Paperclip, UserCircle, Loader2, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types/homeoconnect";
import { db, collection, query, where, getDocs, PATIENTS_COLLECTION, USERS_COLLECTION } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  sender: "user" | "doctor" | "bot";
  timestamp: Date;
  avatar?: string;
}

export default function PatientChatPage() {
  const { user, userProfile, loading: authLoading, setPageLoading } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Welcome to Medicall Chat! Please select a doctor to begin your conversation. Note: This is a demo and messages are not sent.", sender: "bot", timestamp: new Date(), avatar: "https://placehold.co/40x40.png?text=B" },
  ]);
  const [inputText, setInputText] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<UserProfile | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const fetchAssociatedDoctors = async () => {
        if (!user || !userProfile || !db) {
            setDataLoading(false);
            setPageLoading(false);
            return;
        }
        setDataLoading(true);
        setPageLoading(true);
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
            setPageLoading(false);
        }
    };
    if (!authLoading) {
      fetchAssociatedDoctors();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, userProfile]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === "" || !selectedDoctor) return;

    const newMessage: Message = {
      id: String(Date.now()),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      avatar: userProfile?.photoURL || "https://placehold.co/40x40.png?text=P",
    };
    setMessages([...messages, newMessage]);
    setInputText("");

    setTimeout(() => {
      const botReply: Message = {
        id: String(Date.now() + 1),
        text: "Thank you for your message. This is a demo and your message has not been sent. In a real application, a doctor would review this shortly. If this is an emergency, please call your local emergency number.",
        sender: "bot",
        timestamp: new Date(),
        avatar: "https://placehold.co/40x40.png?text=B",
      };
      setMessages(prev => [...prev, botReply]);
    }, 1500);
  };

  if (dataLoading) {
    return null;
  }

  return (
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
                        <AvatarImage src={selectedDoctor?.photoURL || undefined} alt={selectedDoctor?.displayName || "Doctor"} data-ai-hint="doctor avatar" />
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
                                            value={doctor.id}
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
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender !== "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.avatar} alt={msg.sender} data-ai-hint="avatar person"/>
                    <AvatarFallback><UserCircle size={16}/></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-xs lg:max-w-md p-3 rounded-xl shadow ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card text-card-foreground rounded-bl-none border"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.sender === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.avatar} alt={msg.sender} data-ai-hint="avatar person"/>
                     <AvatarFallback>{userProfile?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
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
              disabled={!selectedDoctor}
            />
            <Button type="submit" size="icon" disabled={!inputText.trim() || !selectedDoctor}>
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
