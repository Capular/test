"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tenantUserRef } from "@/lib/tenant-user-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Gamepad2, User, ChevronRight, Check, Trophy } from "lucide-react";
import gsap from "gsap";
import GsapPulse from "@/components/ui/GsapPulse";

export default function OnboardingPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState("");
    const [selectedGame, setSelectedGame] = useState("");
    const [games, setGames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const containerRef = useRef<HTMLDivElement>(null);
    const step1Ref = useRef<HTMLDivElement>(null);
    const step2Ref = useRef<HTMLDivElement>(null);

    // Fetch games
    useEffect(() => {
        const fetchGames = async () => {
            try {
                const q = query(collection(db, "games"), where("isActive", "==", true));
                const snapshot = await getDocs(q);
                const gameNames = snapshot.docs.map(doc => doc.data().name);
                setGames(gameNames);
            } catch (err) {
                console.error("Error fetching games:", err);
            }
        };
        fetchGames();
    }, []);

    // Pre-fill username from email
    useEffect(() => {
        if (user && user.email && !username) {
            // Extract basic username from email (e.g. john from john@gmail.com)
            const emailPrefix = user.email.split('@')[0];
            // Clean it up - remove special chars to be safe
            const cleanName = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '');
            setUsername(cleanName);
        }
    }, [user]);

    // Animation for step transitions
    useEffect(() => {
        if (step === 1) {
            gsap.fromTo(step1Ref.current,
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
            );
        } else if (step === 2) {
            gsap.to(step1Ref.current, {
                opacity: 0, x: -20, duration: 0.3, onComplete: () => {
                    gsap.fromTo(step2Ref.current,
                        { opacity: 0, x: 20 },
                        { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
                    );
                }
            });
        }
    }, [step]);

    const handleNext = () => {
        if (step === 1) {
            if (!username.trim() || username.length < 3) {
                setError("Username must be at least 3 characters");
                return;
            }
            setError("");
            setStep(2);
        }
    };

    const handleComplete = async () => {
        if (!user) return;
        if (!selectedGame) {
            setError("Please select a favorite game");
            return;
        }

        setIsLoading(true);
        try {
            await updateDoc(tenantUserRef(db, user.uid), {
                username: username,
                favoriteGame: selectedGame,
                hasCompletedOnboarding: true
            });
            // Redirect to dashboard
            router.push("/");
        } catch (err) {
            console.error("Error finalizing onboarding:", err);
            setError("Something went wrong. Please try again.");
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <GsapPulse className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]">
                    <div className="w-full h-full" />
                </GsapPulse>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <div ref={containerRef} className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl relative">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-muted/50">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: step === 1 ? '50%' : '100%' }}
                    />
                </div>

                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold font-rajdhani mb-2 text-foreground">Welcome to ANU PAID SCRIM!</h1>
                    <p className="text-muted-foreground">Let's set up your profile to get started.</p>
                </div>

                {/* Step 1: Username */}
                {step === 1 && (
                    <div ref={step1Ref} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-lg">Choose your Username</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-muted-foreground w-5 h-5" />
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="pl-10 text-lg py-6 bg-muted/30 border-border/50 focus:border-primary/50"
                                    placeholder="e.g. ProGamer123"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">This will be displayed on your profile and leaderboards.</p>
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <Button onClick={handleNext} className="w-full py-6 text-lg font-bold gap-2">
                            Next <ChevronRight size={18} />
                        </Button>
                    </div>
                )}

                {/* Step 2: Favorite Game */}
                {step === 2 && (
                    <div ref={step2Ref} className="space-y-6 opacity-0" style={{ display: step === 2 ? 'block' : 'none' }}>
                        <div className="space-y-4">
                            <Label className="text-lg">Select Your Favorite Game</Label>
                            <p className="text-sm text-muted-foreground">We'll show you tournaments for this game by default.</p>

                            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {games.map((game) => (
                                    <div
                                        key={game}
                                        onClick={() => setSelectedGame(game)}
                                        className={`cursor-pointer rounded-xl p-4 border flex flex-col items-center justify-center gap-2 transition-all ${selectedGame === game
                                            ? 'bg-primary/20 border-primary text-primary scale-[1.02] shadow-lg shadow-primary/10'
                                            : 'bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-primary/30'
                                            }`}
                                    >
                                        <Gamepad2 className={`w-8 h-8 ${selectedGame === game ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-bold text-sm text-center">{game}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <Button onClick={handleComplete} disabled={isLoading} className="w-full py-6 text-lg font-bold gap-2 bg-green-600 hover:bg-green-700">
                            {isLoading ? 'Setting up...' : 'Finish Setup'} <Check size={18} />
                        </Button>

                        <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-muted-foreground hover:text-foreground">
                            Back
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
