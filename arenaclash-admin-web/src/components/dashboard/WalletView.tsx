"use client";

import { CreditCard, ArrowUpRight, ArrowDownLeft, History, Loader2, ChevronLeft, ChevronRight, XCircle, Clock, Hash, Building2, FileText, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { doc, onSnapshot, collection, query, where, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { tenantUserRef } from "@/lib/tenant-user-client";
import PaymentModal from "@/components/payment/PaymentModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import usePageReveal from "@/hooks/usePageReveal";

interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'entry' | 'prize';
    amount: number;
    timestamp: any;
    description: string;
    status?: 'pending' | 'success' | 'failed';
    orderId?: string;
    gatewayOrderId?: string;
    paymentMethod?: string;
    tournamentId?: string;
}

const TYPE_LABELS: Record<string, { label: string; merchant: string }> = {
    deposit: { label: 'Wallet Top-up', merchant: 'PhonePe Payment Gateway' },
    withdrawal: { label: 'Withdrawal', merchant: 'Bank Transfer' },
    entry: { label: 'Tournament Entry', merchant: 'ANU PAID SCRIM Internal' },
    prize: { label: 'Prize Winnings', merchant: 'ANU PAID SCRIM Internal' },
};

// Transaction Row Component with GSAP hover animation
interface TransactionRowProps {
    tx: Transaction;
    style: {
        bgClass: string;
        icon: React.ReactNode;
        amountClass: string;
        prefix: string;
    };
    onClick: () => void;
}

function TransactionRow({ tx, style, onClick }: TransactionRowProps) {
    const rowRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (rowRef.current) {
            gsap.to(rowRef.current, {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                scale: 1.01,
                x: 4,
                duration: 0.2,
                ease: 'power2.out'
            });
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (rowRef.current) {
            gsap.to(rowRef.current, {
                backgroundColor: 'rgba(0, 0, 0, 0)',
                scale: 1,
                x: 0,
                duration: 0.2,
                ease: 'power2.out'
            });
        }
    }, []);

    return (
        <div
            ref={rowRef}
            className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 cursor-pointer rounded-lg px-2 -mx-2"
            style={{ willChange: 'transform, background-color' }}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${style.bgClass}`}>
                    {style.icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{tx.description || tx.type}</p>
                        {tx.status === 'failed' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-medium uppercase">
                                Failed
                            </span>
                        )}
                        {tx.status === 'pending' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-medium uppercase">
                                Pending
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : 'Just now'}
                    </p>
                </div>
            </div>
            <span className={`text-sm font-semibold ${style.amountClass}`}>
                {style.prefix}₹{tx.amount.toFixed(2)}
            </span>
        </div>
    );
}

// Transaction Detail Dialog with full GSAP animations (optimized for performance)
interface TransactionDetailDialogProps {
    transaction: Transaction | null;
    onClose: () => void;
    getTransactionStyle: (tx: Transaction) => {
        bgClass: string;
        icon: React.ReactNode;
        amountClass: string;
        prefix: string;
    };
}

function TransactionDetailDialog({ transaction, onClose, getTransactionStyle }: TransactionDetailDialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const detailRowsRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Handle open animation
    useEffect(() => {
        if (transaction) {
            setIsVisible(true);

            // Wait for DOM to be ready
            requestAnimationFrame(() => {
                const ctx = gsap.context(() => {
                    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

                    // 1. Fade in overlay (Removed backdrop-blur for performance)
                    if (overlayRef.current) {
                        gsap.set(overlayRef.current, { opacity: 0 });
                        tl.to(overlayRef.current, {
                            opacity: 1,
                            duration: 0.2
                        });
                    }

                    // 2. Dialog entrance - scale and slide from center
                    if (dialogRef.current) {
                        gsap.set(dialogRef.current, {
                            opacity: 0,
                            scale: 0.92,
                            y: 20,
                            rotationX: 10
                        });
                        tl.to(dialogRef.current, {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            rotationX: 0,
                            duration: 0.4,
                            ease: 'back.out(1.2)'
                        }, '-=0.1');
                    }

                    // 3. Title slide in
                    if (titleRef.current) {
                        gsap.set(titleRef.current, { opacity: 0, x: -10 });
                        tl.to(titleRef.current, {
                            opacity: 1,
                            x: 0,
                            duration: 0.3,
                            ease: 'power2.out'
                        }, '-=0.25');
                    }

                    // 4. Amount header scale up with mild bounce
                    if (headerRef.current) {
                        gsap.set(headerRef.current, { opacity: 0, scale: 0.8, y: 10 });
                        tl.to(headerRef.current, {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            duration: 0.4,
                            ease: 'back.out(1.5)'
                        }, '-=0.2');
                    }

                    // 5. Detail rows stagger slide in
                    if (detailRowsRef.current) {
                        const rows = detailRowsRef.current.children;
                        gsap.set(rows, { opacity: 0, y: 15, x: -5 });
                        tl.to(rows, {
                            opacity: 1,
                            y: 0,
                            x: 0,
                            duration: 0.3,
                            stagger: 0.05,
                            ease: 'power2.out'
                        }, '-=0.25');
                    }

                    // 6. Close button fade in
                    if (closeButtonRef.current) {
                        gsap.set(closeButtonRef.current, { opacity: 0, y: 10 });
                        tl.to(closeButtonRef.current, {
                            opacity: 1,
                            y: 0,
                            duration: 0.3,
                            ease: 'power2.out'
                        }, '-=0.1');
                    }
                });

                return () => ctx.revert();
            });
        }
    }, [transaction]);

    // Handle close with animation
    const handleClose = useCallback(() => {
        const tl = gsap.timeline({
            defaults: { ease: 'power4.in' },
            onComplete: () => {
                setIsVisible(false);
                onClose();
            }
        });

        // Animate out
        if (dialogRef.current) {
            tl.to(dialogRef.current, {
                opacity: 0,
                scale: 0.95,
                y: 10,
                duration: 0.15
            });
        }
        if (overlayRef.current) {
            tl.to(overlayRef.current, {
                opacity: 0,
                duration: 0.1
            }, '-=0.1');
        }
    }, [onClose]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && transaction) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [transaction, handleClose]);

    if (!transaction || !isVisible) return null;

    const style = getTransactionStyle(transaction);
    const typeInfo = TYPE_LABELS[transaction.type] || { label: transaction.type, merchant: 'Unknown' };
    const txDate = transaction.timestamp?.toDate ? transaction.timestamp.toDate() : new Date();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/80"
                style={{ willChange: 'opacity' }}
                onClick={handleClose}
            />

            {/* Dialog Container */}
            <div
                className="relative w-full max-w-md pointer-events-none"
                style={{ perspective: '1000px' }}
            >
                <div
                    ref={dialogRef}
                    className="relative w-full border border-white/10 rounded-xl p-6 shadow-2xl pointer-events-auto overflow-hidden"
                    style={{
                        transformStyle: 'preserve-3d',
                        willChange: 'transform, opacity',
                        background: 'linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 25, 0.98) 100%)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close X Button */}
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <XCircle className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </button>

                    {/* Title */}
                    <h2
                        ref={titleRef}
                        className="text-xl font-bold font-rajdhani mb-4"
                    >
                        Transaction Details
                    </h2>

                    {/* Content */}
                    <div className="space-y-4">
                        {/* Amount Header */}
                        <div
                            ref={headerRef}
                            className="text-center py-4 bg-muted/20 rounded-xl border border-border/50"
                        >
                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${style.bgClass}`}>
                                {style.icon}
                            </div>
                            <p className="text-3xl font-bold font-rajdhani ${style.amountClass}">
                                {style.prefix}₹{transaction.amount.toFixed(2)}
                                {transaction.status === 'pending' && <span className="text-sm font-normal text-muted-foreground ml-2">(Pending)</span>}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{transaction.description || typeInfo.label}</p>

                            {/* Status Badge */}
                            <div className="mt-3">
                                {transaction.status === 'success' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Success
                                    </span>
                                )}
                                {transaction.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                                        <Clock className="w-3.5 h-3.5" />
                                        Pending
                                    </span>
                                )}
                                {transaction.status === 'failed' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                                        <XCircle className="w-3.5 h-3.5" />
                                        Failed
                                    </span>
                                )}
                                {!transaction.status && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Completed
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Detail Rows */}
                        <div ref={detailRowsRef} className="space-y-3">
                            {/* Transaction ID (Gateway Order ID preferred) */}
                            <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                                <Hash className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Transaction ID</p>
                                    <p className="text-sm font-medium text-foreground font-mono truncate">
                                        {transaction.gatewayOrderId || transaction.orderId || transaction.id}
                                    </p>
                                </div>
                            </div>

                            {/* Internal Reference ID (if showing Order ID above) */}
                            {(transaction.gatewayOrderId || transaction.orderId) && (
                                <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">Reference ID</p>
                                        <p className="text-sm font-medium text-muted-foreground font-mono truncate text-[10px]">{transaction.id}</p>
                                    </div>
                                </div>
                            )}

                            {/* Date & Time */}
                            <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Date & Time</p>
                                    <p className="text-sm font-medium text-foreground">
                                        {txDate.toLocaleDateString('en-IN', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {txDate.toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: true
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Transaction Type */}
                            <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                                <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Transaction Type</p>
                                    <p className="text-sm font-medium text-foreground">{typeInfo.label}</p>
                                </div>
                            </div>

                            {/* Merchant / Source */}
                            <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Merchant / Source</p>
                                    <p className="text-sm font-medium text-foreground">{typeInfo.merchant}</p>
                                </div>
                            </div>

                            {/* Order ID (if available) */}
                            {transaction.orderId && (
                                <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">Order ID</p>
                                        <p className="text-sm font-medium text-foreground font-mono truncate">{transaction.orderId}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            {transaction.status === 'pending' && (
                                <Button
                                    className="flex-1 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/50 hover:text-yellow-400"
                                    variant="outline"
                                    onClick={async () => {
                                        const toastId = toast.loading("Verifying payment status...");
                                        try {
                                            const orderId = transaction.gatewayOrderId || transaction.orderId;
                                            if (!orderId) throw new Error("No Order ID found");

                                            const res = await fetch('/api/payment/status', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ orderId })
                                            });
                                            const data = await res.json();

                                            if (data.status === 'success' || (data.result && data.result.status === 'success')) {
                                                // Client-side fallback: Update status manually since server might lack permissions
                                                await updateDoc(doc(db, "transactions", transaction.id), {
                                                    status: 'success',
                                                    paymentMethod: 'ZapUPI (Verified)',
                                                    updatedAt: Timestamp.now()
                                                });

                                                toast.success(`Verified: ${data.message || "Payment Successful"}`, { id: toastId });
                                                handleClose();
                                            } else {
                                                // Show the actual error/message from the gateway/API
                                                toast.error(`Verification Result: ${data.error || data.message || "Payment not successful"}`, { id: toastId });
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            toast.error("Network error during verification", { id: toastId });
                                        }
                                    }}
                                >
                                    Verify Status
                                </Button>
                            )}
                            <Button
                                ref={closeButtonRef}
                                className={transaction.status === 'pending' ? "flex-1" : "w-full"}
                                variant="outline"
                                onClick={handleClose}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const TRANSACTIONS_PER_PAGE = 10;

export default function WalletView() {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({ winnings: 0, spent: 0 });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    // Standardized page reveal
    const containerRef = usePageReveal<HTMLDivElement>();

    // Calculate pagination
    const totalPages = Math.ceil(allTransactions.length / TRANSACTIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    const endIndex = startIndex + TRANSACTIONS_PER_PAGE;
    const displayedTransactions = allTransactions.slice(startIndex, endIndex);

    useEffect(() => {
        if (!user) return;

        const userUnsub = onSnapshot(tenantUserRef(db, user.uid), (doc) => {
            if (doc.exists()) {
                setBalance(doc.data().walletBalance || 0);
            }
        }, (error) => {
            console.error("Error fetching user wallet balance:", error);
        });

        const q = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid)
        );

        const txUnsub = onSnapshot(q, (snapshot) => {
            const txs: Transaction[] = [];
            let totalWinnings = 0;
            let totalSpent = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                txs.push({
                    id: doc.id,
                    type: data.type,
                    amount: data.amount,
                    timestamp: data.timestamp,
                    description: data.description,
                    status: data.status,
                    gatewayOrderId: data.gatewayOrderId,
                    orderId: data.orderId,
                });

                // Only count successful transactions for stats
                if (data.status !== 'failed') {
                    if (data.type === 'prize') totalWinnings += data.amount;
                    if (data.type === 'entry') totalSpent += data.amount;
                }
            });

            txs.sort((a, b) => {
                const timeA = a.timestamp?.seconds || 0;
                const timeB = b.timestamp?.seconds || 0;
                return timeB - timeA;
            });

            setAllTransactions(txs);
            setStats({ winnings: totalWinnings, spent: totalSpent });
            setLoading(false);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            setLoading(false);
        });

        return () => {
            userUnsub();
            txUnsub();
        };
    }, [user]);

    // Reset to page 1 if current page exceeds total pages
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    // Helper to get transaction icon and styling based on type and status
    const getTransactionStyle = (tx: Transaction) => {
        // Failed transactions always show red
        if (tx.status === 'failed') {
            return {
                bgClass: 'bg-red-500/10 text-red-500',
                icon: <XCircle size={16} />,
                amountClass: 'text-red-500',
                prefix: ''
            };
        }

        // Successful or pending deposits/prizes show green
        if (tx.type === 'prize' || tx.type === 'deposit') {
            return {
                bgClass: 'bg-green-500/10 text-green-500',
                icon: <ArrowDownLeft size={16} />,
                amountClass: 'text-green-500',
                prefix: '+'
            };
        }

        // Entry fees and withdrawals show muted
        return {
            bgClass: 'bg-muted text-muted-foreground',
            icon: <ArrowUpRight size={16} />,
            amountClass: 'text-foreground',
            prefix: '-'
        };
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <h2 className="text-lg font-semibold text-foreground mb-2">Login Required</h2>
                <p className="text-sm text-muted-foreground">Please login to access your wallet.</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} data-page-content className="space-y-6 p-4 lg:p-6 opacity-0">
            {loading ? (
                /* Skeleton Loading State */
                <div className="space-y-6">
                    {/* Balance Card Skeleton */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="w-4 h-4 rounded" />
                            <Skeleton className="w-16 h-3" />
                        </div>
                        <Skeleton className="h-9 w-32 mb-4" />
                        <div className="flex gap-3">
                            <Skeleton className="flex-1 h-10 rounded-lg" />
                            <Skeleton className="flex-1 h-10 rounded-lg" />
                        </div>
                    </div>

                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="w-4 h-4 rounded" />
                                <Skeleton className="w-16 h-3" />
                            </div>
                            <Skeleton className="h-6 w-24" />
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="w-4 h-4 rounded" />
                                <Skeleton className="w-16 h-3" />
                            </div>
                            <Skeleton className="h-6 w-24" />
                        </div>
                    </div>

                    {/* Transactions Skeleton */}
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Skeleton className="w-4 h-4 rounded" />
                            <Skeleton className="w-32 h-5" />
                        </div>
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-9 h-9 rounded-lg" />
                                        <div className="space-y-1.5">
                                            <Skeleton className="w-28 h-4" />
                                            <Skeleton className="w-20 h-3" />
                                        </div>
                                    </div>
                                    <Skeleton className="w-16 h-5" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Balance Card */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Balance</span>
                        </div>
                        <h2 className="text-3xl font-bold text-foreground font-rajdhani mb-4">
                            ₹{balance.toFixed(2)}
                        </h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
                            >
                                Add Funds
                            </button>
                            <button className="flex-1 bg-muted text-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-muted/80 transition-colors">
                                Withdraw
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowDownLeft className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-muted-foreground">Winnings</span>
                            </div>
                            <p className="text-xl font-bold text-green-500 font-rajdhani">₹{stats.winnings.toFixed(2)}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Spent</span>
                            </div>
                            <p className="text-xl font-bold text-foreground font-rajdhani">₹{stats.spent.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Transactions with Pagination */}
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <History className="w-4 h-4 text-muted-foreground" />
                                Transaction History
                            </h3>
                            {allTransactions.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    {allTransactions.length} total
                                </span>
                            )}
                        </div>

                        {allTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    {displayedTransactions.map((tx) => {
                                        const style = getTransactionStyle(tx);
                                        return (
                                            <TransactionRow
                                                key={tx.id}
                                                tx={tx}
                                                style={style}
                                                onClick={() => setSelectedTransaction(tx)}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToPrevPage}
                                            disabled={currentPage === 1}
                                            className="flex items-center gap-1 border-border hover:bg-muted/50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Previous
                                        </Button>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                Page <span className="font-medium text-foreground">{currentPage}</span> of <span className="font-medium text-foreground">{totalPages}</span>
                                            </span>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToNextPage}
                                            disabled={currentPage === totalPages}
                                            className="flex items-center gap-1 border-border hover:bg-muted/50"
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} uid={user.uid} />

                    {/* Transaction Detail Dialog */}
                    <TransactionDetailDialog
                        transaction={selectedTransaction}
                        onClose={() => setSelectedTransaction(null)}
                        getTransactionStyle={getTransactionStyle}
                    />
                </>
            )}
        </div>
    );
}
