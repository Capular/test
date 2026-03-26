"use client";

import { useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";
import { X, MessageSquare, Settings, Info, LogOut, HelpCircle, ChevronRight, Gamepad2, ClipboardList, Wallet, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// Main navigation (same as bottom bar)
const mainNavItems = [
    { id: "tournaments", label: "Tournaments", icon: Gamepad2, path: "/tournaments" },
    { id: "registrations", label: "My Registrations", icon: ClipboardList, path: "/registrations" },
    { id: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
    { id: "profile", label: "Profile", icon: User, path: "/settings" },
];

// Extended menu items
const extendedMenuItems = [
    { id: "support", label: "Support", icon: MessageSquare, path: "/support" },
    { id: "help", label: "Help & FAQ", icon: HelpCircle, path: "/help" },
    { id: "about", label: "About", icon: Info, path: "/about" },
];

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();

    const overlayRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<HTMLDivElement>(null);

    // Animate open/close
    useEffect(() => {
        if (isOpen) {
            // Open animation
            const tl = gsap.timeline();

            if (overlayRef.current) {
                gsap.set(overlayRef.current, { display: "block" });
                tl.fromTo(overlayRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.25, ease: "power2.out" }
                );
            }

            if (drawerRef.current) {
                tl.fromTo(drawerRef.current,
                    { x: "-100%" },
                    { x: "0%", duration: 0.35, ease: "power3.out" },
                    "-=0.15"
                );
            }

            if (itemsRef.current) {
                tl.fromTo(itemsRef.current.children,
                    { opacity: 0, x: -20 },
                    { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power3.out" },
                    "-=0.2"
                );
            }
        } else {
            // Close animation
            const tl = gsap.timeline({
                onComplete: () => {
                    if (overlayRef.current) {
                        gsap.set(overlayRef.current, { display: "none" });
                    }
                }
            });

            if (drawerRef.current) {
                tl.to(drawerRef.current, { x: "-100%", duration: 0.25, ease: "power3.in" });
            }
            if (overlayRef.current) {
                tl.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: "power2.in" }, "-=0.1");
            }
        }
    }, [isOpen]);

    const handleNavigation = useCallback((path: string | null) => {
        if (path) {
            router.push(path);
            onClose();
        }
    }, [router, onClose]);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            onClose();
            router.push("/");
        } catch (error) {
            console.error("Logout error:", error);
        }
    }, [router, onClose]);

    return (
        <>
            {/* Overlay */}
            <div
                ref={overlayRef}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                style={{ display: "none" }}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="fixed top-0 left-0 bottom-0 w-[280px] bg-card border-r border-border z-[70] lg:hidden"
                style={{ transform: "translateX(-100%)" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-lg font-bold font-rajdhani text-foreground">Menu</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* User Info */}
                {user && (
                    <div className="p-4 border-b border-border/50 flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/30">
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                {user.displayName?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                                {user.displayName || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                )}

                {/* Menu Items */}
                <div ref={itemsRef} className="p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                    {/* Main Navigation */}
                    <p className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Navigation</p>
                    {mainNavItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === item.path || (item.path === "/tournaments" && pathname === "/")
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="flex-1 text-left font-medium">{item.label}</span>
                            <ChevronRight size={16} className="text-muted-foreground" />
                        </button>
                    ))}

                    {/* Divider */}
                    <div className="my-3 border-t border-border/50" />

                    {/* More Options */}
                    <p className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">More</p>
                    {extendedMenuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            disabled={!item.path}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.path && pathname === item.path
                                ? "bg-primary/10 text-primary"
                                : item.path
                                    ? "text-foreground hover:bg-muted"
                                    : "text-muted-foreground cursor-not-allowed opacity-50"
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="flex-1 text-left font-medium">{item.label}</span>
                            {item.path && <ChevronRight size={16} className="text-muted-foreground" />}
                            {!item.path && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Soon</span>}
                        </button>
                    ))}

                    {/* Divider */}
                    <div className="my-3 border-t border-border/50" />

                    {/* Logout */}
                    {user && (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut size={20} />
                            <span className="flex-1 text-left font-medium">Log Out</span>
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground text-center">
                        ANU PAID SCRIM v1.0.0
                    </p>
                </div>
            </div>
        </>
    );
}
