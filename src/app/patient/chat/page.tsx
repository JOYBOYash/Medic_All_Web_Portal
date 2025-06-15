"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle }_ from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareHeart, Send, Paperclip, UserCircle } from "lucide-react";
import Image from "next/image";

interface Message {
  id: string;
  text: string;
  sender: "user" | "doctor" | "bot";
  timestamp: Date;
  avatar?: string;
}

export default function PatientChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date(Date.now() - 60000 * 5), avatar: "https://placehold.co/40x40.png?text=B" },
    { id: "2", text: "I'm feeling a bit dizzy after taking the new medicine.", sender: "user", timestamp: new Date(Date.now() - 60000 * 3), avatar: "https://placehold.co/40x40.png?text=P" },
    { id: "3", text: "Okay, can you describe the dizziness? Is it constant or intermittent? This might be Dr. Smith responding.", sender: "doctor", timestamp: new Date(Date.now() - 60000 * 1), avatar: "https://placehold.co/40x40.png?text=DS" },
  ]);
  const [inputText, setInputText] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === "") return;

    const newMessage: Message = {
      id: String(Date.now()),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      avatar: "https://placehold.co/40x40.png?text=P", // Placeholder user avatar
    };
    setMessages([...messages, newMessage]);
    setInputText("");

    // Placeholder for bot/doctor reply
    setTimeout(() => {
      const botReply: Message = {
        id: String(Date.now() + 1),
        text: "Thank you for your message. A doctor will review this shortly. If this is an emergency, please call your local emergency number.",
        sender: "bot",
        timestamp: new Date(),
        avatar: "https://placehold.co/40x40.png?text=B",
      };
      setMessages(prev => [...prev, botReply]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,4rem)-2rem)] md:h-[calc(100vh-var(--header-height,4rem)-4rem)]"> {/* Adjust height based on header/footer */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Chat with Your Doctor</h1>
        <p className="text-muted-foreground">Get quick assistance for non-urgent matters. For emergencies, please call appropriate services.</p>
      </div>

      <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Image src="https://placehold.co/48x48.png" alt="Doctor Avatar" data-ai-hint="doctor professional" width={48} height={48} className="rounded-full" />
            <div>
              <CardTitle className="font-headline text-lg">Dr. Smith (Homeopathy)</CardTitle>
              <CardDescription className="text-green-500 flex items-center gap-1">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span> Online
              </CardDescription>
            </div>
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
                     <AvatarFallback><UserCircle size={16}/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <CardContent className="p-0 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-3 bg-background">
            <Button variant="ghost" size="icon" type="button">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={!inputText.trim()}>
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
