"use client";

import { useState, useEffect, useRef } from "react";
import { Trophy, Users, Coins, Gamepad2, AlertCircle, Wallet } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, runTransaction, increment, collection, Timestamp, onSnapshot } from "firebase/firestore";
import { tenantUserRef } from "@/lib/tenant-user-client";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import GsapLoader, { GsapLoaderInline } from "@/components/ui/GsapLoader";
import GsapPing from "@/components/ui/GsapPing";
import { GsapShimmer } from "@/components/ui/GsapPulse";

interface TournamentCardProps {
    id: string;
    title: string;
    prizePool: string;
    entryFee: string; // Keep as string for display, parse for logic if needed
    currentSlots: number;
    maxSlots: number;
    isLive?: boolean;
    game?: string;
}

export default function TournamentCard({
    id,
    title,
    prizePool,
    entryFee,
    currentSlots,
    maxSlots,
    isLive,
    game
}: TournamentCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [ingameName, setIngameName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const shineRef = useRef<HTMLDivElement>(null);

    // Parse entry fee once for use throughout
    const feeString = String(entryFee);
    const feeAmount = Number(feeString.replace(/[^0-9.-]+/g, ""));

    // Check if user has sufficient balance
    const hasInsufficientBalance = userBalance !== null && userBalance < feeAmount;
    const amountNeeded = hasInsufficientBalance ? feeAmount - userBalance : 0;

    // GSAP card hover animation
    useEffect(() => {
        const card = cardRef.current;
        const shine = shineRef.current;
        if (!card) return;

        const handleMouseEnter = () => {
            gsap.to(card, {
                y: -4,
                scale: 1.01,
                duration: 0.3,
                ease: "power2.out",
            });
            if (shine) {
                gsap.fromTo(
                    shine,
                    { x: "-100%" },
                    { x: "100%", duration: 0.6, ease: "power2.out" }
                );
            }
        };

        const handleMouseLeave = () => {
            gsap.to(card, {
                y: 0,
                scale: 1,
                duration: 0.3,
                ease: "power2.out",
            });
        };

        card.addEventListener("mouseenter", handleMouseEnter);
        card.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            card.removeEventListener("mouseenter", handleMouseEnter);
            card.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    // Fetch user balance when dialog opens
    useEffect(() => {
        if (!isOpen) return;

        const user = auth.currentUser;
        if (!user) {
            setUserBalance(null);
            return;
        }

        setBalanceLoading(true);
        const userRef = tenantUserRef(db, user.uid);

        // Real-time listener for wallet balance
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserBalance(typeof data.walletBalance === 'number' ? data.walletBalance : 0);
            } else {
                setUserBalance(0);
            }
            setBalanceLoading(false);
        }, (error) => {
            console.error("Error fetching balance:", error);
            setUserBalance(0);
            setBalanceLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    const handleJoin = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("Please login to join tournaments!");
            return;
        }

        if (!ingameName.trim()) {
            alert("Please enter your in-game name.");
            return;
        }

        // Pre-check: Don't even start if balance is clearly insufficient
        if (hasInsufficientBalance) {
            alert(`Insufficient balance! You need ₹${feeAmount} but only have ₹${userBalance}. Please top up your wallet first.`);
            return;
        }

        setIsLoading(true);

        try {
            await runTransaction(db, async (transaction) => {
                // --- READ PHASE ---
                const tournamentRef = doc(db, "tournaments", id);
                const userRef = tenantUserRef(db, user.uid);
                const participantRef = doc(db, "tournaments", id, "participants", user.uid);

                const [tournamentDoc, userDoc, pDoc] = await Promise.all([
                    transaction.get(tournamentRef),
                    transaction.get(userRef),
                    transaction.get(participantRef)
                ]);

                // --- VALIDATION PHASE ---
                if (!tournamentDoc.exists()) throw "Tournament does not exist!";
                if (!userDoc.exists()) throw "User profile not found!";
                if (pDoc.exists()) throw "You have already joined this tournament!";

                const tData = tournamentDoc.data();
                if (tData.currentPlayers >= tData.maxPlayers) {
                    throw "Tournament is full!";
                }

                const userData = userDoc.data();
                const currentBalance = typeof userData.walletBalance === 'number' ? userData.walletBalance : 0;

                // Strict validation: prevent registration if balance is insufficient
                if (currentBalance < feeAmount) {
                    throw `Insufficient balance! You need ₹${feeAmount} but only have ₹${currentBalance}. Please top up your wallet first.`;
                }

                // Double-check: ensure the resulting balance won't go negative
                const newBalance = currentBalance - feeAmount;
                if (newBalance < 0) {
                    throw `Cannot complete registration. This would result in negative balance. Please add ₹${feeAmount - currentBalance} to your wallet.`;
                }

                // --- WRITE PHASE ---
                // 1. Deduct Balance
                transaction.update(userRef, {
                    walletBalance: increment(-feeAmount)
                });

                // 2. Add Participant
                transaction.set(participantRef, {
                    userId: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    ingameName: ingameName,
                    joinedAt: Timestamp.now(),
                    feePaid: feeAmount
                });

                // 3. Increment Player Count
                transaction.update(tournamentRef, {
                    currentPlayers: increment(1)
                });

                // 4. Record Transaction
                const pendingTxRef = doc(collection(db, "transactions"));
                transaction.set(pendingTxRef, {
                    userId: user.uid,
                    amount: feeAmount,
                    type: 'entry',
                    description: `Joined Tournament: ${title}`,
                    status: 'success',
                    timestamp: Timestamp.now()
                });
            });

            setIsOpen(false);
            alert("Successfully joined tournament!");
        } catch (e: any) {
            console.error(e);
            alert(e.toString().replace("Error: ", ""));
        }
        setIsLoading(false);
    };

    const isFull = currentSlots >= maxSlots;
    const participantPercentage = (currentSlots / maxSlots) * 100;

    return (
        <div
            ref={cardRef}
            className="group relative card-premium tournament-card p-6 cursor-pointer"
            style={{ willChange: "transform" }}
        >
            {/* Shine effect on hover */}
            <div
                ref={shineRef}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                style={{ transform: "translateX(-100%)" }}
            />

            {/* Status indicator with GSAP ping animation */}
            {isLive && (
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <GsapPing color="bg-red-400" size="md" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Live</span>
                </div>
            )}

            {/* Game icon with hover rotation */}
            <div className="mb-4 transition-transform duration-300 group-hover:rotate-6">
                <Gamepad2 className="w-10 h-10 text-primary/60" />
            </div>

            {/* Title with gradient on hover */}
            <h3 className="text-xl font-bold mb-3 transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary/60 font-rajdhani">
                {title}
            </h3>

            {/* Game badge */}
            {game && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 bg-primary/10 rounded-full border border-primary/20">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">{game}</span>
                </div>
            )}

            {/* Prize pool with animated icon */}
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-lg font-bold text-yellow-400">{prizePool}</span>
            </div>

            {/* Participants progress section */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        Participants
                    </span>
                    <span className="font-medium text-foreground">
                        {currentSlots}/{maxSlots}
                    </span>
                </div>

                {/* Animated progress bar */}
                <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${participantPercentage}%` }}
                    >
                        {/* GSAP Shimmer effect */}
                        <GsapShimmer />
                    </div>
                </div>
            </div>

            {/* Entry fee and Join button */}
            <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-foreground">{entryFee}</span>
                </div>

                {/* Join Dialog */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <button disabled={isFull} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/50 font-rajdhani disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
                            {isFull ? "FULL" : "Join Now"}
                        </button>
                    </DialogTrigger>
                    <DialogContent className="glass-effect border-border">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold font-rajdhani">Join Tournament</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="ingameName" className="text-sm font-medium">In-Game Name</Label>
                                <Input
                                    id="ingameName"
                                    placeholder="Enter your in-game ID"
                                    value={ingameName}
                                    onChange={(e) => setIngameName(e.target.value)}
                                    className="mt-2 bg-card/50 border-border focus:border-primary transition-colors"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Entry Fee:</span>
                                    <span className="font-bold text-foreground">₹{feeAmount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Prize Pool:</span>
                                    <span className="font-bold text-yellow-400">₹{prizePool}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-border/30 pt-3">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Wallet className="w-4 h-4" />
                                        Your Balance:
                                    </span>
                                    {balanceLoading ? (
                                        <GsapLoaderInline size="sm" className="text-muted-foreground" />
                                    ) : (
                                        <span className={`font-bold ${hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}`}>
                                            ₹{userBalance ?? 0}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Insufficient Balance Warning */}
                            {hasInsufficientBalance && !balanceLoading && (
                                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-2">
                                        <p className="text-sm text-red-400 font-medium">
                                            Insufficient Balance!
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            You need ₹{amountNeeded.toFixed(2)} more to join this tournament.
                                        </p>
                                        <Link
                                            href="/wallet"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <Wallet className="w-3.5 h-3.5" />
                                            Top Up Wallet
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isLoading}
                                className="border-border hover:bg-muted/50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleJoin}
                                disabled={isLoading || hasInsufficientBalance || balanceLoading}
                                className="btn-premium"
                            >
                                {isLoading && <GsapLoaderInline size="sm" className="mr-2" />}
                                {isLoading ? "Joining..." : hasInsufficientBalance ? "Insufficient Balance" : "Confirm Join"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Glow effect on hover */}
            <div className="absolute -inset-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 rounded-xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 -z-10" />
        </div>
    );
}
