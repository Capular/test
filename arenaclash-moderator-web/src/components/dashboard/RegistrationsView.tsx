"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { collectionGroup, query, where, getDocs, getDoc, orderBy, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import gsap from "gsap";
import GsapPulse from "@/components/ui/GsapPulse";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import usePageReveal from "@/hooks/usePageReveal";
import useRowHover from "@/hooks/useRowHover";
import { Trophy, Calendar, Clock, ChevronRight, Gamepad2, AlertCircle, Ticket, CheckCircle2, XCircle, Swords, Users, Copy } from "lucide-react";

// Shadcn UI
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface RegistrationData {
    id: string; // Tournament ID
    title: string;
    game: string;
    status: 'open' | 'ongoing' | 'completed' | 'cancelled' | 'full';
    entryFee: number;
    joinedAt: any; // Firestore Timestamp
    teamName?: string;
    format?: string;
    matchType?: string;
    map?: string;
}

// Loading Component (GSAP driven)
function GsapSpinner() {
    const spinnerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (spinnerRef.current) {
            gsap.to(spinnerRef.current, {
                rotation: 360,
                duration: 1,
                repeat: -1,
                ease: "none"
            });
        }
    }, []);

    return (
        <div ref={spinnerRef} className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent mx-auto" />
    );
}

// Registration Item Component
function RegistrationItem({ data, onClick }: { data: RegistrationData; onClick: () => void }) {
    const { ref: itemRef, onMouseEnter, onMouseLeave } = useRowHover<HTMLDivElement>();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
            case 'full': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
            case 'ongoing': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
            case 'completed': return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const dateStr = data.joinedAt?.toDate ? data.joinedAt.toDate().toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Just now';

    return (
        <div
            ref={itemRef}
            onClick={onClick}
            className="group flex items-center justify-between p-4 border-b border-border/40 cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg last:border-0"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 min-w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Trophy size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors duration-300">
                        {data.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-5 border-border/50 text-muted-foreground font-normal">
                            {data.game}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} /> Joined: {dateStr}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-foreground">
                        {data.entryFee > 0 ? `₹${data.entryFee}` : 'Free'}
                    </p>
                </div>
                <Badge className={`capitalize border-0 ${getStatusColor(data.status)}`}>
                    {data.status}
                </Badge>
                <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>
        </div>
    );
}

