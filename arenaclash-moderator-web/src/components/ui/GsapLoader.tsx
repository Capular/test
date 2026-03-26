"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface GsapLoaderProps {
    className?: string;
    size?: "sm" | "md" | "lg";
    duration?: number;
}

/**
 * GSAP-powered spinning loader component
 * Replaces all animate-spin usage in the application
 */
export default function GsapLoader({
    className,
    size = "md",
    duration = 1,
}: GsapLoaderProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const animation = gsap.to(ref.current, {
            rotation: 360,
            duration,
            ease: "none",
            repeat: -1,
            transformOrigin: "center center",
        });

        return () => {
            animation.kill();
        };
    }, [duration]);

    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
    };

    return (
        <div
            ref={ref}
            className={cn(
                "rounded-full border-primary/30 border-t-primary",
                sizeClasses[size],
                className
            )}
        />
    );
}

/**
 * Inline loader variant that matches Loader2 icon styling
 */
export function GsapLoaderInline({
    className,
    size = "md",
    duration = 1,
}: GsapLoaderProps) {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const animation = gsap.to(ref.current, {
            rotation: 360,
            duration,
            ease: "none",
            repeat: -1,
            transformOrigin: "center center",
        });

        return () => {
            animation.kill();
        };
    }, [duration]);

    const sizeMap = {
        sm: 16,
        md: 20,
        lg: 24,
    };

    const iconSize = sizeMap[size];

    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("lucide lucide-loader-2", className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}

/**
 * Full-page centered loader
 */
export function GsapLoaderFullPage({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
    return (
        <div className="flex items-center justify-center h-64">
            <GsapLoader size={size} className="border-t-primary border-b-primary" />
        </div>
    );
}
