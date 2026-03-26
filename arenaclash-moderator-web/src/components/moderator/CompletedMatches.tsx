"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Gamepad2, Users, Trophy, CheckCircle2, Clock, Calendar } from "lucide-react";
import gsap from "gsap";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import usePageReveal from "@/hooks/usePageReveal";

interface Tournament {
    id: string;
    game: string;
    title: string;
    map: string;
    prizePool: number;
    perKill: number;
    date: string;
    time: string;
    maxPlayers: number;
    currentPlayers: number;
    status: string;
    type: 'scrim' | 'championship';
    completedAt?: any;
}

export default function CompletedMatches() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);
    const containerRef = usePageReveal();

    useEffect(() => {
        const fetchCompleted = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "tournaments"),
                    where("status", "==", "completed"),
                    orderBy("completedAt", "desc")
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
                setTournaments(data);
            } catch (error) {
                console.error("Error fetching completed tournaments:", error);
                // Fallback query without ordering
                try {
                    const q = query(
                        collection(db, "tournaments"),
                        where("status", "==", "completed")
                    );
                    const snapshot = await getDocs(q);
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
                    setTournaments(data);
                } catch (e) {
                    console.error("Fallback query failed:", e);
                }
            }
            setLoading(false);
        };

        fetchCompleted();
    }, []);

    useEffect(() => {
        if (listRef.current && tournaments.length > 0) {
            gsap.fromTo(
                listRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }
            );
        }
    }, [tournaments]);

    return (
        <div ref={containerRef} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-rajdhani text-foreground">Completed Matches</h1>
                    <p className="text-sm text-muted-foreground mt-1">History of all hosted tournaments</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full border border-border/50">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">{tournaments.length} Total</span>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <GsapLoaderInline size="lg" />
                </div>
            ) : tournaments.length === 0 ? (
                <div className="text-center py-20">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">No Completed Matches</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">Completed tournaments will appear here</p>
                </div>
            ) : (
                <div ref={listRef} className="space-y-3">
                    {tournaments.map((t) => (
                        <div
                            key={t.id}
                            className="bg-card border border-border/50 rounded-xl p-5 hover:border-border transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center">
                                        <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-foreground font-rajdhani">{t.title || t.game}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.type === 'championship'
                                                    ? 'bg-yellow-500/10 text-yellow-500'
                                                    : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {t.type === 'championship' ? '🏆' : '⚔️'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{t.game} • {t.map}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden md:block">
                                        <div className="flex items-center gap-1.5 text-yellow-400">
                                            <Trophy className="w-4 h-4" />
                                            <span className="font-bold">₹{t.prizePool}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Prize Pool</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="flex items-center gap-1.5 text-foreground">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-semibold">{t.currentPlayers}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Players</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-sm">{t.date}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{t.time}</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-semibold text-emerald-500">Completed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
