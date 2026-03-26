"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LoginModal from "@/components/auth/LoginModal";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { getMasterPanelUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { flags } = useTenantFeatures();
    const masterPanelUrl = getMasterPanelUrl();

    // Redirect to login if not authenticated (Route Protection)
    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [user, loading, router]);


    // Redirect to onboarding if needed
    useEffect(() => {
        if (!loading && user && userData) {
            if (userData.hasCompletedOnboarding === false && pathname !== '/onboarding') {
                router.push("/onboarding");
            }
        }
    }, [user, userData, loading, pathname, router]);

    useEffect(() => {
        if (!flags.platformEnabled) return;
        if (!flags.tournamentsEnabled && pathname.startsWith("/tournaments")) {
            router.replace("/registrations");
            return;
        }
        if (!flags.walletEnabled && pathname.startsWith("/wallet")) {
            router.replace("/tournaments");
            return;
        }
        if (!flags.supportEnabled && (pathname.startsWith("/support") || pathname.startsWith("/help"))) {
            router.replace("/tournaments");
        }
    }, [flags, pathname, router]);

    if (!flags.platformEnabled) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card/60 p-6 text-center">
                    <h2 className="font-rajdhani text-3xl font-bold text-foreground">Tenant Temporarily Disabled</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This tenant has been paused from the master panel. Contact your administrator for access.
                    </p>
                    {masterPanelUrl && (
                        <Button className="mt-4" variant="outline" onClick={() => window.open(masterPanelUrl, "_blank", "noopener,noreferrer")}>
                            Open Master Panel
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background premium-bg-gradient pb-20 lg:pb-0">
            <Sidebar onLoginClick={() => setIsLoginOpen(true)} />
            <MobileNav onLoginClick={() => setIsLoginOpen(true)} user={user} />
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            <div className="flex-1 lg:pl-56 transition-all duration-300">
                <Suspense fallback={<div className="h-16 lg:h-20" />}>
                    <DashboardHeader />
                </Suspense>
                <main className="p-4 lg:px-5 w-full max-w-full mx-auto pt-4">
                    {children}
                </main>
            </div>
        </div>
    );
}
