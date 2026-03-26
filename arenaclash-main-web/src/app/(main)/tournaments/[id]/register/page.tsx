"use client";
export const runtime = 'edge';

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { ArrowLeft, Users, Shield, Clock, User, Lock, CheckCircle2, UserPlus, Trophy, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import gsap from "gsap";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TeamSlot {
    slotId: string;
    locked: boolean;
    players: {
        userId: string;
        userName: string;
        userAvatar?: string;
        joinedAt: any;
    }[];
}

// Individual Team Card with GSAP Hover - Grayscale Theme
function TeamCard({
    slot,
    maxPlayers,
    isMyTeam,
    isFull,
    onClick
}: {
    slot: TeamSlot;
    maxPlayers: number;
    isMyTeam: boolean;
    isFull: boolean;
    onClick: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const playCount = slot.players.length;
    const fillPercent = (playCount / maxPlayers) * 100;

    // GSAP entrance animation for progress bar
    useEffect(() => {
        if (progressBarRef.current) {
            gsap.fromTo(progressBarRef.current,
                { width: 0 },
                { width: `${fillPercent}%`, duration: 0.8, ease: "power2.out", delay: 0.2 }
            );
        }
    }, [fillPercent]);

    const handleMouseEnter = useCallback(() => {
        if (!cardRef.current) return;

        // Card hover animation - don't animate borderColor to preserve status colors
        gsap.to(cardRef.current, {
            scale: isFull ? 1 : 1.02,
            y: isFull ? 0 : -6,
            boxShadow: isFull ? "0 8px 30px -8px rgba(0, 0, 0, 0.2)" : "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            backgroundColor: isFull ? "rgba(24, 24, 27, 0.8)" : "rgba(39, 39, 42, 0.9)",
            duration: 0.3,
            ease: "power2.out",
            force3D: true
        });

        // Footer text animation
        if (footerRef.current && !isFull && !isMyTeam) {
            gsap.to(footerRef.current, {
                color: "rgba(255, 255, 255, 0.7)",
                duration: 0.25,
                ease: "power2.out"
            });
        }
    }, [isFull, isMyTeam]);

    const handleMouseLeave = useCallback(() => {
        if (!cardRef.current) return;

        // Reset card - don't animate borderColor to preserve status colors
        gsap.to(cardRef.current, {
            scale: 1,
            y: 0,
            boxShadow: "0 8px 30px -8px rgba(0, 0, 0, 0.2)",
            backgroundColor: "rgba(24, 24, 27, 0.8)",
            duration: 0.3,
            ease: "power2.out",
            force3D: true
        });

        // Reset footer text
        if (footerRef.current) {
            gsap.to(footerRef.current, {
                color: "rgba(255, 255, 255, 0.4)",
                duration: 0.25,
                ease: "power2.out"
            });
        }
    }, []);

    // Status badge - colored indicators
    let statusText = "Open";
    let statusStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

    if (isMyTeam) {
        statusText = "Your Team";
        statusStyle = "bg-blue-500/15 text-blue-400 border-blue-500/30";
    } else if (isFull) {
        statusText = "Full";
        statusStyle = "bg-red-500/10 text-red-400/70 border-red-500/20";
    } else if (playCount > 0) {
        statusText = `${playCount}/${maxPlayers}`;
        statusStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
    // Border color based on status
    let borderColor = "border-emerald-500/30"; // Open
    if (isMyTeam) {
        borderColor = "border-blue-500/40 ring-1 ring-blue-500/20";
    } else if (isFull) {
        borderColor = "border-red-500/20";
    } else if (playCount > 0) {
        borderColor = "border-amber-500/30";
    }

    return (
        <Card
            ref={cardRef}
            onClick={() => !isFull && onClick()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "group relative overflow-hidden",
                "bg-zinc-900/80 backdrop-blur-md",
                borderColor,
                isFull && "opacity-40 cursor-not-allowed",
                !isFull && "cursor-pointer"
            )}
            style={{
                willChange: "transform, box-shadow, background-color",
                boxShadow: "0 8px 30px -8px rgba(0, 0, 0, 0.2)"
            }}
        >
            {/* Header - Compact for PC */}
            <div className="p-3 sm:p-4 pb-2 sm:pb-3">
                <div className="flex items-center justify-between gap-3">
                    {/* Team Info */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center",
                            "bg-white/[0.04] border border-white/[0.08]",
                            "font-bold font-rajdhani text-lg sm:text-xl text-white/80"
                        )}>
                            {slot.slotId}
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold font-rajdhani text-white tracking-wide">
                                Team {slot.slotId}
                            </h3>
                            <p className="text-xs text-white/40">
                                {playCount} of {maxPlayers} players
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-md",
                            statusStyle
                        )}
                    >
                        {statusText}
                    </Badge>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mx-3 sm:mx-4 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                    ref={progressBarRef}
                    className="h-full bg-white/30 rounded-full"
                    style={{ width: 0 }}
                />
            </div>

            {/* Player Slots - Compact */}
            <div className="p-3 sm:p-4 pt-3 space-y-2">
                {slot.players.map((player) => (
                    <div
                        key={player.userId}
                        className="flex items-center gap-3 bg-white/[0.03] rounded-lg p-2 sm:p-2.5 border border-white/[0.04]"
                    >
                        <Avatar className="w-8 h-8 sm:w-9 sm:h-9 ring-1 ring-white/10">
                            <AvatarImage src={player.userAvatar} />
                            <AvatarFallback className="text-xs font-semibold bg-white/10 text-white/70">
                                {player.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs sm:text-sm font-medium text-white/80 truncate flex-1">
                            {player.userName}
                        </span>
                        <div className="w-2 h-2 rounded-full bg-white/40" />
                    </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: maxPlayers - playCount }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="flex items-center gap-3 rounded-lg p-2 sm:p-2.5 border border-dashed border-white/[0.08] bg-white/[0.01]"
                    >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.04] flex items-center justify-center">
                            <User className="w-4 h-4 text-white/20" />
                        </div>
                        <span className="text-xs text-white/25">
                            Waiting for player...
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer - Compact */}
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex items-center justify-end">
                {isFull ? (
                    <div className="flex items-center gap-1.5 text-white/30">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Team Locked</span>
                    </div>
                ) : !isMyTeam && (
                    <div
                        ref={footerRef}
                        className="flex items-center gap-1.5"
                        style={{ color: "rgba(255, 255, 255, 0.4)" }}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Click to Join</span>
                    </div>
                )}
            </div>
        </Card>
    );
}

