"use client";

import { useEffect, useRef, ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface GsapPulseProps {
    children: ReactNode;
    className?: string;
    duration?: number;
    enabled?: boolean;
}

/**
 * GSAP-powered pulse animation wrapper component
 * Replaces animate-pulse usage for notification badges and live indicators
 */
export default function GsapPulse({
    children,
    className,
    duration = 2,
    enabled = true,
}: GsapPulseProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current || !enabled) return;

        const animation = gsap.to(ref.current, {
            opacity: 0.5,
            duration: duration / 2,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true,
        });

        return () => {
            animation.kill();
        };
    }, [duration, enabled]);

    return (
        <div ref={ref} className={cn(className)}>
            {children}
        </div>
    );
}

/**
 * Notification badge with pulse animation
 */
export function GsapPulseBadge({
    count,
    className,
}: {
    count: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const animation = gsap.to(ref.current, {
            opacity: 0.7,
            scale: 0.95,
            duration: 1,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true,
        });

        return () => {
            animation.kill();
        };
    }, []);

    if (count <= 0) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "w-5 h-5 rounded-full bg-red-500 absolute -top-1 -right-1 z-10 flex items-center justify-center text-[10px] font-bold text-white border-2 border-background",
                className
            )}
        >
            {count}
        </div>
    );
}

/**
 * Shimmer effect component for progress bars
 * Replaces animate-shimmer usage
 */
export function GsapShimmer({ className }: { className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.set(ref.current, { x: "-100%" });

        const animation = gsap.to(ref.current, {
            x: "100%",
            duration: 2,
            ease: "none",
            repeat: -1,
        });

        return () => {
            animation.kill();
        };
    }, []);

    return (
        <div
            ref={ref}
            className={cn(
                "absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent",
                className
            )}
        />
    );
}
