"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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
import { Search, IndianRupee, TrendingUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";

interface Payout {
    id: string;
    period: string; // e.g., "January 2026"
    amount: number;
    status: 'pending' | 'processing' | 'paid';
    requestedAt?: any;
    paidAt?: any;
}

const ITEMS_PER_PAGE = 10;

// Mock data for demonstration
const MOCK_PAYOUTS: Payout[] = [
    { id: "payout_001", period: "December 2025", amount: 15000, status: "paid", requestedAt: new Date("2025-12-31"), paidAt: new Date("2026-01-05") },
    { id: "payout_002", period: "November 2025", amount: 12500, status: "paid", requestedAt: new Date("2025-11-30"), paidAt: new Date("2025-12-05") },
    { id: "payout_003", period: "October 2025", amount: 14000, status: "paid", requestedAt: new Date("2025-10-31"), paidAt: new Date("2025-11-05") },
    { id: "payout_004", period: "September 2025", amount: 13000, status: "paid", requestedAt: new Date("2025-09-30"), paidAt: new Date("2025-10-05") },
    { id: "payout_005", period: "January 2026", amount: 16000, status: "processing", requestedAt: new Date("2026-01-01") },
];

export default function ModeratorPayouts() {
    const headerRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Simulate data fetch
    useEffect(() => {
        setTimeout(() => {
            setPayouts(MOCK_PAYOUTS);
            setLoading(false);
        }, 500);
    }, []);

    // Entrance animations
    useEffect(() => {
        const tl = gsap.timeline();

        tl.fromTo(headerRef.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        )
            .fromTo(statsRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
                "-=0.4"
            )
            .fromTo(tableRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
                "-=0.4"
            );
    }, []);

    // Calculate stats
    const totalEarnings = useMemo(() =>
        payouts
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0),
        [payouts]
    );

    const pendingAmount = useMemo(() =>
        payouts
            .filter(p => p.status === 'pending' || p.status === 'processing')
            .reduce((sum, p) => sum + p.amount, 0),
        [payouts]
    );

    // Filter payouts
    const filteredPayouts = useMemo(() => {
        return payouts.filter(p =>
            p.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [payouts, searchQuery]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid": return "default";
            case "processing": return "secondary";
            case "pending": return "outline";
            default: return "outline";
        }
    };

    const formatDate = (date: any) => {
        if (!date) return "N/A";
        if (date.toDate) return date.toDate().toLocaleDateString();
        return new Date(date).toLocaleDateString();
    };

    // Pagination
    const totalPages = Math.ceil(filteredPayouts.length / ITEMS_PER_PAGE);
    const paginatedPayouts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredPayouts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredPayouts, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredPayouts.length]);

    // GSAP Hover Animations for rows
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
            <div className="flex items-center justify-center min-h-[400px]">
                <GsapLoaderInline className="mr-2 text-primary" />
                <span className="text-muted-foreground font-rajdhani">Loading payouts...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 w-full max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-rajdhani flex items-center gap-2">
                        <IndianRupee className="h-8 w-8 text-primary" />
                        Moderator Payouts
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track your earnings and payment history.
                    </p>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by period or ID..."
                        className="pl-9 w-[250px] bg-background/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-background/60 backdrop-blur-xl border-primary/10 shadow-lg hover:shadow-primary/5 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
                        <Calendar className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-orange-500">
                            ₹{pendingAmount.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Awaiting processing
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 backdrop-blur-xl border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Total Earnings</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-primary">
                            ₹{totalEarnings.toLocaleString()}
                        </div>
                        <p className="text-xs text-primary/70 mt-1">
                            Lifetime paid amount
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Payout History Table */}
            <div ref={tableRef} className="space-y-4">
                <h2 className="text-xl font-semibold font-rajdhani flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green-500" />
                    Payment History
                </h2>

                <div className="rounded-md border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[120px]">Payout ID</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Requested</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPayouts.map((payout) => (
                                <TableRow
                                    key={payout.id}
                                    className="group transition-colors cursor-default border-b border-border/40 last:border-0"
                                    onMouseEnter={onRowEnter}
                                    onMouseLeave={onRowLeave}
                                >
                                    <TableCell className="font-mono text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                        {payout.id.substring(0, 12)}...
                                    </TableCell>
                                    <TableCell className="font-medium">{payout.period}</TableCell>
                                    <TableCell>{formatDate(payout.requestedAt)}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(payout.status) as any} className="capitalize shadow-sm">
                                            {payout.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold font-mono text-green-500">
                                        ₹{payout.amount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginatedPayouts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No payout records found.
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
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
