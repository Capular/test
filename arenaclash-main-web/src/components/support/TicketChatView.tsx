"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, User, ShieldAlert } from "lucide-react";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import gsap from "gsap";
import { useAuth } from "@/components/auth/AuthProvider";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    role: 'user' | 'admin';
    createdAt: Timestamp;
}

interface TicketChatViewProps {
    ticketId: string;
    ticketSubject: string;
    ticketStatus: string;
    onClose: () => void;
}

export default function TicketChatView({ ticketId, ticketSubject, ticketStatus, onClose }: TicketChatViewProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Entrance Animation
    useEffect(() => {
        const tl = gsap.timeline();

        if (overlayRef.current) {
            gsap.set(overlayRef.current, { display: "flex" });
            tl.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: "power2.out" }
            );
        }

        if (containerRef.current) {
            tl.fromTo(containerRef.current,
                { y: "100%", opacity: 1 },
                { y: "0%", opacity: 1, duration: 0.5, ease: "power3.out" },
                "-=0.1"
            );
        }

        return () => {
            if (overlayRef.current) gsap.set(overlayRef.current, { display: "none" });
        };
    }, []);

    // Fetch Messages
    useEffect(() => {
        if (!ticketId) return;

        const q = query(
            collection(db, "support_tickets", ticketId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [ticketId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        setSending(true);
        try {
            await addDoc(collection(db, "support_tickets", ticketId, "messages"), {
                text: newMessage,
                senderId: user.uid,
                senderName: user.displayName || "User",
                role: "user",
                createdAt: serverTimestamp(),
            });
            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        const tl = gsap.timeline({
            onComplete: onClose
        });

        if (containerRef.current) {
            tl.to(containerRef.current, { y: "100%", duration: 0.4, ease: "power3.in" });
        }
        if (overlayRef.current) {
            tl.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: "power2.in" }, "-=0.2");
        }
    };

    const formatTime = (timestamp: Timestamp) => {
        if (!timestamp?.toDate) return "";
        return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 hidden lg:flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        >
            <div
                ref={containerRef}
                className="w-full h-full sm:h-[80vh] max-w-2xl bg-card border-t sm:border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold font-rajdhani text-lg truncate max-w-[200px] sm:max-w-xs">{ticketSubject}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Ticket #{ticketId.slice(0, 8)}</span>
                                <Badge variant="outline" className={`text-[10px] h-4 px-1.5 capitalize border-0 ${ticketStatus === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                    }`}>
                                    {ticketStatus}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full hover:bg-muted">
                        <X size={20} />
                    </Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <div className="p-4 rounded-full bg-muted mb-2">
                                <ShieldAlert size={32} />
                            </div>
                            <p className="text-sm">No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.role === 'user';
                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    {!isMe && (
                                        <Avatar className="h-8 w-8 mt-1 border border-border">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">AD</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-baseline gap-2 mb-1 px-1`}>
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {isMe ? 'You' : 'Support Team'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/50">
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                            : 'bg-card border border-border text-foreground rounded-tl-sm'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                    {isMe && (
                                        <Avatar className="h-8 w-8 mt-1 border border-border">
                                            <AvatarImage src={user?.photoURL || undefined} />
                                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">ME</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 bg-muted/30 border-border/50"
                            disabled={sending}
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="bg-primary text-primary-foreground">
                            {sending ? <GsapLoaderInline size="sm" /> : <Send size={18} />}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
