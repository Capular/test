"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

import { collection, onSnapshot, orderBy, query, doc, updateDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { toast } from "sonner";
import { tenantUserRef } from "@/lib/tenant-user-client";

interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'entry' | 'prize';
    amount: number;
    timestamp: any; // Firestore Timestamp
    description?: string;
    status?: 'pending' | 'success' | 'failed' | 'completed';
    userId?: string;
    method?: string;
    gatewayOrderId?: string;
    accountHolderName?: string;
    upiId?: string;
}

const ITEMS_PER_PAGE = 10;

export default function AdminTransactions() {
    const headerRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const tl = gsap.timeline();

        tl.fromTo(headerRef.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        )
            .fromTo(tabsRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
                "-=0.4"
            );
    }, []);

    // Fetch Transactions
    useEffect(() => {
        const q = query(
            collection(db, "transactions"),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const txs: Transaction[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Transaction));

            setTransactions(txs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t =>
        (t.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.gatewayOrderId?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [transactions, searchQuery]);

    const deposits = useMemo(() => filteredTransactions.filter(t => t.type === 'deposit'), [filteredTransactions]);
    const withdrawals = useMemo(() => filteredTransactions.filter(t => t.type === 'withdrawal'), [filteredTransactions]);

    // Analytics Calculation
    const totalDeposits = useMemo(() =>
        transactions
            .filter(t => t.type === 'deposit' && (t.status === 'success' || t.status === 'completed'))
            .reduce((sum, t) => sum + t.amount, 0),
        [transactions]
    );

    const totalWithdrawals = useMemo(() =>
        transactions
            .filter(t => t.type === 'withdrawal' && (t.status === 'success' || t.status === 'completed'))
            .reduce((sum, t) => sum + t.amount, 0),
        [transactions]
    );

    const netCollection = totalDeposits - totalWithdrawals;

    const getStatusColor = (status?: string) => {
        switch (status) {
            case "success":
            case "completed": return "default";
            case "pending": return "secondary";
            case "failed": return "destructive";
            default: return "outline";
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
        return new Date(timestamp).toLocaleDateString();
    };

    const handleApprove = async (txn: Transaction) => {
        try {
            await updateDoc(doc(db, "transactions", txn.id), {
                status: 'success', // or 'completed'
                updatedAt: serverTimestamp()
            });
            toast.success("Withdrawal approved");
        } catch (error) {
            console.error(error);
            toast.error("Failed to approve withdrawal");
        }
    };

    const handleReject = async (txn: Transaction) => {
        if (!confirm("Are you sure you want to reject this withdrawal? The amount will be refunded to the user.")) return;
        
        try {
            await runTransaction(db, async (t) => {
                const txnRef = doc(db, "transactions", txn.id);
                const userRef = tenantUserRef(db, txn.userId!); // Assuming userId exists

                const txnDoc = await t.get(txnRef);
                if (!txnDoc.exists) throw "Transaction does not exist";
                if (txnDoc.data()?.status !== 'pending') throw "Transaction is not pending";

                const userDoc = await t.get(userRef);
                if (!userDoc.exists) throw "User does not exist";

                // Refund
                const currentBalance = userDoc.data()?.walletBalance || 0;
                t.update(userRef, {
                    walletBalance: currentBalance + txn.amount,
                    updatedAt: serverTimestamp()
                });

                t.update(txnRef, {
                    status: 'failed',
                    description: 'Withdrawal Rejected - Refunded',
                    updatedAt: serverTimestamp()
                });
            });
            toast.success("Withdrawal rejected and refunded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to reject withdrawal");
        }
    };

    // --- Pagination Logic ---
    const usePagination = (data: Transaction[]) => {
        const [currentPage, setCurrentPage] = useState(1);
        const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

        const paginatedData = useMemo(() => {
            const start = (currentPage - 1) * ITEMS_PER_PAGE;
            return data.slice(start, start + ITEMS_PER_PAGE);
        }, [data, currentPage]);

        const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
        const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));
        const goToPage = (p: number) => setCurrentPage(Math.min(totalPages, Math.max(1, p)));

        // Reset to page 1 if data changes significantly (e.g. search filter)
        useEffect(() => {
            setCurrentPage(1);
        }, [data.length]);

        return { currentPage, totalPages, paginatedData, nextPage, prevPage, goToPage };
    };

    const TransactionTable = ({ data }: { data: Transaction[] }) => {
        const tableRef = useRef<HTMLTableSectionElement>(null);
        const { currentPage, totalPages, paginatedData, nextPage, prevPage } = usePagination(data);

        // GSAP: Animate rows on page change
        useEffect(() => {
            if (tableRef.current && paginatedData.length > 0) {
                gsap.fromTo(tableRef.current.children,
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" }
                );
            }
        }, [paginatedData]);

        // GSAP Hover Animations
        const onRowEnter = (e: React.MouseEvent<HTMLTableRowElement>) => {
            gsap.to(e.currentTarget, {
                scale: 1.005,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                duration: 0.2,
                ease: "power2.out"
            });
        };

        const onRowLeave = (e: React.MouseEvent<HTMLTableRowElement>) => {
            gsap.to(e.currentTarget, {
                scale: 1,
                backgroundColor: "transparent",
                duration: 0.2,
                ease: "power2.out"
            });
        };

        if (loading) {
            return (
                <div className="flex items-center justify-center p-12 bg-muted/10 rounded-lg border border-border/50">
                    <GsapLoaderInline className="mr-2 text-primary" />
                    <span className="text-muted-foreground font-rajdhani">Loading transactions...</span>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="rounded-md border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[100px]">Txn ID</TableHead>
                                <TableHead>User / Info</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody ref={tableRef}>
                            {paginatedData.map((txn) => (
                                <TableRow
                                    key={txn.id}
                                    className="group transition-colors opacity-0 cursor-default border-b border-border/40 last:border-0"
                                    onMouseEnter={onRowEnter}
                                    onMouseLeave={onRowLeave}
                                >
                                    <TableCell className="font-mono text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                        {txn.gatewayOrderId || txn.id.substring(0, 8) + '...'}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{txn.userId || 'Unknown User'}</span>
                                            {txn.accountHolderName && (
                                                <span className="text-xs font-semibold text-primary">{txn.accountHolderName}</span>
                                            )}
                                            {txn.upiId && (
                                                <span className="text-xs font-mono text-muted-foreground">{txn.upiId}</span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground">{txn.description}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatDate(txn.timestamp)}</TableCell>
                                    <TableCell>{txn.method || txn.type}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(txn.status) as any} className="capitalize shadow-sm">
                                            {txn.status || 'unknown'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-bold font-mono",
                                        txn.type === "deposit" || txn.type === "prize" ? "text-green-500" : "text-red-500"
                                    )}>
                                        {txn.type === "deposit" || txn.type === "prize" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {txn.type === 'withdrawal' && txn.status === 'pending' && (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 h-7 px-2" onClick={() => handleApprove(txn)}>
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleReject(txn)}>
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginatedData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2">
                        <div className="text-sm text-muted-foreground">
                            Page <span className="font-medium text-foreground">{currentPage}</span> of <span className="font-medium text-foreground">{totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 w-full max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-rajdhani flex items-center gap-2">
                        <Wallet className="h-8 w-8 text-primary" />
                        Transactions
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor deposits, withdrawals, and platform analytics.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by ID or User..."
                            className="pl-9 w-[250px] bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div ref={tabsRef}>
                <Tabs defaultValue="deposit" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-[400px] mb-8 bg-muted/40 p-1 mx-auto">
                        <TabsTrigger value="deposit" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                            Deposits
                        </TabsTrigger>
                        <TabsTrigger value="withdrawal" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                            Withdrawals
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                            Analytics
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="deposit" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold font-rajdhani flex items-center gap-2">
                                <ArrowDownLeft className="h-5 w-5 text-green-500" />
                                Recent Deposits
                            </h2>
                            <Badge variant="outline" className="font-mono">
                                Total: {deposits.length}
                            </Badge>
                        </div>
                        <TransactionTable data={deposits} />
                    </TabsContent>

                    <TabsContent value="withdrawal" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold font-rajdhani flex items-center gap-2">
                                <ArrowUpRight className="h-5 w-5 text-red-500" />
                                Withdrawal Requests
                            </h2>
                            <Badge variant="outline" className="font-mono">
                                Total: {withdrawals.length}
                            </Badge>
                        </div>
                        <TransactionTable data={withdrawals} />
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-background/60 backdrop-blur-xl border-primary/10 shadow-lg hover:shadow-primary/5 transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Collection</CardTitle>
                                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold font-mono text-green-500">
                                        +₹{totalDeposits.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Lifetime deposits
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-background/60 backdrop-blur-xl border-primary/10 shadow-lg hover:shadow-primary/5 transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Payouts</CardTitle>
                                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold font-mono text-red-500">
                                        -₹{totalWithdrawals.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Lifetime withdrawals
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-primary/5 backdrop-blur-xl border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-primary">Net Revenue</CardTitle>
                                    <DollarSign className="h-4 w-4 text-primary" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold font-mono text-primary">
                                        ₹{netCollection.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-primary/70 mt-1">
                                        Current available liquid
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
