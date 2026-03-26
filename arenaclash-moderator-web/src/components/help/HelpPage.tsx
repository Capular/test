"use client";

import { useState, useRef } from "react";
import { Search, HelpCircle, CreditCard, User, Trophy, ChevronRight, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import gsap from "gsap"; // Kept for SupportCTA hover only
import usePageReveal from "@/hooks/usePageReveal";

// Shadcn UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const FAQ_DATA = [
    {
        category: "General",
        icon: HelpCircle,
        questions: [
            { q: "What is ANU PAID SCRIM?", a: "ANU PAID SCRIM is a premier mobile esports tournament platform where you can compete in your favorite games, win prizes, and connect with fellow gamers." },
            { q: "How do I get started?", a: "Simply create an account, browse available tournaments, and register for one that interests you. Make sure to link your game account for verification." },
            { q: "Is ANU PAID SCRIM free to use?", a: "Yes! Creating an account and browsing tournaments is completely free. Some tournaments have entry fees, while others are free to enter." },
        ]
    },
    {
        category: "Account",
        icon: User,
        questions: [
            { q: "How do I reset my password?", a: "Go to the login page and click 'Forgot Password'. Enter your registered email and follow the instructions sent to your inbox." },
            { q: "Can I change my username?", a: "Yes, you can change your username once every 30 days from your Profile settings." },
            { q: "How do I link my game account?", a: "Navigate to Profile > Linked Accounts and follow the prompts for each game you wish to connect." },
        ]
    },
    {
        category: "Payments",
        icon: CreditCard,
        questions: [
            { q: "What payment methods are accepted?", a: "We accept UPI, credit/debit cards, and popular digital wallets. All transactions are processed securely." },
            { q: "How long do withdrawals take?", a: "Withdrawals are typically processed within 24-48 hours. Bank transfers may take an additional 1-3 business days." },
            { q: "Is there a minimum withdrawal amount?", a: "Yes, the minimum withdrawal amount is ₹100. This helps us manage transaction fees efficiently." },
        ]
    },
    {
        category: "Tournaments",
        icon: Trophy,
        questions: [
            { q: "How do I join a tournament?", a: "Find a tournament you like, click 'Register', and pay the entry fee (if any). You'll receive updates and the room code before the match starts." },
            { q: "What happens if I miss my match?", a: "If you miss your scheduled match without prior notice, you may be disqualified. Always check the tournament schedule." },
            { q: "How are winners determined?", a: "Winners are determined based on the game's official scoring system. Our admins verify all results before prize distribution." },
            { q: "Can I get a refund if a tournament is cancelled?", a: "Yes, if a tournament is cancelled by organizers, your entry fee will be fully refunded to your wallet within 24 hours." },
        ]
    },
];

export default function HelpPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const gridRef = usePageReveal<HTMLDivElement>({ staggerChildren: true });

    const filteredFAQ = FAQ_DATA.map(cat => ({
        ...cat,
        questions: cat.questions.filter(faq =>
            faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.questions.length > 0);

    return (
        <div className="space-y-8 p-4 lg:p-6 w-full">
            {/* Header - No Animation for Instant FCP */}
            <div className="text-center max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-foreground font-rajdhani mb-2">Help & FAQ</h1>
                <p className="text-muted-foreground">Find answers to common questions or reach out to our support team.</p>
            </div>

            {/* Search */}
            <div className="max-w-xl mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input
                        placeholder="Search for answers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 py-6 text-base bg-card border-border/50 rounded-xl"
                    />
                </div>
            </div>

            {/* FAQ Categories - GSAP Animation */}
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto opacity-0">
                {filteredFAQ.map((category, idx) => (
                    <Card
                        key={category.category}
                        className="bg-card/50 border-border/50 overflow-hidden"
                    >
                        <CardHeader className="pb-2 flex flex-row items-center gap-3 border-b border-border/30">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <category.icon size={20} />
                            </div>
                            <CardTitle className="text-lg font-rajdhani">{category.category}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {category.questions.map((faq, idx2) => (
                                <div key={idx2} className="space-y-1">
                                    <h4 className="text-sm font-medium text-foreground">{faq.q}</h4>
                                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* No Results */}
            {filteredFAQ.length === 0 && searchQuery && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                        <HelpCircle size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">No results found</h3>
                    <p className="text-sm text-muted-foreground">Try different keywords or create a support ticket.</p>
                </div>
            )}

            {/* Support CTA with GSAP Hover */}
            <div className="mt-8">
                <SupportCTA onContactClick={() => router.push('/support')} />
            </div>
        </div>
    );
}

// Separate component for GSAP hover
function SupportCTA({ onContactClick }: { onContactClick: () => void }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleCardEnter = () => {
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                scale: 1.02,
                boxShadow: "0 8px 30px rgba(var(--primary-rgb, 99, 102, 241), 0.15)",
                duration: 0.25,
                ease: "power2.out"
            });
        }
    };

    const handleCardLeave = () => {
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                scale: 1,
                boxShadow: "none",
                duration: 0.2,
                ease: "power2.out"
            });
        }
    };

    const handleButtonEnter = () => {
        if (buttonRef.current) {
            gsap.to(buttonRef.current, {
                scale: 1.05,
                duration: 0.2,
                ease: "power2.out"
            });
        }
    };

    const handleButtonLeave = () => {
        if (buttonRef.current) {
            gsap.to(buttonRef.current, {
                scale: 1,
                duration: 0.15,
                ease: "power2.out"
            });
        }
    };

    return (
        <Card
            ref={cardRef}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
            className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 max-w-2xl mx-auto cursor-pointer"
        >
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/20 text-primary">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Still need help?</h3>
                        <p className="text-sm text-muted-foreground">Our support team is here for you 24/7.</p>
                    </div>
                </div>
                <button
                    ref={buttonRef}
                    onClick={onContactClick}
                    onMouseEnter={handleButtonEnter}
                    onMouseLeave={handleButtonLeave}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground h-10 px-4 py-2 gap-2 shrink-0"
                >
                    Contact Support
                    <ChevronRight size={16} />
                </button>
            </CardContent>
        </Card>
    );
}
