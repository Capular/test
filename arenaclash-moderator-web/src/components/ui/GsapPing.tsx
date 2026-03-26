"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface GsapPingProps {
    className?: string;
    color?: string;
    size?: "sm" | "md" | "lg";
    duration?: number;
}

/**
 * GSAP-powered ping animation component
 * Replaces animate-ping usage for live indicators
 */
export default function GsapPing({
    className,
    color = "bg-red-400",
    size = "md",
    duration = 1,
}: GsapPingProps) {
    const pingRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!pingRef.current) return;

        const animation = gsap.to(pingRef.current, {
            scale: 2,
            opacity: 0,
            duration,
            ease: "power1.out",
            repeat: -1,
        });

        return () => {
            animation.kill();
        };
    }, [duration]);

    const sizeClasses = {
        sm: "h-2 w-2",
        md: "h-3 w-3",
        lg: "h-4 w-4",
    };

    return (
        <span className={cn("relative flex", sizeClasses[size], className)}>
            <span
                ref={pingRef}
                className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    color
                )}
            />
            <span
                className={cn(
                    "relative inline-flex rounded-full h-full w-full",
                    color.replace("-400", "-500")
                )}
            />
        </span>
    );
}

/**
 * Live indicator with label
 */
export function GsapLiveIndicator({
    label = "Live",
    className,
}: {
    label?: string;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <GsapPing color="bg-red-400" size="md" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                {label}
            </span>
        </div>
    );
}
