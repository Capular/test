"use client";
export const runtime = 'edge';

import { use, useState, useEffect, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { ArrowLeft, Users, Clock, MapPin, Shield, Trophy, Coins, Zap, Target, Swords, Info, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { cn } from "@/lib/utils";

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
    gamemode?: string;
    playersPerTeam?: number;
    teamsPerRoom?: number;
    rules?: string[];
    prizePool?: number;
    perKill?: number;
    bannerImage?: string;
    description?: string;
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: templateId } = use(params);
    const router = useRouter();
    const { user } = useAuth();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const [template, setTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeRoom, setActiveRoom] = useState<any>(null);
    const [isQueued, setIsQueued] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);

    // GSAP Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const statsGridRef = useRef<HTMLDivElement>(null);
    const accordionRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);

    // Fetch Template
    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const docRef = doc(db, "templates", templateId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setTemplate({ id: snap.id, ...snap.data() } as Template);
                } else {
                    router.push("/tournaments");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplate();
    }, [templateId, router]);

    // Listen for active room
    useEffect(() => {
        if (!templateId) return;
        const q = query(
            collection(db, "tournaments"),
            where("templateId", "==", templateId),
            where("status", "==", "open"),
            orderBy("createdAt", "asc"),
            limit(1)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const roomData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                setActiveRoom(roomData);
            } else {
                setActiveRoom(null);
            }
        });
        return () => unsubscribe();
    }, [templateId]);

    // Check queue status
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "queued_registrations"),
            where("userId", "==", user.uid),
            where("templateId", "==", templateId)
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            setIsQueued(!snap.empty);
        });
        return () => unsubscribe();
    }, [user, templateId]);

    // Check if registered in active room
    useEffect(() => {
        if (!user || !activeRoom) {
            setIsRegistered(false);
            return;
        }
        const q = query(
            collection(db, "tournaments", activeRoom.id, "players"),
            where("userId", "==", user.uid)
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            setIsRegistered(!snap.empty);
        });
        return () => unsubscribe();
    }, [user, activeRoom]);

    // GSAP Entrance Animations
    useLayoutEffect(() => {
        if (!loading && template && containerRef.current) {
            const ctx = gsap.context(() => {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

                // Hero
                if (heroRef.current) {
                    gsap.set(heroRef.current, { y: -30, opacity: 0, scale: 0.98 });
                    tl.to(heroRef.current, { y: 0, opacity: 1, scale: 1, duration: 0.6 });
                }

                // Stats Grid
                if (statsGridRef.current) {
                    const cards = statsGridRef.current.children;
                    gsap.set(cards, { y: 40, opacity: 0, scale: 0.9 });
                    tl.to(cards, { 
                        y: 0, 
                        opacity: 1, 
                        scale: 1, 
                        stagger: 0.08, 
                        duration: 0.5,
                        ease: "back.out(1.2)"
                    }, "-=0.3");
                }

                // Accordion
                if (accordionRef.current) {
                    gsap.set(accordionRef.current, { y: 20, opacity: 0 });
                    tl.to(accordionRef.current, { y: 0, opacity: 1, duration: 0.5 }, "-=0.2");
                }

                // CTA
                if (ctaRef.current) {
                    gsap.set(ctaRef.current, { y: 30, opacity: 0, scale: 0.95 });
                    tl.to(ctaRef.current, { y: 0, opacity: 1, scale: 1, duration: 0.5 }, "-=0.2");
                }
            }, containerRef);
            return () => ctx.revert();
        }
    }, [loading, template]);

    // Calculate predicted start time
    const getStartTime = () => {
        if (activeRoom?.scheduledStartTime) {
            let date = activeRoom.scheduledStartTime.toDate();
            const now = new Date();
            if (date < now && template) {
                const intervalMillis = (template.rescheduleInterval || 30) * 60 * 1000;
                const diff = now.getTime() - date.getTime();
                const intervalsPassed = Math.ceil(diff / intervalMillis);
                date = new Date(date.getTime() + (intervalsPassed * intervalMillis));
            }
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (template) {
            const future = new Date(Date.now() + (template.startTimeThreshold * 60000));
            return future.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return "--:--";
    };

    // Slot progress
    const getSlotProgress = () => {
        if (!template) return 0;
        if (!activeRoom) return 0;
        return (activeRoom.currentPlayers / template.maxPlayersPerRoom) * 100;
    };

    const getSlotsRemaining = () => {
        if (!template) return 0;
        if (!activeRoom) return template.maxPlayersPerRoom;
        return template.maxPlayersPerRoom - activeRoom.currentPlayers;
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-background pb-24">
                <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
                    <Skeleton className="w-full h-48 rounded-2xl" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!template) return null;

    const playersPerTeam = template.playersPerTeam || (template.type === 'solo' ? 1 : template.type === 'duo' ? 2 : 4);

    return (
        <div ref={containerRef} className="pb-24">
            {/* Hero Section */}
            <div ref={heroRef} className="max-w-2xl lg:max-w-5xl mx-auto px-4 pt-4 pb-6">
                {/* Back Button */}
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.back()} 
                    className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                </Button>

                {/* Title Area */}
                <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center",
                        isDark 
                            ? "bg-muted/50 border border-border/50"
                            : "bg-primary/10 border border-primary/20"
                    )}>
                        <Users size={20} className={isDark ? "text-foreground" : "text-primary"} />
                        <span className={cn(
                            "text-xs font-bold uppercase mt-0.5",
                            isDark ? "text-foreground" : "text-primary"
                        )}>
                            {template.type}
                        </span>
                    </div>

                    {/* Title & Meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold font-rajdhani text-foreground truncate">
                                {template.name}
                            </h1>
                            {activeRoom && (
                                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs uppercase font-semibold">
                                <Shield size={10} className="mr-1" />
                                {template.format}
                            </Badge>
                            {template.gameName && (
                                <Badge variant="secondary" className="text-xs">
                                    <Swords size={10} className="mr-1" />
                                    {template.gameName}
                                </Badge>
                            )}
                            {activeRoom && (
                                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                    Live Queue
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Timer Display */}
                <div className="mt-6 p-4 rounded-2xl flex items-center justify-between bg-card border border-border">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                        )}>
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Starts At</p>
                            <p className="text-2xl font-bold font-rajdhani">{getStartTime()}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Slots Left</p>
                        <p className="text-2xl font-bold font-rajdhani">
                            {getSlotsRemaining()}<span className="text-sm text-muted-foreground font-normal">/{template.maxPlayersPerRoom}</span>
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                    <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isDark 
                                    ? "bg-foreground/60"
                                    : "bg-primary"
                            )}
                            style={{ width: `${getSlotProgress()}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content - Two Column Layout on Desktop */}
            <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 space-y-6">
                <div className="flex flex-col lg:flex-row lg:gap-8">
                    {/* Left Column - Stats Grid */}
                    <div ref={statsGridRef} className="lg:w-1/2">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Entry Fee */}
                            <div className={cn(
                                "p-4 rounded-xl border bg-card border-border"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Coins size={16} className={cn(
                                        template.entryFee && template.entryFee > 0 
                                            ? "text-yellow-600 dark:text-yellow-400" 
                                            : "text-teal-600 dark:text-teal-400"
                                    )} />
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Entry Fee</span>
                                </div>
                                <p className="text-xl font-bold font-rajdhani">
                                    {(template.entryFee || 0) > 0 ? `₹${template.entryFee}` : "FREE"}
                                </p>
                            </div>

                            {/* Prize Pool */}
                            {template.prizePool && template.prizePool > 0 && (
                                <div className={cn(
                                    "p-4 rounded-xl border bg-card border-border"
                                )}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trophy size={16} className="text-amber-600 dark:text-amber-400" />
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Prize Pool</span>
                                    </div>
                                    <p className={cn("text-xl font-bold font-rajdhani", isDark ? "text-amber-200" : "text-amber-700")}>
                                        ₹{template.prizePool.toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {/* Per Kill */}
                            {template.perKill && template.perKill > 0 && (
                                <div className={cn(
                                    "p-4 rounded-xl border bg-card border-border"
                                )}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={16} className="text-rose-600 dark:text-rose-400" />
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Per Kill</span>
                                    </div>
                                    <p className={cn("text-xl font-bold font-rajdhani", isDark ? "text-rose-200" : "text-rose-700")}>
                                        ₹{template.perKill}
                                    </p>
                                </div>
                            )}

                            {/* Map/Gamemode */}
                            <div className={cn(
                                "p-4 rounded-xl border bg-card border-border"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={16} className="text-purple-600 dark:text-purple-400" />
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Map</span>
                                </div>
                                <p className="text-base font-bold font-rajdhani truncate">
                                    {template.gamemode || "Classic"}
                                </p>
                            </div>

                            {/* Team Size */}
                            <div className={cn(
                                "p-4 rounded-xl border bg-card border-border"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Users size={16} className="text-orange-600 dark:text-orange-400" />
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Team Size</span>
                                </div>
                                <p className="text-xl font-bold font-rajdhani">{playersPerTeam}</p>
                            </div>

                            {/* Format */}
                            <div className={cn(
                                "p-4 rounded-xl border bg-card border-border"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield size={16} className="text-blue-600 dark:text-blue-400" />
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Format</span>
                                </div>
                                <p className="text-base font-bold font-rajdhani capitalize">
                                    {template.format}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Rules & Info Accordion */}
                    <div ref={accordionRef} className="lg:w-1/2 mt-6 lg:mt-0">
                        <Accordion type="single" collapsible defaultValue="rules" className="w-full">
                            <AccordionItem value="rules" className="border rounded-xl overflow-hidden border-border bg-card">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <Info size={16} className="text-primary" />
                                        <span className="font-bold font-rajdhani">Rules & Information</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        {template.rules && template.rules.length > 0 ? (
                                            template.rules.map((rule, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <ChevronRight size={14} className="mt-0.5 text-primary flex-shrink-0" />
                                                    <span>{rule}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <>
                                                <li className="flex items-start gap-2">
                                                    <ChevronRight size={14} className="mt-0.5 text-primary flex-shrink-0" />
                                                    <span>Be online <strong>5 minutes</strong> before scheduled start time.</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <ChevronRight size={14} className="mt-0.5 text-primary flex-shrink-0" />
                                                    <span>Room ID & Password will be shared once the lobby is full or timer ends.</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <ChevronRight size={14} className="mt-0.5 text-primary flex-shrink-0" />
                                                    <span>No teaming with other players. Cheating = permanent ban.</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <ChevronRight size={14} className="mt-0.5 text-primary flex-shrink-0" />
                                                    <span>Results are calculated based on kills and placement.</span>
                                                </li>
                                            </>
                                        )}
                                        {(template.entryFee || 0) > 0 && (
                                            <li className="flex items-start gap-2">
                                                <ChevronRight size={14} className="mt-0.5 text-primary flex-shrink-0" />
                                                <span>Entry fee of <strong>₹{template.entryFee}</strong> will be deducted from your wallet upon registration.</span>
                                            </li>
                                        )}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>

                            {template.description && (
                                <AccordionItem value="description" className="border rounded-xl overflow-hidden mt-3 border-border bg-card">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-purple-500" />
                                            <span className="font-bold font-rajdhani">Description</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {template.description}
                                        </p>
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>
                    </div>
                </div>

                {/* CTA Button */}
                <div ref={ctaRef} className="pb-6">
                    {isRegistered ? (
                        <Button
                            size="lg"
                            className={cn(
                                "w-full h-14 text-base font-bold gap-3 rounded-xl",
                                "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default"
                            )}
                            disabled
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Already Registered
                        </Button>
                    ) : isQueued ? (
                        <Button
                            size="lg"
                            className={cn(
                                "w-full h-14 text-base font-bold gap-3 rounded-xl",
                                "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 cursor-default"
                            )}
                            disabled
                        >
                            <Clock className="w-5 h-5" />
                            Queued for Next Match
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            className={cn(
                                "w-full h-14 text-base font-bold gap-3 rounded-xl border-0",
                                isDark 
                                    ? "bg-foreground text-background hover:bg-foreground/90"
                                    : "bg-primary text-white hover:bg-primary/90"
                            )}
                            onClick={() => router.push(`/tournaments/${templateId}/register`)}
                        >
                            <Zap className="w-5 h-5" fill="currentColor" />
                            Register Now {(template.entryFee || 0) > 0 ? `• ₹${template.entryFee}` : "• Free"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
