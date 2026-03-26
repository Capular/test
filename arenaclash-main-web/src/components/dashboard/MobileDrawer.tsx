"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, MessageSquare, Settings, Info, LogOut, HelpCircle, ChevronRight, Gamepad2, ClipboardList, Wallet, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

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
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 bottom-0 w-[280px] bg-card border-r border-border z-[70] lg:hidden transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-lg font-bold font-rajdhani text-foreground">Menu</h2>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
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
                <div className="p-2 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
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
