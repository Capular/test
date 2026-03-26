"use client";

import { useState, useRef, useEffect } from "react";
import { doc, collection, writeBatch, increment, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Trophy, Coins, ArrowLeft, CheckCircle2, AlertCircle, Medal } from "lucide-react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Tournament {
    id: string;
    game: string;
    title: string;
    prizePool: number;
    perKill: number;
    maxPlayers: number;
    rankPrizes?: { rank: number, amount: number }[]; // Added rankPrizes support
    totalRounds?: number;
}

interface Participant {
    odId: string;
    displayName: string;
    email: string;
    ingameName: string;
    joinedAt: any;
    feePaid: number;
}

interface PlayerStats {
    odId: string;
    kills: number;
    placement: number;
    earnings: number;
}

interface StatsEntryProps {
    tournament: Tournament;
    participants: Participant[];
    onBack: () => void;
}

// Prize distribution based on placement (top 3 get fixed percentages)
const PLACEMENT_PRIZES: Record<number, number> = {
    1: 0.50, // 50% of prize pool
    2: 0.30, // 30% of prize pool
    3: 0.20, // 20% of prize pool
};

export default function StatsEntry({ tournament, participants, onBack }: StatsEntryProps) {
    const [stats, setStats] = useState<PlayerStats[]>(
        participants.map(p => ({
            odId: p.odId,
            kills: 0,
            placement: 0,
            earnings: 0
        }))
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (listRef.current) {
            gsap.fromTo(
                listRef.current.children,
                { y: 10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: "power2.out" }
            );
        }
    }, []);

    const updateStat = (odId: string, field: 'kills' | 'placement', value: number) => {
        setStats(prev => prev.map(s => {
            if (s.odId !== odId) return s;

            const updated = { ...s, [field]: value };

            // Calculate earnings
            let earnings = updated.kills * tournament.perKill;

            // Add placement prize (Dynamic Rank Logic)
            if (updated.placement > 0) {
                if (tournament.rankPrizes && tournament.rankPrizes.length > 0) {
                    // New System: Check exact rank match
                    const prize = tournament.rankPrizes.find(p => p.rank === updated.placement);
                    if (prize) {
                        earnings += prize.amount;
                    }
                } else {
                    // LEGACY FALLBACK: Top 3 Percentage for old tournaments
                    const PLACEMENT_PRIZES: Record<number, number> = {
                        1: 0.50,
                        2: 0.30,
                        3: 0.20,
                    };
                    if (updated.placement >= 1 && updated.placement <= 3) {
                        earnings += tournament.prizePool * (PLACEMENT_PRIZES[updated.placement] || 0);
                    }
                }
            }

            updated.earnings = Math.round(earnings);
            return updated;
        }));
    };

    const totalEarnings = stats.reduce((sum, s) => sum + s.earnings, 0);

    const handleSubmit = async () => {
        // Validate placements
        const placements = stats.filter(s => s.placement > 0).map(s => s.placement);
        const uniquePlacements = new Set(placements);
        if (placements.length !== uniquePlacements.size) {
            setError("Duplicate placements found. Each player must have a unique placement.");
            return;
        }

        // Validate Total Kills
        const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
        const maxKills = (participants.length - 1) * (tournament.totalRounds || 1);

        if (totalKills > maxKills) {
            setError(`Total kills (${totalKills}) cannot exceed (Total Players - 1) x Rounds (${maxKills}). Please check for errors.`);
            return;
        }

        // REMOVED: Mandatory Top 3 check.
        // We now allow any number of placements, as per user request.

        setLoading(true);
        setError(null);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            // 1. Trigger Calculation Mode (and Queue Processing)
            // We call this first to ensure queue is processed even if completion fails or takes time
            const calcRes = await fetch("/api/matches/start-calculation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tournamentId: tournament.id, userId: user.uid })
            });

            if (!calcRes.ok) {
                const data = await calcRes.json();
                throw new Error(data.error || "Failed to start calculation phase");
            }

            // 2. Submit Final Results
            const completeRes = await fetch("/api/matches/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tournamentId: tournament.id,
                    stats: stats,
                    userId: user.uid
                })
            });

            if (!completeRes.ok) {
                const data = await completeRes.json();
                throw new Error(data.error || "Failed to submit results");
            }

            // Success - redirect to completed
            router.push("/moderator/completed");
        } catch (err: any) {
            console.error("Error submitting results:", err);
            setError(err.message || "Failed to submit results");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold font-rajdhani text-foreground">Enter Match Results</h1>
                    <p className="text-sm text-muted-foreground mt-1">{tournament.title} • {participants.length} players</p>
                </div>
            </div>

            {/* Prize Distribution Info */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <h3 className="font-bold text-yellow-500 flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4" />
                    Prize Distribution
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Medal className="w-4 h-4 text-yellow-400" />
                        <span className="text-muted-foreground">1st:</span>
                        <span className="font-bold text-yellow-400">₹{Math.round(tournament.prizePool * 0.5)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Medal className="w-4 h-4 text-gray-300" />
                        <span className="text-muted-foreground">2nd:</span>
                        <span className="font-bold text-gray-300">₹{Math.round(tournament.prizePool * 0.3)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Medal className="w-4 h-4 text-amber-600" />
                        <span className="text-muted-foreground">3rd:</span>
                        <span className="font-bold text-amber-600">₹{Math.round(tournament.prizePool * 0.2)}</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">+ ₹{tournament.perKill} per kill for all players</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Stats Entry Table */}
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Player</div>
                    <div className="col-span-2 text-center">Kills</div>
                    <div className="col-span-2 text-center">Placement</div>
                    <div className="col-span-3 text-right">Earnings</div>
                </div>

                <div ref={listRef} className="divide-y divide-border/30 max-h-[450px] overflow-y-auto custom-scrollbar">
                    {participants.map((p, index) => {
                        const stat = stats.find(s => s.odId === p.odId);
                        const earnings = stat?.earnings || 0;
                        const placement = stat?.placement || 0;

                        return (
                            <div
                                key={p.odId}
                                className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${placement === 1 ? 'bg-yellow-500/5' :
                                    placement === 2 ? 'bg-gray-500/5' :
                                        placement === 3 ? 'bg-amber-500/5' : ''
                                    }`}
                            >
                                <div className="col-span-1">
                                    <span className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                        {index + 1}
                                    </span>
                                </div>
                                <div className="col-span-4">
                                    <p className="font-semibold text-foreground text-sm truncate">{p.ingameName || p.displayName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={stat?.kills || ''}
                                        onChange={(e) => updateStat(p.odId, 'kills', parseInt(e.target.value) || 0)}
                                        className="text-center bg-muted/30 border-border/50 h-9"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={participants.length}
                                        placeholder="#"
                                        value={stat?.placement || ''}
                                        onChange={(e) => updateStat(p.odId, 'placement', parseInt(e.target.value) || 0)}
                                        className={`text-center h-9 ${
                                            // Check for duplicates
                                            stat && stat.placement > 0 && stats.filter(s => s.placement === stat.placement).length > 1
                                                ? "border-red-500 bg-red-500/10 text-red-500 focus-visible:ring-red-500"
                                                : "bg-muted/30 border-border/50"
                                            }`}
                                    />
                                </div>
                                <div className="col-span-3 text-right">
                                    <span className={`font-bold ${earnings > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                        {earnings > 0 ? `₹${earnings}` : '—'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary & Submit */}
            <div className="flex items-center justify-between bg-card border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">Total Kills:</span>
                        <span className={`text-sm font-bold ${stats.reduce((s, x) => s + x.kills, 0) > participants.length ? 'text-red-500' : 'text-foreground'}`}>
                            {stats.reduce((s, x) => s + x.kills, 0)} / {participants.length}
                        </span>
                    </div>
                    <div className="h-4 w-[1px] bg-border/50" />
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-500" />
                        <span className="text-muted-foreground">Total Distribution:</span>
                        <span className="text-xl font-bold text-emerald-400">₹{totalEarnings}</span>
                    </div>
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6"
                >
                    {loading ? (
                        <GsapLoaderInline size="sm" className="mr-2" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {loading ? "Submitting..." : "Submit Results & Distribute Prizes"}
                </Button>
            </div>
        </div>
    );
}
