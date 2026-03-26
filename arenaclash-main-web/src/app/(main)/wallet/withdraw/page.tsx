"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Wallet, AlertCircle } from "lucide-react";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tenantUserRef } from "@/lib/tenant-user-client";

export default function WithdrawalPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [winnings, setWinnings] = useState(0); // Calculated locally for UI display
    const [amount, setAmount] = useState("");
    const [accountHolderName, setAccountHolderName] = useState("");
    const [upiId, setUpiId] = useState("");

    // Fetch User Data & Calculate Winnings
    useEffect(() => {
        if (!user) return;

        // 1. Listen to Balance
        const unsubUser = onSnapshot(tenantUserRef(db, user.uid), (doc) => {
            if (doc.exists()) {
                setBalance(doc.data().walletBalance || 0);
            }
        });

        // 2. Listen to Transactions to Calculate Winnings
        const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
        const unsubTx = onSnapshot(q, (snapshot) => {
            let totalPrizes = 0;
            let totalWithdrawals = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.type === 'prize') totalPrizes += (data.amount || 0);
                if (data.type === 'withdrawal' && data.status !== 'failed') totalWithdrawals += (data.amount || 0);
            });
            setWinnings(Math.max(0, totalPrizes - totalWithdrawals));
        });

        return () => {
            unsubUser();
            unsubTx();
        };
    }, [user]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const withdrawAmount = Number(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (withdrawAmount > balance) {
            toast.error("Insufficient wallet balance");
            return;
        }

        if (withdrawAmount > winnings) {
            toast.error(`You can only withdraw your winnings (₹${winnings.toFixed(2)})`);
            return;
        }

        if (!accountHolderName.trim()) {
            toast.error("Please enter your account holder name");
            return;
        }

        if (!upiId) {
            toast.error("Please enter a valid UPI ID");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/wallet/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user?.uid,
                    amount: withdrawAmount,
                    accountHolderName: accountHolderName.trim(),
                    upiId,
                    method: 'upi'
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Withdrawal failed");
            }

            toast.success("Withdrawal request submitted successfully!");
            router.push("/wallet");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-lg py-10">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Wallet
            </Button>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-2xl font-rajdhani flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-primary" />
                        Withdraw Funds
                    </CardTitle>
                    <CardDescription>
                        Transfer your winnings to your bank account via UPI.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Balance Info */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
                            <p className="text-lg font-bold font-mono">₹{balance.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Withdrawable Winnings</p>
                            <p className="text-lg font-bold font-mono text-green-500">₹{winnings.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 text-yellow-500 rounded-md text-xs border border-yellow-500/20">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Note: You can only withdraw amounts won from tournaments ("Winnings"). Deposited funds cannot be withdrawn.</p>
                    </div>

                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="1"
                                step="1"
                                required
                                className="font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountHolderName">Account Holder Name</Label>
                            <Input
                                id="accountHolderName"
                                type="text"
                                placeholder="John Doe"
                                value={accountHolderName}
                                onChange={(e) => setAccountHolderName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="upiId">UPI ID</Label>
                            <Input
                                id="upiId"
                                type="text"
                                placeholder="username@upi"
                                value={upiId} // TODO: use user's saved UPI if available
                                onChange={(e) => setUpiId(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">e.g., 9876543210@paytm, name@okhdfcbank</p>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading || winnings <= 0}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing Request...
                                </>
                            ) : (
                                "Request Withdrawal"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
