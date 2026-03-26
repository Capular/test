"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Clock, Zap, Shield, Trophy, Sparkles } from "lucide-react";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import gsap from "gsap";

interface Template {
    id: string;
    name: string;
    type: 'solo' | 'duo' | 'squad';
    format: 'scrim' | 'championship';
    maxPlayersPerRoom: number;
    startTimeThreshold: number;
    rescheduleInterval: number;
    isActive: boolean;
    gameName?: string;
    gameId?: string;
    entryFee?: number;
    prizePool?: number;
    perKill?: number;
}

interface TemplateCardProps {
    template: Template;
    isUserBusy?: boolean;
}

export default function TemplateCard({ template, isUserBusy = false }: TemplateCardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    
    const [activeRoom, setActiveRoom] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [ign, setIgn] = useState("");

    // Refs for GSAP animations
    const cardRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Set initial state
        if (cardRef.current) {
            gsap.set(cardRef.current, {
                borderColor: isDark ? "hsla(240, 3.7%, 15.9%, 0.3)" : "hsla(0, 0%, 80%, 0.5)",
                y: 0,
                scale: 1
            });
        }
    }, [isDark]);

    // GSAP Hover Handlers - Snappy animations
    const handleMouseEnter = () => {
        // Kill any ongoing animations for snappy response
        if (cardRef.current) gsap.killTweensOf(cardRef.current);
        if (titleRef.current) gsap.killTweensOf(titleRef.current);
        if (glowRef.current) gsap.killTweensOf(glowRef.current);
        
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                // Dark mode: neutral border, Light mode: orange accent
                borderColor: isDark ? "hsla(0, 0%, 40%, 0.6)" : "hsla(25, 95%, 53%, 0.6)",
                boxShadow: isDark 
                    ? "0 16px 32px -8px hsla(0, 0%, 0%, 0.4)"
                    : "0 16px 32px -8px hsla(25, 95%, 53%, 0.25)",
                y: -6,
                scale: 1.015,
                duration: 0.25,
                ease: "power2.out"
            });
        }
        if (titleRef.current) {
            gsap.to(titleRef.current, {
                x: 4,
                duration: 0.2,
                ease: "power2.out"
            });
        }
        if (glowRef.current) {
            gsap.to(glowRef.current, {
                opacity: isDark ? 0.3 : 1,
                duration: 0.2,
                ease: "power2.out"
            });
        }
    };

    const handleMouseLeave = () => {
        // Kill any ongoing animations for snappy response
        if (cardRef.current) gsap.killTweensOf(cardRef.current);
        if (titleRef.current) gsap.killTweensOf(titleRef.current);
        if (glowRef.current) gsap.killTweensOf(glowRef.current);
        
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                borderColor: isDark ? "hsla(240, 3.7%, 15.9%, 0.3)" : "hsla(0, 0%, 80%, 0.5)",
                boxShadow: "0 4px 12px -4px hsla(0, 0%, 0%, 0.15)",
                y: 0,
                scale: 1,
                duration: 0.25,
                ease: "power2.out"
            });
        }
        if (titleRef.current) {
            gsap.to(titleRef.current, {
                x: 0,
                duration: 0.2,
                ease: "power2.out"
            });
        }
        if (glowRef.current) {
            gsap.to(glowRef.current, {
                opacity: 0,
                duration: 0.2,
                ease: "power2.out"
            });
        }
    };
    // Predicted time for new rooms (updates every minute)
    const [predictedTime, setPredictedTime] = useState<Date>(new Date());

    useEffect(() => {
        const updatePredictedTime = () => {
            const now = new Date();
            // Add threshold minutes to current time
            const future = new Date(now.getTime() + (template.startTimeThreshold * 60000));
            setPredictedTime(future);
        };

        updatePredictedTime(); // Initial
        const interval = setInterval(updatePredictedTime, 60000); // Every minute

        return () => clearInterval(interval);
    }, [template.startTimeThreshold]);

    // Listen for the current open room for this template
    useEffect(() => {
        const q = query(
            collection(db, "tournaments"),
            where("templateId", "==", template.id),
            where("status", "==", "open"),
            orderBy("createdAt", "asc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setActiveRoom({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            } else {
                setActiveRoom(null);
            }
        });

        return () => unsubscribe();
    }, [template.id]);

    // Check for existing queue entry
    const [isQueued, setIsQueued] = useState(false);
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "queued_registrations"),
            where("userId", "==", user.uid),
            where("templateId", "==", template.id)
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            setIsQueued(!snap.empty);
        });
        return () => unsubscribe();
    }, [user, template.id]);

    const handleRegister = async (advance: boolean = false) => {
        if (!user) {
            toast.error("Please login to register");
            return;
        }

        if (!ign.trim()) {
            toast.error("Please enter your In-Game Name");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/matchmaking/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    userName: user.displayName || "Unknown",
                    userAvatar: user.photoURL || "",
                    templateId: template.id,
                    ingameName: ign.trim(),
                    advance: advance
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to join");
            }

            if (data.createdNew && !advance) {
                toast.success("New room created! You joined.");
            } else if (advance) {
                toast.success("Queued successfully for next match!");
            } else {
                toast.success("Joined successfully!");
            }

            setIsRegisterOpen(false);

        } catch (error: any) {
            toast.error(error.message);
        }
        setLoading(false);
    };

    const handleConsumeQueue = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch("/api/matchmaking/consume-queue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.uid, templateId: template.id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to join");
            
            toast.success("Joined match using your Queue Pass!");
            setIsRegisterOpen(false);
            // Optionally redirect to tournament page
            // router.push(`/tournaments/${template.id}`);
        } catch (error: any) {
            toast.error(error.message);
        }
        setLoading(false);
    };

    // Calculate time display (Client-side visual fix for lazy reschedule)
    const getStartTime = () => {
        if (activeRoom && activeRoom.scheduledStartTime) {
            let date = activeRoom.scheduledStartTime.toDate();
            const now = new Date();

            if (date < now) {
                const intervalMillis = (template.rescheduleInterval || 30) * 60 * 1000;
                const diff = now.getTime() - date.getTime();
                const intervalsPassed = Math.ceil(diff / intervalMillis);
                date = new Date(date.getTime() + (intervalsPassed * intervalMillis));
            }

            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        return predictedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            ref={cardRef}
            className="bg-card backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden relative cursor-pointer group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => router.push(`/tournaments/${template.id}`)}
        >
            {/* GSAP Glow Effect */}
            <div
                ref={glowRef}
                className={`absolute inset-0 pointer-events-none z-0 opacity-0 ${
                    isDark 
                        ? "bg-gradient-to-br from-white/5 to-transparent" 
                        : "bg-gradient-to-br from-primary/15 via-orange-500/10 to-transparent"
                }`}
            />

            {/* Main Content */}
            <div className="p-4 relative z-10">
                {/* Top Row: Type Badge + Title + Time */}
                <div className="flex items-center gap-3 mb-3">
                    {/* Type Badge */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center ${
                        isDark 
                            ? "bg-muted/50 border border-border/30"
                            : "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
                    }`}>
                        <Users size={14} className={isDark ? "text-foreground" : "text-primary"} />
                        <span className={`text-[10px] font-bold uppercase ${
                            isDark ? "text-foreground" : "text-primary"
                        }`}>
                            {template.type}
                        </span>
                    </div>
                    
                    {/* Title & Mode */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 ref={titleRef} className="text-lg font-bold font-rajdhani text-foreground tracking-tight truncate">
                                {template.name}
                            </h3>
                            {activeRoom && (
                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400"></span>
                            )}
                        </div>
                        <span className={`text-xs font-bold flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md ${
                            isDark 
                                ? "bg-muted/50 text-foreground"
                                : "bg-primary/15 text-primary"
                        }`}>
                            <Users size={10} />
                            {template.type.toUpperCase()}
                        </span>
                    </div>

                    {/* Right side: Time - Prominent */}
                    <div className="flex-shrink-0 text-right">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Starts</p>
                        <p className="text-xl font-bold text-foreground font-rajdhani">{getStartTime()}</p>
                    </div>
                </div>

                {/* Prize Row: Prizepool | Per Kill | Entry Fee (right) */}
                <div className="flex items-stretch gap-3 mb-4">
                    {/* Prizepool - Left */}
                    {template.prizePool && template.prizePool > 0 && (
                        <div className={`flex-1 rounded-xl px-4 py-2.5 ${
                            isDark 
                                ? "bg-amber-900/30 border border-amber-800/30"
                                : "bg-amber-50 border border-amber-100"
                        }`}>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Prize</p>
                            <p className={`text-base font-bold ${
                                isDark ? "text-amber-200" : "text-amber-700"
                            }`}>
                                ₹{template.prizePool.toLocaleString()}
                            </p>
                        </div>
                    )}
                    
                    {/* Per Kill - Middle */}
                    {template.perKill && template.perKill > 0 && (
                        <div className={`flex-1 rounded-xl px-4 py-2.5 ${
                            isDark 
                                ? "bg-rose-900/30 border border-rose-800/30"
                                : "bg-rose-50 border border-rose-100"
                        }`}>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Per Kill</p>
                            <p className={`text-base font-bold ${
                                isDark ? "text-rose-200" : "text-rose-700"
                            }`}>
                                ₹{template.perKill}
                            </p>
                        </div>
                    )}

                    {/* Entry Fee - Full width if alone, right side if others exist */}
                    <div className={`rounded-xl px-4 py-2.5 ${
                        (!template.prizePool || template.prizePool <= 0) && (!template.perKill || template.perKill <= 0)
                            ? "flex-1"
                            : "ml-auto"
                    } ${
                        isDark 
                            ? "bg-stone-800/50 border border-stone-700/30"
                            : template.entryFee && template.entryFee > 0 
                                ? "bg-stone-100 border border-stone-200"
                                : "bg-teal-50 border border-teal-100"
                    }`}>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Entry</p>
                        <p className={`text-base font-bold ${
                            isDark 
                                ? "text-stone-200"
                                : template.entryFee && template.entryFee > 0 
                                    ? "text-stone-700"
                                    : "text-teal-700"
                        }`}>
                            {template.entryFee && template.entryFee > 0 ? `₹${template.entryFee}` : "FREE"}
                        </p>
                    </div>
                </div>

                {/* Slots Remaining - Bold Display */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Slots</span>
                        <span className="text-lg font-bold text-foreground font-rajdhani">
                            {activeRoom 
                                ? template.maxPlayersPerRoom - activeRoom.currentPlayers 
                                : template.maxPlayersPerRoom
                            }/{template.maxPlayersPerRoom}
                            <span className="text-xs text-muted-foreground font-normal ml-1">left</span>
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${
                                isDark 
                                    ? "bg-foreground/60"
                                    : "bg-gradient-to-r from-primary to-orange-500"
                            }`}
                            style={{ 
                                width: `${activeRoom 
                                    ? (activeRoom.currentPlayers / template.maxPlayersPerRoom) * 100 
                                    : 0
                                }%` 
                            }}
                        />
                    </div>
                </div>

                {/* Action Button */}
                {isQueued && isUserBusy ? (
                    <Button className="w-full font-bold gap-2 bg-purple-500/15 text-purple-300 cursor-not-allowed rounded-xl h-11 border border-purple-500/20" disabled>
                        <Clock size={14} />
                        Queued for Next
                    </Button>
                ) : isQueued && !isUserBusy ? (
                    <Button
                        ref={buttonRef}
                        onClick={handleConsumeQueue}
                        disabled={loading}
                        className={`w-full font-bold gap-2 rounded-xl h-11 border-0 ${
                            isDark 
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                        }`}
                    >
                        {loading ? <GsapLoaderInline size="sm" /> : <Zap size={14} fill="currentColor" />}
                        Join Match (Pass)
                    </Button>
                ) : (
                    <Button
                        ref={buttonRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/tournaments/${template.id}/register`);
                        }}
                        className={`w-full font-bold gap-2 rounded-xl h-11 border-0 ${
                            isDark 
                                ? "bg-foreground text-background hover:bg-foreground/90"
                                : "bg-gradient-to-r from-primary to-orange-600 text-white hover:from-primary/90 hover:to-orange-500"
                        }`}
                    >
                        <Zap size={14} fill="currentColor" />
                        Register • {(template.entryFee || 0) > 0 ? `₹${template.entryFee}` : "Free"}
                    </Button>
                )}
            </div>
        </div>
    );
}



