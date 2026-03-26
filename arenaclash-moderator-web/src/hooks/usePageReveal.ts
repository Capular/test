"use client";

import { useRef, useEffect, useLayoutEffect, RefObject } from "react";
import gsap from "gsap";

interface UsePageRevealOptions {
    duration?: number;
    delay?: number;
    y?: number;
    ease?: string;
    staggerChildren?: boolean;
    childStagger?: number;
}

const DEFAULT_OPTIONS: UsePageRevealOptions = {
    duration: 0.4,
    delay: 0.05,
    y: 12,
    ease: "power2.out",
    staggerChildren: false,
    childStagger: 0.06,
};

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A reusable hook for consistent page reveal animations across the app.
 * Returns a ref that should be attached to the main container element.
 * The container starts with opacity-0 and is revealed via GSAP.
 * 
 * IMPORTANT: This hook ensures the element is visible even if animation fails.
 */
export function usePageReveal<T extends HTMLElement = HTMLDivElement>(
    options?: UsePageRevealOptions
): RefObject<T | null> {
    const containerRef = useRef<T>(null);
    const opts = { ...DEFAULT_OPTIONS, ...options };

    useIsomorphicLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // SSR guard - don't run GSAP during prerendering
        if (typeof window === "undefined") {
            el.style.opacity = "1";
            return;
        }

        // Ensure element is never stuck at opacity 0
        // Set initial state immediately
        gsap.set(el, { opacity: 0, y: opts.y });

        // Animate in
        const tween = gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: opts.duration,
            delay: opts.delay,
            ease: opts.ease,
            clearProps: "transform",
            overwrite: "auto",
        });

        // Stagger children if needed
        let childTween: gsap.core.Tween | null = null;
        if (opts.staggerChildren && el.children.length > 0) {
            childTween = gsap.fromTo(
                el.children,
                { opacity: 0, y: 8 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.35,
                    stagger: opts.childStagger,
                    ease: opts.ease,
                    delay: (opts.delay || 0) + 0.1,
                    clearProps: "transform",
                    overwrite: "auto",
                }
            );
        }

        return () => {
            tween.kill();
            childTween?.kill();
            // Ensure visibility on cleanup (prevents flash of invisible content)
            if (el) {
                el.style.opacity = "1";
                el.style.transform = "none";
            }
        };
    }, []); // Empty deps - only run once on mount

    return containerRef;
}

export default usePageReveal;
