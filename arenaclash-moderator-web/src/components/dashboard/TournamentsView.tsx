"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { collection, onSnapshot, query, where, getDocs, orderBy, collectionGroup, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import gsap from "gsap";
import GsapLoader from "@/components/ui/GsapLoader";
import { Swords, Trophy, MapPin, ArrowLeft, Gamepad2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const TournamentCard = dynamic(() => import("./TournamentCard"), {
    loading: () => <div className="h-[300px] bg-card/50 rounded-xl animate-pulse" />
});
const TemplateCard = dynamic(() => import("./TemplateCard"), {
    loading: () => <div className="h-[300px] bg-card/50 rounded-xl animate-pulse" />
});
const GamemodeCard = dynamic(() => import("./GamemodeCard"), {
    loading: () => <div className="h-40 bg-card/50 rounded-xl animate-pulse" />
});

interface Tournament {
    id: string;
    title: string;
    prizePool: string;
    entryFee: string;
    currentSlots: number;
    maxSlots: number;
    isLive: boolean;
    game: string;
    type?: 'scrim' | 'special' | 'championship';
    map?: string; // Corresponds to gamemode often
}

interface TournamentsViewProps {
    selectedGame?: string;
}

export default function TournamentsView({ selectedGame }: TournamentsViewProps) {
    const [viewMode, setViewMode] = useState<'scrims' | 'specials' | 'championships'>('scrims');
    const [gamemodes, setGamemodes] = useState<string[]>([]);
    const [gamemodeDetails, setGamemodeDetails] = useState<Record<string, { bannerUrl: string }>>({});
    const [selectedGamemode, setSelectedGamemode] = useState<string | null>(null);
    const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]); // This is now the filtered list
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gameBanner, setGameBanner] = useState<string | null>(null);
    const [bannerFocusX, setBannerFocusX] = useState(50);
    const [bannerFocusY, setBannerFocusY] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const bannerRef = useRef<HTMLDivElement>(null);

    // Animation Handlers
    const handleGamemodeSelect = (mode: string) => {
        if (gridRef.current) {
            gsap.to(gridRef.current, {
                opacity: 0,
                x: -20,
                duration: 0.3,
                ease: "power2.inOut",
                onComplete: () => {
                    setSelectedGamemode(mode);
                }
            });
        } else {
            setSelectedGamemode(mode);
        }
    };

    const handleBackToGamemodes = () => {
        if (listRef.current) {
            gsap.to(listRef.current, {
                opacity: 0,
                x: 20,
                duration: 0.3,
                ease: "power2.inOut",
                onComplete: () => {
                    setSelectedGamemode(null);
                }
            });
        } else {
            setSelectedGamemode(null);
        }
    };

    // Animate IN when view changes
    useEffect(() => {
        if (selectedGamemode && listRef.current) {
            gsap.fromTo(listRef.current,
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", delay: 0.1, clearProps: "transform" }
            );
        } else if (!selectedGamemode && gridRef.current) {
            gsap.fromTo(gridRef.current,
                { opacity: 0, x: -20 },
                { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", delay: 0.1, clearProps: "transform" }
            );
        }
    }, [selectedGamemode]);

    // Fetch Gamemodes when selectedGame changes (for Scrims)
    useEffect(() => {
        if (!selectedGame || viewMode !== 'scrims') return;

        const fetchGamemodes = async () => {
            const q = query(collection(db, "games"), where("name", "==", selectedGame));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const gameData = snapshot.docs[0].data();
                setGamemodes(gameData.gamemodes || []);
                setGamemodeDetails(gameData.gamemodeDetails || {});
            } else {
                setGamemodes([]);
                setGamemodeDetails({});
            }
        };

        fetchGamemodes();
    }, [selectedGame, viewMode]);

    // Fetch game banner when game changes
    useEffect(() => {
        if (!selectedGame) {
            setGameBanner(null);
            return;
        }

        const fetchGameBanner = async () => {
            const q = query(collection(db, "games"), where("name", "==", selectedGame));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const gameData = snapshot.docs[0].data();
                const newBanner = gameData.bannerImage || null;

                // Animate banner transition
                if (bannerRef.current && gameBanner !== newBanner) {
                    if (newBanner) {
                        // Fade in new banner
                        gsap.fromTo(bannerRef.current,
                            { opacity: 0 },
                            { opacity: 1, duration: 0.5, ease: "power2.out" }
                        );
                    } else {
                        // Fade out if no banner
                        gsap.to(bannerRef.current, { opacity: 0, duration: 0.3, ease: "power2.in" });
                    }
                }
                setGameBanner(newBanner);
                setBannerFocusX(gameData.bannerFocusX ?? 50);
                setBannerFocusY(gameData.bannerFocusY ?? 50);
            } else {
                setGameBanner(null);
            }
        };

        fetchGameBanner();
    }, [selectedGame]);

    // Fetch Templates (for Infinite Scrims)
    useEffect(() => {
        if (!selectedGame || viewMode !== 'scrims') return;

        // Fetch templates where gameName matches selectedGame
        const fetchTemplates = async () => {
            // Query templates
            const q = query(
                collection(db, "templates"),
                where("gameName", "==", selectedGame),
                where("gameName", "==", selectedGame),
                where("isActive", "==", true)
                // orderBy("createdAt", "desc") // Temporary removal to fix Index Error
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTemplates(data);
                setError(null);
            }, (err) => {
                console.error("Error fetching templates:", err);
                setTemplates([]);
                if (err.code === 'permission-denied') {
                    setError("Access Denied: Please check Firestore Security Rules.");
                } else {
                    setError("Failed to load templates.");
                }
            });
            return () => unsubscribe();
        };

        fetchTemplates();
    }, [selectedGame, viewMode]);

    // Fetch ALL Tournaments (for Championships or fallback)
    useEffect(() => {
        setLoading(true);
        // ... (keep existing tournament fetch logic but maybe limit it if we replace scrims) 
        // For now, let's keep fetching tournaments for Championships
        let q = query(collection(db, "tournaments"));
        let constraints: any[] = [];

        if (selectedGame) {
            constraints.push(where("game", "==", selectedGame));
        }

        q = query(collection(db, "tournaments"), ...constraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data: Tournament[] = [];
            snapshot.forEach((doc) => {
                const t = doc.data() as any;
                data.push({
                    id: doc.id,
                    title: t.title,
                    prizePool: t.prizePool,
                    entryFee: t.entryFee,
                    currentSlots: t.currentSlots,
                    maxSlots: t.maxSlots,
                    isLive: t.isLive,
                    game: t.game || "Free Fire",
                    type: t.type || 'scrim',
                    map: t.map
                });
            });
            setAllTournaments(data);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching tournaments:", err);
            setAllTournaments([]);
            setLoading(false);
            if (err.code === 'permission-denied') {
                setError("Access Denied: Please check Firestore Security Rules.");
            }
        });

        return () => unsubscribe();
    }, [selectedGame]);

    // Filter Tournaments in memory
    useEffect(() => {
        let data = [...allTournaments];

        // Filter specific to View Mode
        if (viewMode === 'championships') {
            data = data.filter(t => t.type === 'championship');
        } else if (viewMode === 'specials') {
            data = data.filter(t => t.type === 'special');
        } else {
            // Scrims - we might not use this list anymore if we use templates
            // But let's keep it for fallback
            data = data.filter(t => t.type !== 'championship' && t.type !== 'special');
            if (selectedGamemode) {
                data = data.filter(t => t.map === selectedGamemode);
            }
        }
        setTournaments(data);
    }, [allTournaments, viewMode, selectedGamemode]);

    // Check if user is "User Busy" (in an active tournament)
    const { user } = useAuth();
    const [isUserBusy, setIsUserBusy] = useState(false);

    useEffect(() => {
        if (!user) return;

        const checkActiveStatus = async () => {
            try {
                // 1. Get all player entries for user
                const q = query(
                    collectionGroup(db, 'players'),
                    where("userId", "==", user.uid)
                );
                const snapshot = await getDocs(q);

                // 2. Check status of each tournament
                // We're looking for ANY active tournament
                let busy = false;

                // Process in parallel
                await Promise.all(snapshot.docs.map(async (pDoc) => {
                    if (busy) return; // Optimization

                    const tRef = pDoc.ref.parent.parent;
                    if (tRef) {
                        const tSnap = await getDoc(tRef);
                        if (tSnap.exists()) {
                            const status = tSnap.data().status;
                            // Check if status implies "Busy" (ongoing/live)
                            // "open" might also be busy if they are in the lobby
                            if (['open', 'ongoing', 'live'].includes(status)) {
                                busy = true;
                            }
                        }
                    }
                }));

                setIsUserBusy(busy);
            } catch (error) {
                console.error("Error checking active status:", error);
            }
        };

        checkActiveStatus();
        // Poll every minute or on visibility change?
        // For now, run once on mount/user change.
    }, [user]);

    // GSAP entrance animation (standardized across pages)
    useEffect(() => {
        if (!loading && containerRef.current) {
            gsap.fromTo(
                containerRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform" }
            );
        }
    }, [loading, viewMode]);

    return (
        <div className="space-y-6">
            {/* Game Banner - Positioned before tabs */}
            {gameBanner && (
                <div
                    ref={bannerRef}
                    className="relative w-full h-[20vh] min-h-[120px] max-h-[200px] rounded-xl overflow-hidden"
                >
                    <img
                        src={gameBanner}
                        alt="Game Banner"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${bannerFocusX}% ${bannerFocusY}%` }}
                    />
                    {/* Gradient overlay for soft blend at bottom */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, hsl(var(--background)) 100%)'
                        }}
                    />
                </div>
            )}
            {/* View Mode Toggle - Modern Tabs with GSAP */}
            <div className="flex justify-center px-2">
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-1 border border-border/50 flex flex-wrap justify-center gap-1 w-full max-w-fit">
                    {[
                        { id: 'scrims', label: 'Scrims', mobileLabel: 'Scrims', icon: Swords, color: 'primary' },
                        { id: 'specials', label: 'Specials', mobileLabel: 'Special', icon: Sparkles, color: 'purple' },
                        { id: 'championships', label: 'Events', mobileLabel: 'Events', icon: Trophy, color: 'yellow' }
                    ].map((tab) => {
                        const isActive = viewMode === tab.id;
                        const colorClass = tab.color === 'primary'
                            ? 'text-primary bg-primary/10'
                            : tab.color === 'purple'
                                ? 'text-purple-500 bg-purple-500/10'
                                : 'text-yellow-500 bg-yellow-500/10';
                        const inactiveHover = tab.color === 'primary'
                            ? 'hover:text-primary/80'
                            : tab.color === 'purple'
                                ? 'hover:text-purple-400'
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
                                <tab.icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                                <span className="font-rajdhani whitespace-nowrap hidden sm:inline">{tab.label}</span>
                                <span className="font-rajdhani whitespace-nowrap sm:hidden">{tab.mobileLabel}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div ref={containerRef} className="min-h-[300px]">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                         <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md w-full text-center space-y-4">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                            <h3 className="text-xl font-bold text-red-500 font-rajdhani">Connection Failed</h3>
                            <p className="text-muted-foreground">{error}</p>
                            <Button 
                                variant="outline" 
                                className="border-red-500/50 hover:bg-red-500/10 text-red-500"
                                onClick={() => window.location.reload()}
                            >
                                Retry Connection
                            </Button>
                         </div>
                    </div>
                ) : loading ? (
                    <div className="space-y-6">
                        {/* Skeleton Banner */}
                        <Skeleton className="w-full h-[15vh] min-h-[100px] max-h-[160px] rounded-xl" />

                        {/* Skeleton Grid for Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-card border border-border/30 rounded-2xl overflow-hidden">
                                    {/* Card Header Skeleton */}
                                    <div className="h-32 p-5 space-y-3">
                                        <div className="flex justify-between">
                                            <Skeleton className="h-5 w-16 rounded" />
                                            <Skeleton className="h-5 w-20 rounded" />
                                        </div>
                                        <div className="space-y-2 pt-4">
                                            <Skeleton className="h-6 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>

                                    {/* Card Body Skeleton */}
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Skeleton className="h-3 w-16" />
                                                <Skeleton className="h-4 w-12" />
                                            </div>
                                            <div className="space-y-2">
                                                <Skeleton className="h-3 w-16" />
                                                <Skeleton className="h-4 w-20" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-10 w-full rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* SCRIMS VIEW */}
                        {viewMode === 'scrims' && (
                            <div className="space-y-6">
                                {/* If no game selected, ask to select one */}
                                {!selectedGame ? (
                                    <div className="text-center py-16 bg-muted/5 rounded-xl border border-dashed border-border/50">
                                        <Gamepad2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-foreground font-rajdhani">Select a Game</h3>
                                        <p className="text-sm text-muted-foreground">Please select a game from the menu to view available scrims.</p>
                                    </div>
                                ) : !selectedGamemode ? (
                                    // Gamemode List
                                    <div ref={gridRef} className="space-y-4">
                                        <h3 className="text-lg font-bold text-foreground font-rajdhani flex items-center gap-2">
                                            <MapPin size={18} className="text-primary" /> Available Gamemodes for {selectedGame}
                                        </h3>

                                        {gamemodes.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {gamemodes.map((mode, idx) => (
                                                    <GamemodeCard
                                                        key={idx}
                                                        mode={mode}
                                                        bannerUrl={gamemodeDetails[mode]?.bannerUrl}
                                                        onClick={() => handleGamemodeSelect(mode)}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 opacity-70">
                                                <p className="text-sm text-muted-foreground">No gamemodes configured for this game yet.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Filtered Template List (Specific Gamemode)
                                    // Note: We might want to filter templates by type/subtype if encoded in gamemode, 
                                    // or just show all templates for the game.
                                    // For now, let's assume templates are "the" way to play scrims.
                                    <div ref={listRef} className="space-y-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleBackToGamemodes}
                                                className="hover:bg-muted/50 -ml-2 gap-1 text-muted-foreground hover:text-foreground"
                                            >
                                                <ArrowLeft size={16} />
                                                <span className="sm:hidden">Back</span>
                                                <span className="hidden sm:inline">Back to Gamemodes</span>
                                            </Button>
                                            <span className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-2 sm:px-3 py-1 rounded-full truncate max-w-[120px] sm:max-w-none">{selectedGamemode}</span>
                                        </div>

                                        {templates.length === 0 ? (
                                            <div className="text-center py-16 bg-muted/5 rounded-xl border border-dashed border-border/50">
                                                <p className="text-muted-foreground">No active join queues found for this game.</p>
                                                <Button
                                                    variant="link"
                                                    onClick={handleBackToGamemodes}
                                                    className="mt-2 text-primary"
                                                >
                                                    Check other gamemodes
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                {templates
                                                    .filter(t => !selectedGamemode || t.gamemode === selectedGamemode) // Filter by gamemode
                                                    .map((t) => (
                                                        <TemplateCard key={t.id} template={t as any} isUserBusy={isUserBusy} />
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SPECIALS VIEW */}
                        {viewMode === 'specials' && (
                            <div className="space-y-6">
                                {tournaments.length === 0 ? (
                                    <div className="text-center py-20 bg-muted/5 rounded-xl border border-dashed border-border/50">
                                        <Sparkles className="w-12 h-12 text-purple-500/20 mx-auto mb-4" />
                                        <p className="text-muted-foreground">No special events at the moment.</p>
                                        <p className="text-sm text-neutral-500">Check back for limited-time offers!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {tournaments.map((t) => (
                                            <TournamentCard
                                                key={t.id}
                                                id={t.id}
                                                title={t.title}
                                                prizePool={t.prizePool}
                                                entryFee={t.entryFee}
                                                currentSlots={t.currentSlots}
                                                maxSlots={t.maxSlots}
                                                isLive={t.isLive}
                                                game={t.game}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CHAMPIONSHIPS VIEW */}
                        {viewMode === 'championships' && (
                            <div className="space-y-6">
                                {tournaments.length === 0 ? (
                                    <div className="text-center py-20 bg-muted/5 rounded-xl border border-dashed border-border/50">
                                        <Trophy className="w-12 h-12 text-yellow-500/20 mx-auto mb-4" />
                                        <p className="text-muted-foreground">No active championships at the moment.</p>
                                        <p className="text-sm text-neutral-500">Stay tuned for big events!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {tournaments.map((t) => (
                                            <TournamentCard
                                                key={t.id}
                                                id={t.id}
                                                title={t.title}
                                                prizePool={t.prizePool}
                                                entryFee={t.entryFee}
                                                currentSlots={t.currentSlots}
                                                maxSlots={t.maxSlots}
                                                isLive={t.isLive}
                                                game={t.game}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
