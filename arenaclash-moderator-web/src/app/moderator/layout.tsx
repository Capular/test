"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";
import ModeratorSidebar from "@/components/moderator/ModeratorSidebar";
import GsapLoader from "@/components/ui/GsapLoader";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { getMasterPanelUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { readTenantUserWithFallback } from "@/lib/tenant-user-client";

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);
    const { flags } = useTenantFeatures();
    const masterPanelUrl = getMasterPanelUrl();

    useEffect(() => {
        const checkAccess = async () => {
            if (authLoading) return;

            if (!user) {
                router.replace("/login");
                return;
            }

            try {
                const resolved = await readTenantUserWithFallback(db, user.uid);
                const userData = resolved.snapshot.data();

                // Allow access if user is admin or moderator
                if (userData?.role === 'admin' || userData?.role === 'moderator') {
                    setIsAuthorized(true);
                } else {
                    router.replace("/login");
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                router.replace("/login");
            }
            setChecking(false);
        };

        checkAccess();
    }, [user, authLoading, router]);

    if (authLoading || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <GsapLoader />
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    if (!flags.platformEnabled || !flags.moderatorPanelEnabled) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card/60 p-6 text-center">
                    <h2 className="font-rajdhani text-3xl font-bold text-foreground">Moderator Panel Disabled</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The master panel has disabled moderator access for this tenant.
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
        <div className="flex min-h-screen bg-background">
            <ModeratorSidebar />
            <main className="flex-1 lg:ml-56 p-6">
                {children}
            </main>
        </div>
    );
}