// Live details component for the dialog
function LiveTournamentDetails({ tournamentId, initialData, onClose }: { tournamentId: string, initialData: RegistrationData, onClose: () => void }) {
    const [data, setData] = useState<any>(initialData);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "tournaments", tournamentId), (doc) => {
            if (doc.exists()) {
                setData({ ...initialData, ...doc.data(), id: doc.id });
                setLoading(false);
            }
        }, (error) => {
            console.error(`Error fetching tournament ${tournamentId}:`, error);
            setLoading(false);
        });
        return () => unsub();
    }, [tournamentId, initialData]);

    const handleCopy = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    const showCredentials = ['live', 'ready', 'ongoing'].includes(data.status);

    return (
        <div className="space-y-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/40 border border-border/50 text-center">
                <h2 className="text-lg font-bold text-foreground">{data.title || data.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
                    <Gamepad2 size={14} /> {data.game}
                    <span>•</span>
                    <span className="capitalize">{data.format || initialData.format}</span>
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <Badge className={`capitalize border-0 ${data.status === 'live' ? 'bg-red-500/20 text-red-500 animate-pulse' :
                        data.status === 'open' ? 'bg-green-500/20 text-green-500' :
                            data.status === 'ready' ? 'bg-emerald-500/20 text-emerald-500' :
                                'bg-muted'
                        }`}>
                        {data.status}
                    </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Map</p>
                    <p className="font-medium text-sm">{data.map || 'TBA'}</p>
                </div>
            </div>

            {/* Room Credentials Section */}
            {showCredentials && (data.roomId || data.roomPassword) && (
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <Swords size={16} />
                            <span className="text-sm font-bold uppercase tracking-wider">Room Credentials</span>
                        </div>

                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium ml-1">Room ID</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-background/50 border border-emerald-500/20 rounded-lg px-3 py-2 font-mono text-sm font-bold flex items-center">
                                        {data.roomId || "..."}
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500"
                                        onClick={() => handleCopy(data.roomId, 'id')}
                                        disabled={!data.roomId}
                                    >
                                        {copied === 'id' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium ml-1">Password</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-background/50 border border-emerald-500/20 rounded-lg px-3 py-2 font-mono text-sm font-bold flex items-center">
                                        {data.roomPassword || "Open"}
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500"
                                        onClick={() => handleCopy(data.roomPassword, 'pass')}
                                        disabled={!data.roomPassword}
                                    >
                                        {copied === 'pass' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Team Name</span>
                    <span className="font-medium bg-muted px-2 py-0.5 rounded">{initialData.teamName || 'Solo'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Joined At</span>
                    <span>{initialData.joinedAt?.toDate().toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Entry Fee</span>
                    <span className="font-medium">{initialData.entryFee > 0 ? `₹${initialData.entryFee}` : 'Free'}</span>
                </div>
            </div>

            <Button className="w-full mt-2" onClick={onClose}>
                Close
            </Button>
        </div>
    );
}

// Component Main
export default function RegistrationsView() {
    const { user } = useAuth();
    const router = useRouter();
    const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReg, setSelectedReg] = useState<RegistrationData | null>(null);

    // Standardized page reveal
    const containerRef = usePageReveal<HTMLDivElement>();
    const listRef = useRef<HTMLDivElement>(null);

    // Fetch Data
    useEffect(() => {
        if (!user) return;

        const fetchRegistrations = async () => {
            try {
                // 1. Query 'players' collection group for current user
                const playersQuery = query(
                    collectionGroup(db, 'players'),
                    where("userId", "==", user.uid)
                );

                const querySnapshot = await getDocs(playersQuery);
                const fetchedData: RegistrationData[] = [];

                // 2. Fetch parent tournament data for each
                const promises = querySnapshot.docs.map(async (playerDoc) => {
                    const tournamentRef = playerDoc.ref.parent.parent;
                    if (!tournamentRef) return;

                    const tournamentSnap = await getDoc(tournamentRef);
                    if (tournamentSnap.exists()) {
                        const tData = tournamentSnap.data();
                        const pData = playerDoc.data();

                        fetchedData.push({
                            id: tournamentSnap.id,
                            title: tData.title || tData.name || "Untitled Tournament",
                            game: tData.game || "Unknown Game",
                            status: tData.status || "open",
                            entryFee: Number(tData.entryFee) || 0,
                            joinedAt: pData.joinedAt,
                            teamName: pData.teamName || "Solo",
                            format: tData.type || "N/A",
                            matchType: tData.matchType,
                            map: tData.map
                        });
                    }
                });

                await Promise.all(promises);

                // Sort by joinedAt desc (client side sort since we fetched via parent refs)
                fetchedData.sort((a, b) => {
                    const timeA = a.joinedAt?.toMillis ? a.joinedAt.toMillis() : 0;
                    const timeB = b.joinedAt?.toMillis ? b.joinedAt.toMillis() : 0;
                    return timeB - timeA;
                });

                setRegistrations(fetchedData);
            } catch (error) {
                console.error("Error fetching registrations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, [user]);

    // Stagger list items after loading
    useEffect(() => {
        if (!loading && listRef.current && listRef.current.children.length > 0) {
            gsap.fromTo(listRef.current.children,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power3.out", delay: 0.15, clearProps: "transform" }
            );
        }
    }, [loading, registrations]);

    const activeCount = registrations.filter(r => ['open', 'ongoing', 'full'].includes(r.status)).length;
    const completedCount = registrations.filter(r => ['completed'].includes(r.status)).length;

    return (
        <div ref={containerRef} className="space-y-6 lg:p-6 p-4 w-full opacity-0">
            {/* Stats section placeholder - user will add stats here later */}

            {/* Registrations List */}
            <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <div className="p-6 border-b border-border/50 flex justify-between items-center">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        My Registrations
                    </h3>
                    <Badge variant="secondary" className="font-mono text-xs">{registrations.length} Total</Badge>
                </div>

                {loading ? (
                    <div className="divide-y divide-border/0">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-36" />
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-5 w-16 rounded" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-4 w-12 hidden sm:block" />
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                    <Skeleton className="h-4 w-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : registrations.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                            <Ticket size={32} />
                        </div>
                        <h3 className="text-lg font-medium mb-1">No registrations found</h3>
                        <p className="text-sm text-muted-foreground mb-4">You haven't joined any tournaments yet.</p>
                        <Button onClick={() => router.push('/tournaments')}>Join Your First Tournament</Button>
                    </div>
                ) : (
                    <div ref={listRef} className="divide-y divide-border/0">
                        {registrations.map((reg) => (
                            <RegistrationItem
                                key={reg.id}
                                data={reg}
                                onClick={() => setSelectedReg(reg)}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {/* Details Dialog */}
            <Dialog open={!!selectedReg} onOpenChange={(open) => !open && setSelectedReg(null)}>
                <DialogContent className="sm:max-w-md bg-card border-border/60">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-rajdhani text-xl">
                            <Trophy className="w-5 h-5 text-primary" />
                            Tournament Details
                        </DialogTitle>
                        <DialogDescription>
                            Review your registration details.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReg && (
                        <LiveTournamentDetails
                            tournamentId={selectedReg.id}
                            initialData={selectedReg}
                            onClose={() => setSelectedReg(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
