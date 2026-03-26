"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/tournaments');
    }, [router]);

    return (
        <div className="flex h-full items-center justify-center">
            <GsapLoaderInline className="text-primary mr-2" />
            <span className="font-rajdhani font-medium text-foreground">Redirecting...</span>
        </div>
    );
}
