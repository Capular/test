"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { getMasterPanelUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const { flags } = useTenantFeatures();
    const masterPanelUrl = getMasterPanelUrl();

    useEffect(() => {
        if (!loading) {
            if (!user || !isAdmin) {
                router.replace('/login');
            }
        }
    }, [user, isAdmin, loading, router]);

    if (loading || !user || !isAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <GsapLoaderInline className="text-primary mr-2" />
                <span className="font-rajdhani font-medium text-foreground">Verifying access...</span>
            </div>
        );
    }

    if (!flags.platformEnabled || !flags.adminPanelEnabled) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card/60 p-6 text-center">
                    <h2 className="font-rajdhani text-3xl font-bold text-foreground">Admin Panel Disabled</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The master panel has disabled admin access for this tenant.
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
        <div className="flex min-h-screen bg-background premium-bg-gradient">
            <AdminSidebar />
            <div className="flex-1 lg:pl-56 transition-all duration-300">
                <main className="p-4 w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
