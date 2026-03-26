"use client";

import { useRef, useState } from "react";
import { Swords } from "lucide-react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface GamemodeCardProps {
    mode: string;
    bannerUrl?: string;
    onClick: () => void;
}

export default function GamemodeCard({ mode, bannerUrl, onClick }: GamemodeCardProps) {
    const cardRef = useRef<HTMLButtonElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
        setIsHovered(true);
        gsap.to(cardRef.current, {
            scale: 1.03,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            duration: 0.2,
            ease: "power2.out",
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        gsap.to(cardRef.current, {
            scale: 1,
            boxShadow: "0 0 0 rgba(0,0,0,0)",
            duration: 0.25,
            ease: "power2.out",
        });
    };

    const handleMouseDown = () => {
        gsap.to(cardRef.current, {
            scale: 0.97,
            duration: 0.1,
            ease: "power2.out",
        });
    };

    const handleMouseUp = () => {
        gsap.to(cardRef.current, {
            scale: 1.03,
            duration: 0.1,
            ease: "power2.out",
        });
    };

    return (
        <button
            ref={cardRef}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            className={cn(
                "relative text-left p-4 rounded-xl will-change-transform overflow-hidden w-full min-h-[100px] flex flex-col justify-end group transition-all duration-300",
                !bannerUrl && (isHovered ? "bg-primary/10 border border-primary/50" : "bg-card border border-border/50"),
                bannerUrl && "border border-border/20"
            )}
        >
            {bannerUrl && (
                <>
                    <img
                        src={bannerUrl}
                        alt={mode}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                </>
            )}

            <div className="relative z-10 w-full">
                <span className={cn(
                    "block text-lg font-bold font-rajdhani transition-colors duration-150 leading-none",
                    bannerUrl ? "text-white" : (isHovered ? "text-primary" : "text-foreground")
                )}>
                    {mode}
                </span>
                <div className="flex items-center justify-between mt-1">
                    <span className={cn(
                        "text-xs flex items-center gap-1 transition-colors duration-150",
                        bannerUrl ? "text-white/70" : (isHovered ? "text-primary/70" : "text-muted-foreground")
                    )}>
                        View Scrims
                    </span>
                    <Swords
                        size={14}
                        className={cn(
                            "transition-transform duration-300 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100",
                            bannerUrl ? "text-primary" : "text-primary"
                        )}
                    />
                </div>
            </div>
        </button>
    );
}
