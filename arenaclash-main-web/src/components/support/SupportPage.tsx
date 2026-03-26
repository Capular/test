"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, MessageSquare, AlertCircle, CheckCircle2, Clock, ChevronRight, Ticket } from "lucide-react";
import gsap from "gsap";
import usePageReveal from "@/hooks/usePageReveal";
import useRowHover from "@/hooks/useRowHover";
import CreateTicketModal from "./CreateTicketModal";
import TicketChatView from "./TicketChatView";
import { useAuth } from "@/components/auth/AuthProvider";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";

// Shadcn UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TicketData {
    id: string;
    subject: string;
    category: string;
    description: string;
    status: string;
    priority: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Ticket Row with standardized hover
function TicketRow({ ticket, onClick }: { ticket: TicketData; onClick: () => void }) {
    const { ref: rowRef, onMouseEnter, onMouseLeave } = useRowHover<HTMLDivElement>();

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
            case 'resolved': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
            case 'closed': return 'bg-muted text-muted-foreground';
            default: return 'bg-primary/10 text-primary';
        }
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'account': return 'Account Issue';
            case 'payment': return 'Payment Problem';
            case 'game': return 'Game Issue';
            case 'bug': return 'Bug Report';
            case 'other': return 'Other';
            default: return cat;
        }
    };

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp?.toDate) return 'Just now';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div
            ref={rowRef}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="flex items-center justify-between p-4 border-b border-border/40 cursor-pointer last:border-0 transition-colors group"
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {ticket.status === 'resolved' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div>
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {ticket.subject}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-5 border-border/50 text-muted-foreground font-normal">
                            {getCategoryLabel(ticket.category)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDate(ticket.createdAt)}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Badge className={`capitalize border-0 ${getStatusStyle(ticket.status)}`}>
                    {ticket.status}
                </Badge>
                <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>
        </div>
    );
}

export default function SupportPage() {
    const { user } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);

    // Standardized page reveal
    const containerRef = usePageReveal<HTMLDivElement>();
    const listRef = useRef<HTMLDivElement>(null);

    // Fetch tickets from Firestore
    useEffect(() => {
        if (!user) {
            setLoading(false);
            setTickets([]);
            return;
        }

        const q = query(
            collection(db, "support_tickets"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ticketData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as TicketData));
            setTickets(ticketData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tickets:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Handle new ticket creation
    const handleTicketCreated = (ticketId: string) => {
        // Find the ticket in the local state if already present, or wait for snapshot
        // We will just let the list update naturally.
    };

    // Stagger list items after loading
    useEffect(() => {
        if (!loading && listRef.current && listRef.current.children.length > 0) {
            gsap.fromTo(listRef.current.children,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power3.out", delay: 0.15, clearProps: "transform" }
            );
        }
    }, [loading, tickets]);

    const filteredTickets = tickets.filter(t =>
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openCount = tickets.filter(t => t.status === 'open').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

    return (
        <div ref={containerRef} className="space-y-6 p-4 lg:p-6 w-full opacity-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-rajdhani">Support Center</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your support tickets and get help</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                    <Plus size={18} />
                    Create Ticket
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary">
                            <MessageSquare size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Tickets</p>
                            <h3 className="text-2xl font-bold font-rajdhani">{tickets.length}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500">
                            <Clock size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Open</p>
                            <h3 className="text-2xl font-bold font-rajdhani">{openCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Resolved</p>
                            <h3 className="text-2xl font-bold font-rajdhani">{resolvedCount}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tickets List */}
            <Card className="bg-card/80 border-border/50 overflow-hidden">
                <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-primary" />
                        Your Tickets
                    </CardTitle>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-muted/30 border-border/50"
                        />
                    </div>
                </CardHeader>

                <div ref={listRef}>
                    {loading ? (
                        <div className="py-16 flex justify-center">
                            <GsapLoaderInline size="lg" />
                        </div>
                    ) : filteredTickets.length > 0 ? (
                        filteredTickets.map((ticket) => (
                            <TicketRow
                                key={ticket.id}
                                ticket={ticket}
                                onClick={() => setSelectedTicket(ticket)}
                            />
                        ))
                    ) : (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                                <MessageSquare size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No tickets found</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {searchQuery ? "Try a different search term" : "You haven't created any support tickets yet."}
                            </p>
                            {!searchQuery && (
                                <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
                                    Create Your First Ticket
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTicketCreated={handleTicketCreated}
            />

            {/* Ticket Chat View */}
            {selectedTicket && (
                <TicketChatView
                    ticketId={selectedTicket.id}
                    ticketSubject={selectedTicket.subject}
                    ticketStatus={selectedTicket.status}
                    onClose={() => setSelectedTicket(null)}
                />
            )}
        </div>
    );
}
