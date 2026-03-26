"use client";

import { useState, useEffect, useRef } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Trash2, Gamepad2, X, Swords, Trophy, Sparkles, MapPin, Search, Users, UserX, AlertTriangle } from "lucide-react";
import gsap from "gsap";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/components/auth/AuthProvider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    status: 'upcoming' | 'live' | 'completed' | 'open' | 'ongoing'; // Normalized status
    type: 'scrim' | 'championship' | 'special';
}

export default function AdminTournaments() {
    // View State
    const [viewMode, setViewMode] = useState<'scrims' | 'tournaments'>('tournaments');
    const [selectedGame, setSelectedGame] = useState<string | null>(null);

    // Data State
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
    const [gamesList, setGamesList] = useState<string[]>([]);

    // Form & Loading State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const listRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        game: '',
        title: '',
        map: 'Bermuda',
        entryFee: 0,
        prizePool: 0,
        perKill: 0,
        date: '',
        time: '',
        maxPlayers: 100,
        roomId: '',
        roomPassword: '',
        type: 'championship' as 'scrim' | 'championship' | 'special'
    });

    // Fetch games for dropdown & tabs
    useEffect(() => {
        const fetchGames = async () => {
            const q = query(collection(db, "games"), where("isActive", "==", true));
            const snapshot = await getDocs(q);
            const games = snapshot.docs.map(doc => doc.data().name);
            setGamesList(games);
            if (games.length > 0) {
                setGamesList(games);
                if (!selectedGame) setSelectedGame(games[0]);
                if (!formData.game) setFormData(prev => ({ ...prev, game: games[0] }));
            }
        };
        fetchGames();
    }, []);

    // Fetch Tournaments
    const fetchTournaments = async () => {
        setIsLoading(true);
        try {
            // Remove ordering to avoid index issues for now, or ensure index exists.
            // Client-side sorting is safer for small datasets initially.
            const colRef = collection(db, "tournaments");
            const snapshot = await getDocs(colRef);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));

            // Client-side sort
            data.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());

            setTournaments(data);
        } catch (error) {
            console.error("Error fetching tournaments:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = tournaments;

        // 1. Filter by Game (if selected)
        if (selectedGame) {
            result = result.filter(t => t.game === selectedGame);
        }

        // 2. Filter by View Mode (Scrims vs Tournaments)
        if (viewMode === 'scrims') {
            result = result.filter(t => t.type === 'scrim');
        } else {
            result = result.filter(t => t.type === 'championship' || t.type === 'special');
        }

        // 3. Search Query
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.title && t.title.toLowerCase().includes(lowerQuery)) ||
                (t.id && t.id.toLowerCase().includes(lowerQuery)) ||
                (t.map && t.map.toLowerCase().includes(lowerQuery))
            );
        }

        setFilteredTournaments(result);
    }, [tournaments, viewMode, selectedGame, searchQuery]);

    // Animations
    useEffect(() => {
        if (listRef.current && filteredTournaments.length > 0) {
            gsap.fromTo(
                listRef.current.children,
                { y: 15, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: "power2.out", clearProps: "all" }
            );
        }
    }, [filteredTournaments]);

    useEffect(() => {
        if (isFormOpen) {
            gsap.fromTo(
                ".admin-modal",
                { scale: 0.95, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.2, ease: "power2.out" }
            );
        }
    }, [isFormOpen]);

    // Player Management State
    const { user } = useAuth();
    const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [isPlayersLoading, setIsPlayersLoading] = useState(false);
    const [kickingId, setKickingId] = useState<string | null>(null);

    const openPlayerDialog = async (t: Tournament) => {
        setSelectedTournament(t);
        setIsPlayerDialogOpen(true);
        setIsPlayersLoading(true);
        setPlayers([]);

        try {
            // Fetch players from both collections to be safe
            const playersRef = collection(db, "tournaments", t.id, "players");
            const snapshot = await getDocs(playersRef);

            // Try participants if players is empty (legacy support)
            if (snapshot.empty) {
                const partsRef = collection(db, "tournaments", t.id, "participants");
                const partsSnap = await getDocs(partsRef);
                const data = partsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPlayers(data);
            } else {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPlayers(data);
            }
        } catch (error) {
            console.error("Error fetching players:", error);
        }
        setIsPlayersLoading(false);
    };

    const handleKickPlayer = async (playerId: string) => {
        if (!selectedTournament || !user) return;
        if (!confirm("Are you sure you want to kick this player? Entry fee will be refunded.")) return;

        setKickingId(playerId);
        try {
            const res = await fetch("/api/matches/kick", {
                method: "POST",
                body: JSON.stringify({
                    tournamentId: selectedTournament.id,
                    userId: playerId,
                    adminId: user.uid
                })
            });

            const result = await res.json();
            if (result.success) {
                // Remove from local list
                setPlayers(prev => prev.filter(p => p.id !== playerId && p.userId !== playerId));
                // Update tournament count locally
                setTournaments(prev => prev.map(t =>
                    t.id === selectedTournament.id
                        ? { ...t, currentPlayers: Math.max(0, t.currentPlayers - 1) }
                        : t
                ));
            } else {
                alert("Failed to kick: " + result.error);
            }
        } catch (error) {
            console.error("Kick error:", error);
            alert("Error processing kick request");
        }
        setKickingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await addDoc(collection(db, "tournaments"), {
                ...formData,
                currentPlayers: 0,
                status: 'upcoming',
                createdAt: Timestamp.now()
            });
            setIsFormOpen(false);
            fetchTournaments();
        } catch (error) {
            console.error("Error adding tournament: ", error);
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Delete this tournament? This action cannot be undone.")) {
            // Optimistic update
            setTournaments(prev => prev.filter(t => t.id !== id));
            try {
                await deleteDoc(doc(db, "tournaments", id));
            } catch (error) {
                console.error("Error deleting tournament", error);
                fetchTournaments(); // Revert on failure
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col gap-4">
                {/* Top Row: Game Dropdown + Create New */}
                <div className="flex justify-between items-center gap-4">
                    <div className="w-auto">
                        <Select value={selectedGame || ""} onValueChange={setSelectedGame}>
                            <SelectTrigger className="w-[180px] bg-muted/30 border-border/50">
                                <SelectValue placeholder="Select Game" />
                            </SelectTrigger>
                            <SelectContent>
                                {gamesList.map((game) => (
                                    <SelectItem key={game} value={game}>
                                        {game}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={() => setIsFormOpen(true)}
                        className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 gap-2"
                    >
                        <Plus size={18} /> Create New
                    </Button>
                </div>

                {/* Main Tabs (Scrims vs Tournaments) - Dashboard Style */}
                <div className="flex justify-center px-2">
                    <div className="bg-card/50 backdrop-blur-sm rounded-lg p-1 border border-border/50 flex flex-wrap justify-center gap-1 w-full max-w-fit">
                        {[
                            { id: 'tournaments', label: 'Tournaments', icon: Trophy, color: 'yellow' },
                            { id: 'scrims', label: 'Scrims', icon: Swords, color: 'primary' }
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
                                    <span className="font-rajdhani whitespace-nowrap">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search */}
                <div className="flex justify-end">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search by title or map..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-muted/30 border-border/50"
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <GsapLoaderInline size="lg" />
                </div>
            ) : filteredTournaments.length === 0 ? (
                <div className="text-center py-20 bg-muted/5 rounded-xl border border-dashed border-border/50">
                    <Gamepad2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">No matches found</h3>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                        No {viewMode} found for {selectedGame}.
                    </p>
                </div>
            ) : (
                <div ref={listRef} className="grid gap-3">
                    {filteredTournaments.map((t) => (
                        <div key={t.id} className="group relative flex items-center justify-between p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 transition-all hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center border",
                                    t.type === 'championship' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                        t.type === 'special' ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                                            "bg-primary/10 border-primary/20 text-primary"
                                )}>
                                    {t.type === 'championship' ? <Trophy size={20} /> :
                                        t.type === 'special' ? <Sparkles size={20} /> :
                                            <Swords size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-base text-foreground font-rajdhani">{t.title || t.game}</h3>
                                        <span className={cn(
                                            "text-[10px] uppercase px-1.5 py-0.5 rounded font-bold border",
                                            t.status === 'live' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                t.status === 'completed' ? "bg-muted text-muted-foreground border-border" :
                                                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        )}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-3">
                                        <span className="flex items-center gap-1"><MapPin size={10} /> {t.map}</span>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span>{t.date} • {t.time}</span>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span>{t.currentPlayers}/{t.maxPlayers} Players</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block">
                                    <div className="text-sm font-semibold text-emerald-400">₹{t.prizePool}</div>
                                    <div className="text-[10px] text-muted-foreground">Prize Pool</div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-sm font-semibold text-foreground">₹{t.entryFee}</div>
                                    <div className="text-[10px] text-muted-foreground">Entry Fee</div>
                                </div>

                                <button
                                    onClick={(e) => handleDelete(t.id, e)}
                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete Tournament"
                                >
                                    <Trash2 size={18} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openPlayerDialog(t);
                                    }}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="Manage Players"
                                >
                                    <Users size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Players Management Modal */}
            {isPlayerDialogOpen && selectedTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="admin-modal bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border/50">
                            <div>
                                <h2 className="text-lg font-bold font-rajdhani flex items-center gap-2">
                                    <Users size={18} className="text-primary" />
                                    Players in {selectedTournament.title || selectedTournament.game}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total: {players.length} / {selectedTournament.maxPlayers}
                                </p>
                            </div>
                            <button onClick={() => setIsPlayerDialogOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {isPlayersLoading ? (
                                <div className="py-20 flex justify-center"><GsapLoaderInline /></div>
                            ) : players.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground">
                                    <UserX className="mx-auto w-10 h-10 mb-2 opacity-20" />
                                    No players joined yet.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {players.map((player) => (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                    {player.userName?.[0]?.toUpperCase() || "?"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{player.userName || "Unknown User"}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">ID: {player.userId || player.id}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-xs text-muted-foreground">In-Game</p>
                                                    <p className="text-xs font-semibold">{player.ingameName || "N/A"}</p>
                                                </div>

                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleKickPlayer(player.userId || player.id)}
                                                    disabled={kickingId === (player.userId || player.id)}
                                                    className="h-8 px-3 text-xs gap-1"
                                                >
                                                    {kickingId === (player.userId || player.id) ? (
                                                        <GsapLoaderInline size="sm" />
                                                    ) : (
                                                        <>
                                                            <UserX size={14} /> Kick
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border/50 bg-muted/10 text-xs text-muted-foreground flex items-center gap-2">
                            <AlertTriangle size={14} className="text-yellow-500" />
                            <span>Kicking a player will automatically refund their entry fee.</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Tournament Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="admin-modal bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border/50">
                            <h2 className="text-lg font-bold font-rajdhani">Create New {viewMode === 'scrims' ? 'Scrim' : 'Tournament'}</h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 custom-scrollbar">
                            <form id="create-tournament-form" onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Game</label>
                                        <select
                                            className="w-full bg-muted/30 border border-border p-2.5 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                            value={formData.game}
                                            onChange={e => setFormData({ ...formData, game: e.target.value })}
                                        >
                                            {gamesList.map(game => (
                                                <option key={game} value={game}>{game}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Title</label>
                                        <Input
                                            placeholder={viewMode === 'scrims' ? "Daily Scrim #1" : "Sunday Championship"}
                                            value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="bg-muted/30"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground">Event Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'scrim', label: 'Scrim' },
                                            { id: 'championship', label: 'Championship' },
                                            { id: 'special', label: 'Special' }
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: type.id as any })}
                                                className={cn(
                                                    "py-2 rounded-lg text-sm border font-medium transition-all",
                                                    formData.type === type.id
                                                        ? "bg-primary/20 border-primary text-primary"
                                                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                                                )}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Entry (₹)</label>
                                        <Input type="number" min="0" value={formData.entryFee} onChange={e => setFormData({ ...formData, entryFee: Number(e.target.value) })} className="bg-muted/30" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Prize (₹)</label>
                                        <Input type="number" min="0" value={formData.prizePool} onChange={e => setFormData({ ...formData, prizePool: Number(e.target.value) })} className="bg-muted/30" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Per Kill (₹)</label>
                                        <Input type="number" min="0" value={formData.perKill} onChange={e => setFormData({ ...formData, perKill: Number(e.target.value) })} className="bg-muted/30" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Map</label>
                                        <Input value={formData.map} onChange={e => setFormData({ ...formData, map: e.target.value })} className="bg-muted/30" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Date</label>
                                        <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="bg-muted/30" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">Time</label>
                                        <Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="bg-muted/30" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground">Max Players</label>
                                    <Input type="number" value={formData.maxPlayers} onChange={e => setFormData({ ...formData, maxPlayers: Number(e.target.value) })} className="bg-muted/30" />
                                </div>

                                <div className="border-t border-border/50 pt-4">
                                    <p className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                        <Gamepad2 size={14} /> Room Configuration (Optional)
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="Room ID" value={formData.roomId} onChange={e => setFormData({ ...formData, roomId: e.target.value })} className="bg-muted/30" />
                                        <Input placeholder="Password" value={formData.roomPassword} onChange={e => setFormData({ ...formData, roomPassword: e.target.value })} className="bg-muted/30" />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-border/50 bg-muted/10">
                            <Button
                                type="submit"
                                form="create-tournament-form"
                                disabled={isLoading || !formData.title || !formData.date}
                                className="w-full font-bold"
                            >
                                {isLoading ? <GsapLoaderInline size="sm" className="mr-2" /> : null}
                                Create Match
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
