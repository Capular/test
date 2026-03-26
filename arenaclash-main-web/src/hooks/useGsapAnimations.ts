"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

/**
 * GSAP-based spin animation hook
 * Replaces CSS animate-spin
 */
export function useSpin(duration: number = 1) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const animation = gsap.to(ref.current, {
            rotation: 360,
            duration,
            ease: "none",
            repeat: -1,
        });

        return () => {
            animation.kill();
        };
    }, [duration]);

    return ref;
}

/**
 * GSAP-based ping animation hook
 * Replaces CSS animate-ping
 */
export function usePing(duration: number = 1) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const animation = gsap.to(ref.current, {
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

    return ref;
}

/**
 * GSAP-based pulse animation hook
 * Replaces CSS animate-pulse
 */
export function usePulse(duration: number = 2) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

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
    }, [duration]);

    return ref;
}

/**
 * GSAP-based shimmer animation hook
 * Replaces CSS animate-shimmer keyframe
 */
export function useShimmer(duration: number = 2) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.set(ref.current, { x: "-100%" });

        const animation = gsap.to(ref.current, {
            x: "100%",
            duration,
            ease: "none",
            repeat: -1,
        });

        return () => {
            animation.kill();
        };
    }, [duration]);

    return ref;
}

/**
 * GSAP-based fade-in with slide animation hook
 * Replaces CSS animate-in fade-in slide-in-from-bottom-5
 */
export function useFadeInSlide(delay: number = 0, direction: "up" | "down" | "left" | "right" = "up") {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const yOffset = direction === "up" ? 20 : direction === "down" ? -20 : 0;
        const xOffset = direction === "left" ? 20 : direction === "right" ? -20 : 0;

        gsap.fromTo(
            ref.current,
            {
                opacity: 0,
                y: yOffset,
                x: xOffset,
            },
            {
                opacity: 1,
                y: 0,
                x: 0,
                duration: 0.5,
                delay,
                ease: "power2.out",
            }
        );
    }, [delay, direction]);

    return ref;
}

/**
 * GSAP-based gradient border rotation animation
 * Replaces @keyframes rotate-gradient
 */
export function useRotateGradient(duration: number = 3) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const animation = gsap.to(ref.current, {
            backgroundPosition: "200% 50%",
            duration,
            ease: "none",
            repeat: -1,
        });

        return () => {
            animation.kill();
        };
    }, [duration]);

    return ref;
}

/**
 * GSAP-based pulse glow animation hook
 * Replaces CSS animate-pulse-glow
 */
export function usePulseGlow(duration: number = 2) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

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
    }, [duration]);

    return ref;
}

/**
 * GSAP-based card hover effects
 * Replaces CSS transitions on .card-premium
 */
export function useCardHover() {
    const ref = useRef<HTMLElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
            y: -4,
            scale: 1.01,
            duration: 0.3,
            ease: "power2.out",
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "power2.out",
        });
    }, []);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            element.removeEventListener("mouseenter", handleMouseEnter);
            element.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [handleMouseEnter, handleMouseLeave]);

    return ref;
}

/**
 * GSAP-based button hover effects
 * Replaces CSS transitions on .btn-premium
 */
export function useButtonHover() {
    const ref = useRef<HTMLElement>(null);
    const shineRef = useRef<HTMLElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
            y: -2,
            scale: 1.02,
            duration: 0.3,
            ease: "power2.out",
        });
        if (shineRef.current) {
            gsap.fromTo(
                shineRef.current,
                { left: "-100%" },
                { left: "100%", duration: 0.5, ease: "power2.out" }
            );
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "power2.out",
        });
    }, []);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            element.removeEventListener("mouseenter", handleMouseEnter);
            element.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [handleMouseEnter, handleMouseLeave]);

    return { buttonRef: ref, shineRef };
}

/**
 * GSAP-based card shine effect on hover
 * Replaces .card-shine CSS animation
 */
export function useCardShine() {
    const cardRef = useRef<HTMLElement>(null);
    const shineRef = useRef<HTMLElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!shineRef.current) return;
        gsap.fromTo(
            shineRef.current,
            { x: "-100%" },
            { x: "100%", duration: 0.6, ease: "power2.out" }
        );
    }, []);

    useEffect(() => {
        const element = cardRef.current;
        if (!element) return;

        element.addEventListener("mouseenter", handleMouseEnter);

        return () => {
            element.removeEventListener("mouseenter", handleMouseEnter);
        };
    }, [handleMouseEnter]);

    return { cardRef, shineRef };
}

/**
 * GSAP-based modal entrance animation
 * Replaces animate-in fade-in on modals
 */
export function useModalEntrance() {
    const overlayRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            if (overlayRef.current) {
                gsap.fromTo(
                    overlayRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.2, ease: "power2.out" }
                );
            }
            if (contentRef.current) {
                gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, scale: 0.95, y: -10 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" }
                );
            }
        });

        return () => ctx.revert();
    }, []);

    return { overlayRef, contentRef };
}

/**
 * GSAP-based dialog animations compatible with Radix UI
 * Handles both entrance and exit animations
 */
export function useDialogAnimation(isOpen: boolean) {
    const overlayRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Entrance animation
            if (overlayRef.current) {
                gsap.fromTo(
                    overlayRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.2, ease: "power2.out" }
                );
            }
            if (contentRef.current) {
                gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, scale: 0.95, y: -20 },
                    { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "back.out(1.5)" }
                );
            }
        }
    }, [isOpen]);

    const animateOut = useCallback(() => {
        return new Promise<void>((resolve) => {
            const tl = gsap.timeline({
                onComplete: resolve,
            });

            if (contentRef.current) {
                tl.to(contentRef.current, {
                    opacity: 0,
                    scale: 0.95,
                    duration: 0.15,
                    ease: "power2.in",
                }, 0);
            }
            if (overlayRef.current) {
                tl.to(overlayRef.current, {
                    opacity: 0,
                    duration: 0.15,
                    ease: "power2.in",
                }, 0);
            }
        });
    }, []);

    return { overlayRef, contentRef, animateOut };
}

/**
 * GSAP-based stagger animation for lists
 * Useful for animating multiple items
 */
export function useStaggerFadeIn(delay: number = 0, staggerDelay: number = 0.1) {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const children = containerRef.current.children;
        if (children.length === 0) return;

        gsap.fromTo(
            children,
            { opacity: 0, y: 15 },
            {
                opacity: 1,
                y: 0,
                duration: 0.4,
                delay,
                stagger: staggerDelay,
                ease: "power2.out",
            }
        );
    }, [delay, staggerDelay]);

    return containerRef;
}
