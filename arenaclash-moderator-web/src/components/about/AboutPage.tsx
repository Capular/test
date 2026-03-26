"use client";

import { useRef, useCallback } from "react";
import { Zap, Shield, Clock, Users, Trophy, Globe, Twitter, MessageCircle } from "lucide-react";
import gsap from "gsap";
import usePageReveal from "@/hooks/usePageReveal";

// Shadcn UI
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
    { icon: Zap, title: "Instant Payouts", description: "Winnings credited to your wallet within minutes." },
    { icon: Shield, title: "Secure Platform", description: "Bank-grade encryption and fraud protection." },
    { icon: Clock, title: "24/7 Support", description: "Our team is always here to help you." },
    { icon: Users, title: "Active Community", description: "Join thousands of competitive gamers." },
    { icon: Trophy, title: "Daily Tournaments", description: "Fresh competitions every single day." },
    { icon: Globe, title: "Pan-India", description: "Compete with players from across the country." },
];

const SOCIALS = [
    { icon: Twitter, label: "Twitter", href: "#" },
    { icon: MessageCircle, label: "Discord", href: "#" },
];

// Lightweight Feature Card - minimal GSAP, GPU-friendly
function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleEnter = useCallback(() => {
        gsap.to(cardRef.current, {
            y: -3,
            duration: 0.2,
            ease: "power2.out",
            overwrite: true
        });
    }, []);

    const handleLeave = useCallback(() => {
        gsap.to(cardRef.current, {
            y: 0,
            duration: 0.15,
            ease: "power2.out",
            overwrite: true
        });
    }, []);

    return (
        <div
            ref={cardRef}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="rounded-lg border bg-card/50 border-border/50 cursor-pointer will-change-transform"
        >
            <div className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <feature.icon size={22} />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
            </div>
        </div>
    );
}

// Simple Social Button
function SocialButton({ social }: { social: typeof SOCIALS[0] }) {
    const btnRef = useRef<HTMLAnchorElement>(null);

    const handleEnter = useCallback(() => {
        gsap.to(btnRef.current, { scale: 1.05, duration: 0.15, ease: "power2.out", overwrite: true });
    }, []);

    const handleLeave = useCallback(() => {
        gsap.to(btnRef.current, { scale: 1, duration: 0.1, ease: "power2.out", overwrite: true });
    }, []);

    return (
        <a
            ref={btnRef}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium border border-border bg-background h-10 px-4 py-2 will-change-transform"
        >
            <social.icon size={18} />
            {social.label}
        </a>
    );
}

export default function AboutPage() {
    const containerRef = usePageReveal<HTMLDivElement>();

    return (
        <div ref={containerRef} className="space-y-16 p-4 lg:p-6 w-full opacity-0">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto pt-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                    <Trophy size={16} />
                    India&apos;s Premier Esports Platform
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground font-rajdhani mb-4 leading-tight">
                    Revolutionizing <span className="text-primary">Esports</span> Tournaments
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    ANU PAID SCRIM is where passion meets competition. We provide a fair, exciting, and rewarding platform for mobile gamers to showcase their skills and win real prizes.
                </p>
            </div>

            {/* Mission */}
            <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-border/30 rounded-lg max-w-3xl mx-auto overflow-hidden">
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-foreground font-rajdhani mb-3">Our Mission</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        To democratize esports by making competitive gaming accessible to everyone. We believe that every gamer, regardless of their background, deserves a platform to compete, grow, and be recognized for their talent.
                    </p>
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground font-rajdhani text-center mb-8">Why Choose ANU PAID SCRIM?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map((feature) => (
                        <FeatureCard key={feature.title} feature={feature} />
                    ))}
                </div>
            </div>

            {/* Community / Socials */}
            <div className="text-center max-w-xl mx-auto pb-8">
                <h2 className="text-2xl font-bold text-foreground font-rajdhani mb-3">Join the Community</h2>
                <p className="text-muted-foreground mb-6">
                    Stay updated, find teammates, and be part of the action.
                </p>
                <div className="flex items-center justify-center gap-4">
                    {SOCIALS.map((social) => (
                        <SocialButton key={social.label} social={social} />
                    ))}
                </div>
            </div>
        </div>
    );
}
