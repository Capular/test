import MatchHosting from "@/components/moderator/MatchHosting";

export default function HostingPage({ params }: { params: Promise<{ id: string }> }) {
    return <MatchHosting paramsPromise={params} />;
}