// Skeleton Card for Loading - Grayscale Theme
function TeamCardSkeleton() {
    return (
        <Card className="overflow-hidden bg-zinc-900/80 border-white/[0.06]">
            <div className="p-5 sm:p-6 pb-4 sm:pb-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/[0.04]" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-28 bg-white/[0.04]" />
                            <Skeleton className="h-4 w-24 bg-white/[0.04]" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg bg-white/[0.04]" />
                </div>
            </div>
            <div className="mx-5 sm:mx-6 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <Skeleton className="h-full w-1/3 bg-white/[0.08]" />
            </div>
            <div className="p-5 sm:p-6 pt-5 space-y-3">
                <Skeleton className="h-16 sm:h-[72px] w-full rounded-xl bg-white/[0.04]" />
                <Skeleton className="h-16 sm:h-[72px] w-full rounded-xl bg-white/[0.03]" />
                <Skeleton className="h-16 sm:h-[72px] w-full rounded-xl bg-white/[0.02]" />
            </div>
        </Card>
    );
}

export default function TournamentRegisterPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: templateId } = use(params);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [template, setTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [teamSlots, setTeamSlots] = useState<TeamSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);
    const [ign, setIgn] = useState("");

    // GSAP Refs
    const headerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);

    // Load cached IGN
    useEffect(() => {
        const cachedIgn = localStorage.getItem("arena_ign");
        if (cachedIgn) setIgn(cachedIgn);
    }, []);

    // Fetch Template Data
    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const docRef = doc(db, "templates", templateId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setTemplate({ id: snap.id, ...snap.data() });
                } else {
                    toast.error("Template not found");
                    router.push("/tournaments");
                }
            } catch (error) {
                console.error("Error fetching template:", error);
                toast.error("Failed to load tournament");
            } finally {
                setLoading(false);
            }
        };
        fetchTemplate();
    }, [templateId, router]);

    // Listen to Active Room
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, "tournaments"),
            where("templateId", "==", templateId),
            where("status", "==", "open"),
            orderBy("createdAt", "asc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setActiveRoomId(snapshot.docs[0].id);
            } else {
                setActiveRoomId(null);
            }
        });
        return () => unsubscribe();
    }, [templateId]);

    // Fetch Slots for Active Room
    useEffect(() => {
        if (!activeRoomId) {
            if (template) {
                const initialSlots = Array.from({ length: template.teamsPerRoom || 25 }, (_, i) => ({
                    slotId: (i + 1).toString(),
                    locked: false,
                    players: []
                }));
                setTeamSlots(initialSlots);
            }
            return;
        }

        const q = collection(db, `tournaments/${activeRoomId}/teams`);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const slotsData: Record<string, TeamSlot> = {};
            snapshot.docs.forEach(doc => {
                slotsData[doc.id] = { slotId: doc.id, ...doc.data() } as TeamSlot;
            });

            const mergedSlots = Array.from({ length: template?.teamsPerRoom || 25 }, (_, i) => {
                const id = (i + 1).toString();
                return slotsData[id] || { slotId: id, locked: false, players: [] };
            });
            setTeamSlots(mergedSlots);
        });

        return () => unsubscribe();
    }, [activeRoomId, template]);

    // GSAP Entrance Animations
    useEffect(() => {
        if (!loading && template) {
            const ctx = gsap.context(() => {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

                // Header
                if (headerRef.current) {
                    gsap.set(headerRef.current, { y: -30, opacity: 0, filter: "blur(8px)" });
                    tl.to(headerRef.current, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.6 });
                }

                // Stats Cards
                if (statsRef.current) {
                    gsap.set(statsRef.current.children, { y: 20, opacity: 0, scale: 0.9 });
                    tl.to(statsRef.current.children, { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.4, force3D: true }, "-=0.3");
                }

                // Grid Cards
                if (gridRef.current) {
                    gsap.set(gridRef.current.children, { y: 40, opacity: 0, scale: 0.85 });
                    tl.to(gridRef.current.children, { y: 0, opacity: 1, scale: 1, stagger: 0.03, duration: 0.5, ease: "back.out(1.4)", force3D: true }, "-=0.2");
                }
            });

            return () => ctx.revert();
        }
    }, [loading, template, teamSlots.length]);

    const handleSlotClick = (slotId: string) => {
        const slot = teamSlots.find(s => s.slotId === slotId);
        if (!slot) return;

        if (slot.players.length >= (template.playersPerTeam || 4)) return;

        if (user && slot.players.some(p => p.userId === user.uid)) {
            toast.info("You are already in this team!");
            return;
        }

        setSelectedSlot(slotId);
        setIsConfirmOpen(true);
    };

    const handleJoin = async () => {
        if (!user || !selectedSlot) return;
        if (!ign.trim()) {
            toast.error("Please enter your In-Game Name");
            return;
        }

        // Cache IGN
        localStorage.setItem("arena_ign", ign.trim());

        setJoinLoading(true);
        try {
            const res = await fetch("/api/matchmaking/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    userName: user.displayName || "Unknown",
                    userAvatar: user.photoURL || "",
                    templateId: templateId,
                    ingameName: ign.trim(),
                    teamSlotId: selectedSlot
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to join");

            if (data.queued) {
                toast.info("Match in progress. You have been queued for the next game!");
            } else {
                toast.success(`Joined Team ${selectedSlot} successfully!`);
            }
            router.push("/tournaments");
        } catch (error: any) {
            toast.error(error.message);
        }
        setJoinLoading(false);
        setIsConfirmOpen(false);
    };

    // Skeleton Loading State
    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 p-3 sm:p-4">
                    <div className="max-w-7xl mx-auto flex items-center gap-3">
                        <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                            <Skeleton className="h-4 sm:h-5 w-32 sm:w-48" />
                            <Skeleton className="h-3 w-24 sm:w-32" />
                        </div>
                        <Skeleton className="h-7 sm:h-8 w-16 sm:w-20 shrink-0" />
                    </div>
                </div>
                <div className="max-w-7xl mx-auto p-3 sm:p-6">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <Skeleton className="h-16 sm:h-20 rounded-lg sm:rounded-xl" />
                        <Skeleton className="h-16 sm:h-20 rounded-lg sm:rounded-xl" />
                        <Skeleton className="h-16 sm:h-20 rounded-lg sm:rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <TeamCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!template) return null;

    const maxPlayers = template.playersPerTeam || 4;
    const totalSlots = teamSlots.length;
    const filledSlots = teamSlots.filter(s => s.players.length > 0).length;
    const fullSlots = teamSlots.filter(s => s.players.length >= maxPlayers).length;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div ref={headerRef} className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 p-3 sm:p-4 shadow-sm" style={{ willChange: "transform, opacity, filter" }}>
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-muted w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-bold font-rajdhani flex items-center gap-1.5 sm:gap-2 truncate">
                                <span className="truncate">{template.name}</span>
                                <Badge variant="secondary" className="text-[8px] sm:text-[10px] uppercase shrink-0">{template.type}</Badge>
                            </h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-2 sm:gap-3">
                                <span className="flex items-center gap-1"><Shield size={10} className="sm:hidden" /><Shield size={12} className="hidden sm:block" /> {template.format}</span>
                                <span className="flex items-center gap-1"><Clock size={10} className="sm:hidden" /><Clock size={12} className="hidden sm:block" /> {template.startTimeThreshold}m</span>
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        {template.entryFee > 0 ? (
                            <div className="text-right">
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-bold">Entry</p>
                                <p className="text-sm sm:text-lg font-bold text-yellow-500">₹{template.entryFee}</p>
                            </div>
                        ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-bold text-[10px] sm:text-xs">FREE</Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-3 sm:p-6">
                {/* Quick Stats */}
                <div ref={statsRef} className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <Card className="bg-card border-border">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Teams</p>
                                <p className="text-sm sm:text-lg font-bold font-rajdhani">{filledSlots}/{totalSlots}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Open</p>
                                <p className="text-sm sm:text-lg font-bold font-rajdhani text-emerald-500">{totalSlots - fullSlots}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Per Team</p>
                                <p className="text-sm sm:text-lg font-bold font-rajdhani">{maxPlayers}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section Title */}
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-between gap-3">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-3 font-rajdhani text-white">
                        <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" /> Select Your Team
                    </h2>
                    <div className="flex items-center flex-wrap justify-center gap-4 sm:gap-5 text-xs sm:text-sm font-medium text-white/70">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500" />Open</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500" />Partial</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />Full</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-500" />Mine</div>
                    </div>
                </div>

                {/* Team Grid - Larger cards with fewer columns */}
                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {teamSlots.map((slot) => {
                        const isFull = slot.players.length >= maxPlayers;
                        const isMyTeam = user && slot.players.some(p => p.userId === user.uid);

                        return (
                            <TeamCard
                                key={slot.slotId}
                                slot={slot}
                                maxPlayers={maxPlayers}
                                isMyTeam={!!isMyTeam}
                                isFull={isFull}
                                onClick={() => handleSlotClick(slot.slotId)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-rajdhani flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            Join Team {selectedSlot}
                        </DialogTitle>
                        <DialogDescription className="space-y-1">
                            Confirm your spot in Team {selectedSlot}.
                            {template.entryFee > 0 && (
                                <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                                    Entry: ₹{template.entryFee}
                                </Badge>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="ign">In-Game Name (IGN)</Label>
                            <Input
                                id="ign"
                                value={ign}
                                onChange={(e) => setIgn(e.target.value)}
                                placeholder="Enter your in-game name..."
                                className="bg-muted/30"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={handleJoin} disabled={joinLoading || !ign} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                            {joinLoading ? <GsapLoaderInline size="sm" className="mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                            Confirm & Join
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
