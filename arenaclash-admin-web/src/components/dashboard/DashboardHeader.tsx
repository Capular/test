"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Bell, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import MobileDrawer from "./MobileDrawer";
import { collection, query, where, orderBy, onSnapshot, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GsapPulseBadge } from "@/components/ui/GsapPulse";

export default function DashboardHeader() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [gamesList, setGamesList] = useState<string[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const activeTab = pathname === "/" ? "tournaments" : pathname.split("/").pop();
    const isTournaments = pathname === "/" || pathname.includes("tournaments");

    // Get game from URL
    const selectedGame = searchParams.get("game") || undefined;

    // Default to favorite game if available and no game selected (ONLY for tournaments page)
    useEffect(() => {
        if (isTournaments && !selectedGame && userData?.favoriteGame) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("game", userData.favoriteGame);
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [selectedGame, userData, pathname, router, searchParams, isTournaments]);

    // Fetch active games
    useEffect(() => {
        const fetchGames = async () => {
            const q = query(collection(db, "games"), where("isActive", "==", true));
            const snapshot = await getDocs(q);
            const games = snapshot.docs.map(doc => doc.data().name);
            if (games.length > 0) setGamesList(games);
        };
        fetchGames();
    }, []);

    const handleGameChange = (game: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("game", game);
        router.push(`${pathname}?${params.toString()}`);
    };

    // Fetch Notifications
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(10)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifs);
            setUnreadCount(notifs.filter((n: any) => !n.read).length);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
            setUnreadCount(0);
        });
        return () => unsubscribe();
    }, [user]);

    return (
        <>
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl flex flex-col">
                <div className="h-16 lg:h-20 flex items-center px-4 lg:px-8 gap-3">
                    {/* Mobile Hamburger Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
                    >
                        <Menu size={20} className="text-foreground" />
                    </button>

                    {/* Game Selection - Works on both mobile and desktop */}
                    {isTournaments && (
                        <div className="w-[140px] sm:w-[160px] lg:w-[180px]">
                            <Select value={selectedGame} onValueChange={handleGameChange}>
                                <SelectTrigger className="bg-card border-border hover:bg-white/5 transition-all text-foreground font-rajdhani font-bold shadow-sm h-9 lg:h-10 text-sm">
                                    <SelectValue placeholder="Select Game" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    {gamesList.map((game) => (
                                        <SelectItem
                                            key={game}
                                            value={game}
                                            className="font-rajdhani font-medium focus:bg-primary/10 focus:text-primary cursor-pointer"
                                        >
                                            {game}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Notification Bell */}
                    <div className="relative group ml-auto">
                        <GsapPulseBadge count={unreadCount} />
                        <button className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-black/5 transition-colors relative shadow-sm">
                            <Bell size={20} className="text-foreground" />
                        </button>

                        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl shadow-black/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                            <div className="p-4 border-b border-border/50 flex justify-between items-center">
                                <h4 className="font-bold text-foreground font-rajdhani">Notifications</h4>
                                <span className="text-xs text-primary cursor-pointer hover:underline">Mark all read</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">No notifications</div>
                                ) : (
                                    notifications.map((n) => (
                                        <div key={n.id} className={`p-3 hover:bg-primary/5 border-b border-border/50 last:border-0 flex gap-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                                            <div className="h-8 w-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center text-primary text-xs">
                                                📢
                                            </div>
                                            <div>
                                                <p className="text-sm text-foreground font-semibold">{n.title}</p>
                                                <p className="text-xs text-muted-foreground">{n.message}</p>
                                                <p className="text-[10px] text-muted-foreground/50 mt-1">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString() : ''}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Drawer */}
            <MobileDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </>
    );
}
