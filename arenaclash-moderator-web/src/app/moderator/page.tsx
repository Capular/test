"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModeratorPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/moderator/matches");
    }, [router]);

    return null;
}
