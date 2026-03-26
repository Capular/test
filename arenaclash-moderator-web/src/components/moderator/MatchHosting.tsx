"use client";

import { useState, useEffect, useRef, use } from "react";
import { doc, updateDoc, collection, Timestamp, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Gamepad2, Users, Trophy, Coins, Copy, Check, Clock, PlayCircle, StopCircle, ArrowLeft, Edit2, ShieldAlert, Key, Hash } from "lucide-react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import GsapPing from "@/components/ui/GsapPing";
import usePageReveal from "@/hooks/usePageReveal";
import StatsEntry from "./StatsEntry";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TeamSlot {
    slotId: string;
    locked: boolean;
    players: {
        userId: string;
        userName: string;
        userAvatar?: string;
        ingameName?: string;
        joinedAt: any;
    }[];
}

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
    status: 'upcoming' | 'ready' | 'live' | 'completed' | 'calculating' | 'locked' | 'open';
    type: 'scrim' | 'championship';
    hostedBy?: string;
    hostedAt?: any;
}

interface Participant {
    odId: string;
    displayName: string;
    email: string;
    ingameName: string;
    joinedAt: any;
    feePaid: number;
}

export default function MatchHosting({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const tournamentId = params.id;

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [showStatsEntry, setShowStatsEntry] = useState(false);
    const [teams, setTeams] = useState<TeamSlot[]>([]);

    // Room Dialog State
    const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
    const [roomForm, setRoomForm] = useState({ roomId: "", roomPassword: "" });
    const [savingRoom, setSavingRoom] = useState(false);

    const containerRef = usePageReveal();
    const statsCardsRef = useRef<HTMLDivElement>(null);
    const participantListRef = useRef<HTMLTableSectionElement>(null);
    const router = useRouter();

    // Real-time listener for Tournament Data
    useEffect(() => {
        setLoading(true);
        const unsub = onSnapshot(doc(db, "tournaments", tournamentId), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Tournament;
                setTournament(data);
            } else {
                router.replace("/moderator/matches");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tournament:", error);
            setLoading(false);
        });

        return () => unsub();
    }, [tournamentId, router]);

    // Real-time listener for Participants
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "tournaments", tournamentId, "players"), (snapshot) => {
            const pData = snapshot.docs.map(doc => ({
                odId: doc.id,
                displayName: doc.data().userName || doc.data().displayName || "Unknown",
                email: doc.data().email,
                ingameName: doc.data().ingameName,
                joinedAt: doc.data().joinedAt,
                feePaid: doc.data().feePaid
            })) as Participant[];
            setParticipants(pData);
        });

        return () => unsub();
    }, [tournamentId]);

    // Real-time listener for Teams
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "tournaments", tournamentId, "teams"), (snapshot) => {
            const tData = snapshot.docs.map(doc => ({
                slotId: doc.id,
                ...doc.data()
            })) as TeamSlot[];
            // Sort by slot ID
            tData.sort((a, b) => Number(a.slotId) - Number(b.slotId));
            setTeams(tData);
        });
        return () => unsub();
    }, [tournamentId]);

    // Real-time listener for Participants

    // Animate stats cards on load
    useEffect(() => {
        if (statsCardsRef.current && tournament) {
            gsap.fromTo(
                statsCardsRef.current.children,
                { y: 30, opacity: 0, scale: 0.95 },
                { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.4)" }
            );
        }
    }, [tournament]);

    // Animate participants table rows
    useEffect(() => {
        if (participantListRef.current && participants.length > 0) {
            gsap.fromTo(
                participantListRef.current.children,
                { x: -20, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: "power2.out" }
            );
        }
    }, [participants]);

    const handleCopy = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleStartMatch = async () => {
        if (!tournament) return;

        if (!tournament.roomId || !tournament.roomPassword) {
            setIsRoomDialogOpen(true);
            return;
        }

        if (!confirm("Are you sure you want to start this match? Make sure Room ID and Password are valid.")) return;

        setActionLoading(true);
        try {
            const user = auth.currentUser;
            await updateDoc(doc(db, "tournaments", tournamentId), {
                status: 'live',
                hostedBy: user?.uid,
                hostedAt: Timestamp.now()
            });
        } catch (error) {
            console.error("Error starting match:", error);
            alert("Failed to start match");
        }
        setActionLoading(false);
    };

    const handleEndMatch = () => {
        setShowStatsEntry(true);
    };

    const handleUpdateRoom = async () => {
        if (!tournament) return;
        setSavingRoom(true);
        try {
            await updateDoc(doc(db, "tournaments", tournamentId), {
                roomId: roomForm.roomId,
                roomPassword: roomForm.roomPassword
            });
            setIsRoomDialogOpen(false);
        } catch (error) {
            console.error("Error updating room details:", error);
        }
        setSavingRoom(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <GsapLoaderInline size="lg" />
            </div>
        );
    }

    if (!tournament) {
        return null;
    }

    if (showStatsEntry) {
        return (
            <StatsEntry
                tournament={tournament}
                participants={participants}
                onBack={() => setShowStatsEntry(false)}
            />
        );
    }

    const isLive = tournament.status === 'live';
    const isCompleted = tournament.status === 'completed';

    if (isCompleted) {
        return (
            <Card className="max-w-md mx-auto mt-20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShieldAlert className="w-16 h-16 text-emerald-500 mb-4" />
                    <h2 className="text-2xl font-bold font-rajdhani">Match Completed</h2>
                    <p className="text-muted-foreground mt-2 text-center">This match has been completed and final results have been submitted.</p>
                    <Button onClick={() => router.push('/moderator/matches')} className="mt-6" variant="outline">Back to Queue</Button>
                </CardContent>
            </Card>
        )
    }

    const statsData = [
        { icon: Trophy, label: "Prize Pool", value: `₹${tournament.prizePool}`, color: "yellow" },
        { icon: Coins, label: "Per Kill", value: `₹${tournament.perKill}`, color: "emerald" },
        { icon: Users, label: "Players", value: `${tournament.currentPlayers}/${tournament.maxPlayers}`, color: "primary" },
        { icon: Clock, label: "Scheduled", value: tournament.time, color: "blue" }
    ];

    return (
        <div ref={containerRef} className="space-y-6">
            {/* Header Card */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/moderator/matches")}
                            className="w-10 h-10 rounded-lg self-start"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-xl sm:text-2xl font-bold font-rajdhani text-foreground">
                                    {tournament.title || tournament.game}
                                </h1>
                                {isLive ? (
                                    <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                                        <GsapPing color="bg-white" size="sm" />
                                        LIVE
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20">
                                        PRE-MATCH
                                    </Badge>
                                )}
                                <Badge variant="outline" className="font-mono text-xs">
                                    ID: {tournament.id}
                                </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                {tournament.game} • {tournament.map} • {tournament.date}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div ref={statsCardsRef} className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {statsData.map((stat, index) => {
                    const colorClasses: Record<string, string> = {
                        yellow: "bg-yellow-500/10 text-yellow-500",
                        emerald: "bg-emerald-500/10 text-emerald-500",
                        primary: "bg-primary/10 text-primary",
                        blue: "bg-blue-500/10 text-blue-500"
                    };
                    const valueColor: Record<string, string> = {
                        yellow: "text-yellow-400",
                        emerald: "text-emerald-400",
                        primary: "text-foreground",
                        blue: "text-foreground"
                    };

                    return (
                        <Card key={index} className="bg-card/60 backdrop-blur-sm border-border/50 hover:border-border transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[stat.color])}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                                        <p className={cn("text-lg font-bold", valueColor[stat.color])}>{stat.value}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Tabs & Content */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/20 p-1 rounded-xl">
                    <TabsTrigger value="overview" className="font-rajdhani font-bold">Overview & List</TabsTrigger>
                    <TabsTrigger value="teams" className="font-rajdhani font-bold">Teams View</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Room Details Card */}
                    <Card className={cn(
                        "relative overflow-hidden transition-all duration-300",
                        isLive
                            ? "border-red-500/30 bg-gradient-to-r from-red-500/5 to-transparent"
                            : "border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent"
                    )}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg font-rajdhani">
                                    <Gamepad2 className={cn("w-5 h-5", isLive ? "text-red-500" : "text-emerald-500")} />
                                    Room Details
                                </CardTitle>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsRoomDialogOpen(true)}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Edit</span>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Room ID */}
                                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Hash className="w-4 h-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In-Game Room ID</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xl font-mono font-bold text-foreground">
                                            {tournament.roomId || <span className="text-muted-foreground/50 italic text-base">Not set</span>}
                                        </p>
                                        {tournament.roomId && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleCopy(tournament.roomId!, "roomId")}
                                            >
                                                {copiedField === "roomId" ? (
                                                    <Check className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Key className="w-4 h-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Password</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xl font-mono font-bold text-foreground">
                                            {tournament.roomPassword || <span className="text-muted-foreground/50 italic text-base">Not set</span>}
                                        </p>
                                        {tournament.roomPassword && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleCopy(tournament.roomPassword!, "roomPassword")}
                                            >
                                                {copiedField === "roomPassword" ? (
                                                    <Check className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Button */}
                    <div className="flex gap-4">
                        {!isLive ? (
                            <Button
                                onClick={handleStartMatch}
                                disabled={actionLoading}
                                size="lg"
                                className="flex-1 h-14 text-base font-bold font-rajdhani bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                                {actionLoading ? (
                                    <GsapLoaderInline size="sm" />
                                ) : (
                                    <>
                                        <PlayCircle className="w-5 h-5 mr-2" />
                                        Start Match (Go Live)
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleEndMatch}
                                disabled={actionLoading}
                                size="lg"
                                variant="destructive"
                                className="flex-1 h-14 text-base font-bold font-rajdhani"
                            >
                                <StopCircle className="w-5 h-5 mr-2" />
                                End Match & Enter Stats
                            </Button>
                        )}
                    </div>

                    {/* Participants Table */}
                    <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-lg font-rajdhani">
                                    <Users className="w-5 h-5 text-primary" />
                                    Registered Participants
                                </div>
                                <Badge variant="secondary" className="text-xs font-mono">
                                    {participants.length} / {tournament.maxPlayers}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {participants.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Waiting for players to join...</p>
                                    <p className="text-sm mt-1">Participants will appear here once they register</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-border/50 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="w-12 text-center">#</TableHead>
                                                <TableHead>Player</TableHead>
                                                <TableHead className="hidden sm:table-cell">ID</TableHead>
                                                <TableHead className="text-right">Entry</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody ref={participantListRef}>
                                            {participants.map((p, index) => (
                                                <TableRow key={p.odId} className="hover:bg-muted/20 transition-colors">
                                                    <TableCell className="text-center">
                                                        <Avatar className="w-8 h-8 mx-auto">
                                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                                {index + 1}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-semibold text-foreground">{p.ingameName || p.displayName}</p>
                                                        <p className="text-xs text-muted-foreground hidden sm:block">{p.email || "—"}</p>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {p.odId.slice(0, 8)}...
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-semibold text-emerald-400">
                                                            ₹{p.feePaid || tournament.entryFee || 0}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="teams" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {teams.map((slot) => {
                            const playCount = slot.players?.length || 0;
                            const hasPlayers = playCount > 0;
                            return (
                                <Card key={slot.slotId} className={cn("overflow-hidden", hasPlayers ? "bg-card" : "bg-card/50 border-dashed")}>
                                    <div className="p-3 border-b border-border/50 bg-muted/20 flex justify-between items-center">
                                        <span className="font-bold font-rajdhani">Team {slot.slotId}</span>
                                        <Badge variant={hasPlayers ? "default" : "outline"} className="text-[10px] h-5">
                                            {playCount} Players
                                        </Badge>
                                    </div>
                                    <div className="p-2 space-y-2">
                                        {slot.players?.map((p) => (
                                            <div key={p.userId} className="flex items-center gap-2 bg-background/50 rounded p-1.5 border border-border/30">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarImage src={p.userAvatar} />
                                                    <AvatarFallback className="text-[9px]">{p.userName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] font-bold truncate">{p.userName}</p>
                                                    <p className="text-[9px] text-muted-foreground truncate">{p.ingameName}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {playCount === 0 && (
                                            <div className="h-20 flex items-center justify-center text-muted-foreground/30 text-xs italic">
                                                Empty
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                        {teams.length === 0 && (
                            <div className="col-span-full py-12 text-center text-muted-foreground">
                                No teams data available yet.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Room Edit Dialog */}
            <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-rajdhani flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-emerald-500" />
                            Update Room Details
                        </DialogTitle>
                        <DialogDescription>
                            Enter the in-game Room ID and Password for players to join.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="roomId" className="flex items-center gap-2">
                                <Hash className="w-4 h-4" />
                                In-Game Room ID
                            </Label>
                            <Input
                                id="roomId"
                                value={roomForm.roomId}
                                onChange={(e) => setRoomForm({ ...roomForm, roomId: e.target.value })}
                                placeholder="e.g. 1234567"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roomPassword" className="flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                Password
                            </Label>
                            <Input
                                id="roomPassword"
                                value={roomForm.roomPassword}
                                onChange={(e) => setRoomForm({ ...roomForm, roomPassword: e.target.value })}
                                placeholder="e.g. 1234 or leave empty"
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsRoomDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateRoom} disabled={savingRoom || !roomForm.roomId} className="bg-emerald-500 hover:bg-emerald-600">
                            {savingRoom ? <GsapLoaderInline size="sm" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
