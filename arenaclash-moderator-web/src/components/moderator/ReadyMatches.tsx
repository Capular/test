"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Gamepad2, Users, Trophy, Coins, PlayCircle, Clock, CheckCircle2, Eye } from "lucide-react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import GsapPing from "@/components/ui/GsapPing";
import usePageReveal from "@/hooks/usePageReveal";
import { cn } from "@/lib/utils";

interface Tournament {
    id: string;
    game: string;
    title: string;
    map: string;
    entryFee: number;
    prizePool: number;
    perKill: number;
    date: string;
    time: string;
    maxPlayers: number;
    currentPlayers: number;
    roomId?: string;
    roomPassword?: string;
    status: 'upcoming' | 'ready' | 'live' | 'completed' | 'locked';
    type: 'scrim' | 'championship';
}

export default function ReadyMatches() {
    const [viewMode, setViewMode] = useState<'to_host' | 'concluded'>('to_host');
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const containerRef = usePageReveal();

    useEffect(() => {
        setLoading(true);
        // Real-time listener - query based on viewMode
        const statusFilter = viewMode === 'to_host'
            ? ["upcoming", "ready", "locked", "open"]
            : ["live", "calculating"];

        const q = query(
            collection(db, "tournaments"),
            where("status", "in", statusFilter)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Tournament))
                // Sort by date/time
                .sort((a, b) => {
                    const dateA = new Date(a.date + ' ' + a.time).getTime();
                    const dateB = new Date(b.date + ' ' + b.time).getTime();
                    return viewMode === 'concluded' ? dateB - dateA : dateA - dateB;
                });

            setTournaments(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tournaments:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [viewMode]);

    useEffect(() => {
        if (listRef.current && tournaments.length > 0) {
            gsap.fromTo(
                listRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }
            );
        }
    }, [tournaments]);

    const handleHost = (tournamentId: string) => {
        router.push(`/moderator/hosting/${tournamentId}`);
    };

    return (
        <div ref={containerRef} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-rajdhani text-foreground">Match Queue</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {viewMode === 'to_host' ? 'Matches ready to be hosted' : 'Ongoing and completed matches'}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <GsapPing color="bg-emerald-500" size="sm" />
                    <span className="text-xs font-semibold text-emerald-500">{tournaments.length} {viewMode === 'to_host' ? 'Ready' : 'Ongoing'}</span>
                </div>
            </div>

            {/* Tab Switcher - Dashboard Style */}
            <div className="flex justify-center px-2">
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-1 border border-border/50 flex flex-wrap justify-center gap-1 w-full max-w-fit">
                    {[
                        { id: 'to_host', label: 'To Host', icon: PlayCircle, color: 'primary' },
                        { id: 'concluded', label: 'Ongoing', icon: Eye, color: 'yellow' }
                    ].map((tab) => {
                        const isActive = viewMode === tab.id;
                        const colorClass = tab.color === 'primary'
                            ? 'text-primary bg-primary/10'
                            : 'text-yellow-500 bg-yellow-500/10';
                        const inactiveHover = tab.color === 'primary'
                            ? 'hover:text-primary/80'
                            : 'hover:text-yellow-400';

                        return (
                            <button
                                key={tab.id}
                                ref={(el) => {
                                    if (el && isActive) {
                                        gsap.fromTo(el,
                                            { scale: 0.95 },
                                            { scale: 1, duration: 0.2, ease: "back.out(1.7)" }
                                        );
                                    }
                                }}
                                onClick={() => setViewMode(tab.id as typeof viewMode)}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 min-w-0 flex-shrink-0",
                                    isActive
                                        ? colorClass
                                        : `text-muted-foreground ${inactiveHover} hover:bg-muted/50`
                                )}
                            >
                                <tab.icon className={cn("w-4 h-4 sm:w-[18px] sm:h-[18px] flex-shrink-0", isActive && (tab.color === 'primary' ? 'text-primary' : 'text-yellow-500'))} />
                                <span className="font-rajdhani whitespace-nowrap hidden sm:inline">{tab.label}</span>
                                <span className="font-rajdhani whitespace-nowrap sm:hidden">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <GsapLoaderInline size="lg" />
                </div>
            ) : tournaments.length === 0 ? (
                <div className="text-center py-20">
                    {viewMode === 'to_host' ? (
                        <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    ) : (
                        <Eye className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    )}
                    <h3 className="text-lg font-semibold text-muted-foreground">
                        {viewMode === 'to_host' ? 'No Matches to Host' : 'No Live Matches'}
                    </h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                        {viewMode === 'to_host'
                            ? 'Matches will appear here when ready to be hosted'
                            : 'Matches currently live or awaiting stats will appear here'}
                    </p>
                </div>
            ) : (
                <div ref={listRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tournaments.map((t) => (
                        <div
                            key={t.id}
                            className="group relative bg-card border border-border/50 rounded-xl p-5 hover:border-emerald-500/50 transition-all duration-300"
                        >
                            {/* Status Badge */}
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${t.type === 'championship'
                                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                                    : 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                                    }`}>
                                    {t.type === 'championship' ? '🏆' : '⚔️'}
                                </span>
                            </div>

                            {/* Game Icon */}
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                <Gamepad2 className="w-6 h-6 text-primary" />
                            </div>

                            {/* Title & Game */}
                            <h3 className="font-bold text-lg text-foreground font-rajdhani mb-1">{t.title || t.game}</h3>
                            <p className="text-xs text-muted-foreground mb-4">{t.game} • {t.map}</p>

                            {/* Stats Row */}
                            <div className="flex items-center gap-4 mb-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <span className="font-semibold text-yellow-400">₹{t.prizePool}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-foreground">{t.currentPlayers}/{t.maxPlayers}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Coins className="w-4 h-4 text-emerald-500" />
                                    <span className="text-muted-foreground">₹{t.perKill}/kill</span>
                                </div>
                            </div>

                            {/* Schedule */}
                            <div className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                {t.date} at {t.time}
                            </div>

                            {/* Action Button */}
                            {viewMode === 'to_host' ? (
                                <button
                                    onClick={() => handleHost(t.id)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors font-rajdhani"
                                >
                                    <PlayCircle className="w-4 h-4" />
                                    Host Now
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleHost(t.id)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500/20 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500/30 transition-colors font-rajdhani border border-yellow-500/30"
                                >
                                    <Eye className="w-4 h-4" />
                                    Manage Match
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
