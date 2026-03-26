"use client";
import { Suspense } from "react";
import TournamentsView from "@/components/dashboard/TournamentsView";
import { useSearchParams } from "next/navigation";

function TournamentsContent() {
    const searchParams = useSearchParams();
    const selectedGame = searchParams.get("game") || "All Games";

    return <TournamentsView selectedGame={selectedGame === "All Games" ? undefined : selectedGame} />;
}

export default function TournamentsPage() {
    return (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
            <TournamentsContent />
        </Suspense>
    );
}
