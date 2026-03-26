"use client";

import { useState, useRef, useEffect } from "react";
import { X, Ticket, Send } from "lucide-react";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import gsap from "gsap";
import { useAuth } from "@/components/auth/AuthProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreateTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTicketCreated?: (ticketId: string) => void;
}

export default function CreateTicketModal({ isOpen, onClose, onTicketCreated }: CreateTicketModalProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");

    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const formElementsRef = useRef<HTMLDivElement>(null);

    // GSAP Animations
    useEffect(() => {
        if (isOpen) {
            // Show overlay
            if (overlayRef.current) {
                gsap.set(overlayRef.current, { display: "flex" });
                gsap.fromTo(overlayRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.3, ease: "power2.out" }
                );
            }

            // Modal entrance
            if (contentRef.current) {
                gsap.fromTo(contentRef.current,
                    { y: 30, opacity: 0, scale: 0.95 },
                    { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "power3.out", delay: 0.1 }
                );
            }

            // Stagger form elements
            if (formElementsRef.current) {
                gsap.fromTo(formElementsRef.current.children,
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease: "power3.out", delay: 0.25 }
                );
            }
        } else {
            // Close animation
            if (contentRef.current) {
                gsap.to(contentRef.current, { y: 20, opacity: 0, scale: 0.95, duration: 0.2, ease: "power3.in" });
            }
            if (overlayRef.current) {
                gsap.to(overlayRef.current, {
                    opacity: 0,
                    duration: 0.25,
                    ease: "power2.in",
                    delay: 0.05,
                    onComplete: () => {
                        if (overlayRef.current) gsap.set(overlayRef.current, { display: "none" });
                    }
                });
            }
        }
    }, [isOpen]);

    const resetForm = () => {
        setSubject("");
        setCategory("");
        setDescription("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, "support_tickets"), {
                subject,
                category,
                description,
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || "User",
                status: "open",
                priority: "medium",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            resetForm();
            onTicketCreated?.(docRef.id);
            onClose();
        } catch (error) {
            console.error("Error creating ticket:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen && !overlayRef.current) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 hidden items-center justify-center p-4"
            style={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <Card
                ref={contentRef}
                className="relative w-full max-w-md bg-card border-border shadow-2xl z-10"
            >
                <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Ticket size={20} />
                            </div>
                            <CardTitle className="text-lg font-rajdhani">Create Support Ticket</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-full"
                        >
                            <X size={18} />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit}>
                        <div ref={formElementsRef} className="space-y-5">
                            {/* Subject */}
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input
                                    id="subject"
                                    placeholder="Brief summary of the issue"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    required
                                    className="bg-muted/30 border-border/50"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory} required>
                                    <SelectTrigger className="bg-muted/30 border-border/50">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="account">Account Issue</SelectItem>
                                        <SelectItem value="payment">Payment Problem</SelectItem>
                                        <SelectItem value="game">Game/Tournament Issue</SelectItem>
                                        <SelectItem value="bug">Report a Bug</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe your issue in detail..."
                                    rows={4}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    className="bg-muted/30 border-border/50 resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={isLoading || !subject || !category || !description}
                                    className="w-full gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <GsapLoaderInline size="sm" className="mr-2" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Submit Ticket
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
