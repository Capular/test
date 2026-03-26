"use client";

import { usePathname, useRouter } from "next/navigation";
import { Gamepad2, Wallet, Settings, ChevronDown, User, LogOut, ClipboardList, MessageSquare, HelpCircle, Info, Zap, PlayCircle, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import gsap from "gsap";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
    onLoginClick: () => void;
}

export default function Sidebar({ onLoginClick }: SidebarProps) {
    const sidebarRef = useRef<HTMLElement>(null);
    const navItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const logoRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { user, loading, isAdmin, isModerator } = useAuth();
    const { flags } = useTenantFeatures();
    const pathname = usePathname();
    const router = useRouter();
    const [isAnimating, setIsAnimating] = useState(true);

    const mainMenuItems = [
        { id: "tournaments", label: "Tournaments", icon: Gamepad2, path: "/tournaments" },
        { id: "my-registrations", label: "My Registrations", icon: ClipboardList, path: "/registrations" },
        { id: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
        { id: "notifications", label: "Notifications", icon: BellRing, path: "/notifications" },
    ];

    const resourceMenuItems = [
        { id: "support", label: "Support", icon: MessageSquare, path: "/support" },
        { id: "help", label: "Help & FAQ", icon: HelpCircle, path: "/help" },
        { id: "about", label: "About", icon: Info, path: "/about" },
    ];

    const isActive = (path: string) => {
        if (path === "/tournaments" && (pathname === "/" || pathname === "/tournaments")) return true;
        return pathname.startsWith(path);
    };

    // Entrance animation - run once on mount
    useLayoutEffect(() => {
        const sidebar = sidebarRef.current;
        const logo = logoRef.current;
        const bottom = bottomRef.current;
        const navItems = navItemsRef.current.filter(Boolean);

        if (!sidebar) return;

        // Set initial state immediately
        gsap.set(navItems, { x: -20, opacity: 0 });

        const tl = gsap.timeline({
            defaults: { ease: "power3.out", overwrite: true },
            onComplete: () => {
                // Only clear transform props, keep opacity visible
                gsap.set(navItems, { clearProps: "transform", opacity: 1 });
                gsap.set(logo, { clearProps: "transform", opacity: 1 });
                gsap.set(bottom, { clearProps: "transform", opacity: 1 });
                setIsAnimating(false);
            }
        });

        tl.fromTo(sidebar,
            { x: -60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5 }
        )
            .fromTo(logo,
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.4 },
                "-=0.3"
            )
            .fromTo(navItems,
                { x: -20, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.3, stagger: 0.05 },
                "-=0.25"
            )
            .fromTo(bottom,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4 },
                "-=0.25"
            );

        return () => {
            tl.kill();
            // Ensure elements are visible on cleanup
            gsap.set(sidebar, { x: 0, opacity: 1 });
            gsap.set(logo, { scale: 1, opacity: 1 });
            gsap.set(navItems, { x: 0, opacity: 1 });
            gsap.set(bottom, { y: 0, opacity: 1 });
            setIsAnimating(false);
        };
    }, []);

    // Sync visual state with route changes
    useEffect(() => {
        navItemsRef.current.forEach((btn, i) => {
            if (!btn) return;
            const item = i < mainMenuItems.length ? mainMenuItems[i] : resourceMenuItems[i - mainMenuItems.length];
            const active = isActive(item.path);

            gsap.to(btn, {
                x: 0,
                backgroundColor: active ? "rgba(var(--primary-rgb), 0.12)" : "transparent",
                duration: 0.2,
                ease: "power2.out",
                overwrite: "auto"
            });

            const icon = btn.querySelector('.nav-icon');
            if (icon) {
                gsap.to(icon, { scale: 1, duration: 0.2, ease: "power2.out", overwrite: "auto" });
            }
        });
    }, [pathname]);

    // Snappy hover handlers - only trigger after entrance animation completes
    const handleNavEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (isAnimating) return;
        gsap.to(e.currentTarget, {
            x: 4,
            backgroundColor: "rgba(var(--primary-rgb), 0.08)",
            duration: 0.15,
            ease: "power2.out",
            overwrite: true,
        });
        const icon = e.currentTarget.querySelector('.nav-icon');
        if (icon) {
            gsap.to(icon, { scale: 1.1, duration: 0.15, ease: "power2.out", overwrite: true });
        }
    }, [isAnimating]);

    const handleNavLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (isAnimating) return;
        const isItemActive = e.currentTarget.dataset.active === "true";
        gsap.to(e.currentTarget, {
            x: 0,
            backgroundColor: isItemActive ? "rgba(var(--primary-rgb), 0.12)" : "transparent",
            duration: 0.15,
            ease: "power2.out",
            overwrite: true,
        });
        const icon = e.currentTarget.querySelector('.nav-icon');
        if (icon) {
            gsap.to(icon, { scale: 1, duration: 0.15, ease: "power2.out", overwrite: true });
        }
    }, [isAnimating]);

    // Profile dropdown
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const dropdown = dropdownRef.current;
        const chevron = document.querySelector('.profile-chevron');

        if (dropdown) {
            if (isProfileMenuOpen) {
                gsap.fromTo(dropdown,
                    { opacity: 0, y: 8, scale: 0.97 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.15, ease: "power2.out" }
                );
            }
        }
        if (chevron) {
            gsap.to(chevron, { rotate: isProfileMenuOpen ? 180 : 0, duration: 0.2, ease: "power2.out" });
        }
    }, [isProfileMenuOpen]);

    // Profile card hover
    const handleProfileEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        gsap.to(e.currentTarget, { scale: 1.015, duration: 0.12, ease: "power2.out", overwrite: true });
    }, []);

    const handleProfileLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        gsap.to(e.currentTarget, { scale: 1, duration: 0.12, ease: "power2.out", overwrite: true });
    }, []);

    // Dropdown menu item hover
    const handleMenuEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        gsap.to(e.currentTarget, { x: 3, backgroundColor: "rgba(var(--muted-rgb), 0.5)", duration: 0.1, ease: "power2.out", overwrite: true });
    }, []);

    const handleMenuLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        gsap.to(e.currentTarget, { x: 0, backgroundColor: "transparent", duration: 0.1, ease: "power2.out", overwrite: true });
    }, []);

    const handleLogoutEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        gsap.to(e.currentTarget, { x: 3, backgroundColor: "rgba(239, 68, 68, 0.1)", duration: 0.1, ease: "power2.out", overwrite: true });
    }, []);

    const handleLogoutLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        gsap.to(e.currentTarget, { x: 0, backgroundColor: "transparent", duration: 0.1, ease: "power2.out", overwrite: true });
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/");
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    // Login button hover
    const handleLoginEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        gsap.to(e.currentTarget, { scale: 1.02, duration: 0.12, ease: "power2.out", overwrite: true });
    }, []);

    const handleLoginLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        gsap.to(e.currentTarget, { scale: 1, duration: 0.12, ease: "power2.out", overwrite: true });
    }, []);

    const setNavRef = (el: HTMLButtonElement | null, index: number) => {
        navItemsRef.current[index] = el;
    };

    const renderNavItem = (item: typeof mainMenuItems[0], index: number) => {
        const active = isActive(item.path);
        return (
            <Button
                key={item.id}
                ref={(el) => setNavRef(el, index)}
                variant="ghost"
                data-active={active}
                onClick={() => router.push(item.path)}
                onMouseEnter={handleNavEnter}
                onMouseLeave={handleNavLeave}
                className={cn(
                    "w-full justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium rounded-xl relative will-change-transform",
                    active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground bg-transparent",
                    isAnimating && "pointer-events-none"
                )}
            >
                <item.icon className={cn(
                    "nav-icon h-[18px] w-[18px] will-change-transform",
                    active ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="font-rajdhani">{item.label}</span>
                {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                )}
            </Button>
        );
    };

    return (
        <aside
            ref={sidebarRef}
            className="hidden lg:flex w-56 h-[100dvh] bg-background/95 backdrop-blur-xl border-r border-border/30 flex-col justify-between fixed left-0 top-0 z-50"
        >
            {/* Gradient accent line */}
            <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />

            <div className="flex flex-col flex-1 min-h-0">
                {/* Logo Header */}
                <div ref={logoRef} className="h-16 flex-shrink-0 flex items-center gap-3 px-5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Zap className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-rajdhani font-bold text-base text-foreground tracking-wide">
                            ANU PAID SCRIM
                        </h1>
                        <p className="text-[10px] text-muted-foreground -mt-0.5">Tournament Platform</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-1 custom-scrollbar">
                    {/* Main Section */}
                    <div className="mb-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3 mb-2">
                            Main
                        </p>
                        <div className="space-y-1">
                            {mainMenuItems.map((item, i) => renderNavItem(item, i))}
                        </div>
                    </div>

                    <Separator className="my-3 bg-border/40" />

                    {/* Resources Section */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3 mb-2">
                            Resources
                        </p>
                        <div className="space-y-1">
                            {resourceMenuItems.map((item, i) => renderNavItem(item, mainMenuItems.length + i))}
                        </div>
                    </div>
                </nav>
            </div>

            {/* Bottom Section */}
            <div ref={bottomRef} className="px-3 pb-4 flex-shrink-0 relative">
                <Separator className="mb-4 bg-border/40" />

                {/* Theme Toggle */}
                <div className="flex items-center justify-between px-3 py-2 mb-3 bg-muted/30 rounded-xl">
                    <span className="text-sm font-medium text-muted-foreground">Appearance</span>
                    <ThemeToggle />
                </div>

                {!loading && user ? (
                    <div ref={profileRef}>
                        {/* Profile Dropdown Menu */}
                        {isProfileMenuOpen && (
                            <div
                                ref={dropdownRef}
                                className="absolute bottom-full left-3 right-3 mb-2 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden py-1.5 z-50"
                            >
                                <button
                                    onClick={() => { router.push("/settings"); setIsProfileMenuOpen(false); }}
                                    onMouseEnter={handleMenuEnter}
                                    onMouseLeave={handleMenuLeave}
                                    className="w-full text-left px-4 py-2.5 text-sm text-foreground flex items-center gap-2.5 font-medium"
                                >
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                    Settings
                                </button>

                                {isAdmin && flags.adminPanelEnabled && (
                                    <button
                                        onClick={() => { router.push("/admin"); setIsProfileMenuOpen(false); }}
                                        onMouseEnter={handleMenuEnter}
                                        onMouseLeave={handleMenuLeave}
                                        className="w-full text-left px-4 py-2.5 text-sm text-foreground flex items-center gap-2.5 font-medium"
                                    >
                                        <div className="h-4 w-4 rounded-[4px] border border-primary/40 flex items-center justify-center bg-primary/10">
                                            <span className="text-[9px] font-bold text-primary">A</span>
                                        </div>
                                        Admin Panel
                                    </button>
                                )}

                                {isModerator && flags.moderatorPanelEnabled && (
                                    <button
                                        onClick={() => { router.push("/moderator"); setIsProfileMenuOpen(false); }}
                                        onMouseEnter={handleMenuEnter}
                                        onMouseLeave={handleMenuLeave}
                                        className="w-full text-left px-4 py-2.5 text-sm text-foreground flex items-center gap-2.5 font-medium"
                                    >
                                        <div className="h-4 w-4 rounded-[4px] border border-emerald-500/40 flex items-center justify-center bg-emerald-500/10">
                                            <PlayCircle className="w-2.5 h-2.5 text-emerald-500" />
                                        </div>
                                        Moderator Panel
                                    </button>
                                )}

                                <Separator className="my-1.5 mx-2 bg-border/40" />

                                <button
                                    onClick={handleLogout}
                                    onMouseEnter={handleLogoutEnter}
                                    onMouseLeave={handleLogoutLeave}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 flex items-center gap-2.5 font-medium"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log Out
                                </button>
                            </div>
                        )}

                        {/* User Profile Card */}
                        <div
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            onMouseEnter={handleProfileEnter}
                            onMouseLeave={handleProfileLeave}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 bg-muted/30 rounded-xl cursor-pointer select-none will-change-transform",
                                isProfileMenuOpen ? "ring-1 ring-primary/20" : ""
                            )}
                        >
                            <Avatar className="h-9 w-9 ring-2 ring-background shadow-md">
                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xs font-bold">
                                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={14} />}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden min-w-0">
                                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                                    {user.displayName || "Gamer"}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {user.email}
                                </p>
                            </div>
                            <ChevronDown size={16} className="profile-chevron text-muted-foreground/60 will-change-transform" />
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={onLoginClick}
                        onMouseEnter={handleLoginEnter}
                        onMouseLeave={handleLoginLeave}
                        className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-rajdhani font-bold rounded-xl h-11 shadow-lg shadow-primary/20 will-change-transform"
                    >
                        Login to Play
                    </Button>
                )}
            </div>
        </aside>
    );
}
