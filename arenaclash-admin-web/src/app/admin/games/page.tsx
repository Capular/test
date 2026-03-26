"use client";

import AdminGames from "@/components/admin/AdminGames";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function GamesPage() {
    const headerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (headerRef.current && contentRef.current) {
            gsap.fromTo(headerRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" });
            gsap.fromTo(contentRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out", delay: 0.1 });
        }
    }, []);

    return (
        <div className="space-y-6">
            <div ref={headerRef}>
                <h1 className="text-2xl font-bold font-rajdhani text-foreground">Games Management</h1>
                <p className="text-sm text-muted-foreground">Add or remove games available on the platform</p>
            </div>
            <div ref={contentRef}>
                <AdminGames />
            </div>
        </div>
    );
}
