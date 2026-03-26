"use client";

import { useRef, useCallback, RefObject } from "react";
import gsap from "gsap";

interface UseRowHoverOptions {
    scale?: number;
    x?: number;
    backgroundColor?: string;
    duration?: number;
    ease?: string;
}

const DEFAULT_OPTIONS: UseRowHoverOptions = {
    scale: 1.003,
    x: 3,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    duration: 0.15, // Faster for snappier feel
    ease: "power2.out",
};

/**
 * A reusable hook for consistent row hover animations across the app.
 * Returns a ref and event handlers to be attached to the row element.
 * Optimized for smooth, jitter-free animations.
 */
export function useRowHover<T extends HTMLElement = HTMLDivElement>(
    options?: UseRowHoverOptions
): {
    ref: RefObject<T | null>;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
} {
    const ref = useRef<T>(null);
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const onMouseEnter = useCallback(() => {
        if (ref.current) {
            gsap.to(ref.current, {
                scale: opts.scale,
                x: opts.x,
                backgroundColor: opts.backgroundColor,
                duration: opts.duration,
                ease: opts.ease,
                overwrite: "auto", // Prevents jitter from overlapping animations
            });
        }
    }, [opts.scale, opts.x, opts.backgroundColor, opts.duration, opts.ease]);

    const onMouseLeave = useCallback(() => {
        if (ref.current) {
            gsap.to(ref.current, {
                scale: 1,
                x: 0,
                backgroundColor: "transparent",
                duration: opts.duration,
                ease: opts.ease,
                overwrite: "auto",
            });
        }
    }, [opts.duration, opts.ease]);

    return { ref, onMouseEnter, onMouseLeave };
}

export default useRowHover;
