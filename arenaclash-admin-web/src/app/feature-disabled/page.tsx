import Link from "next/link";
import { Button } from "@/components/ui/button";

function formatReason(reason: string | undefined): string {
  if (!reason) return "This feature is disabled for this tenant by the master panel.";
  return reason;
}

export default async function FeatureDisabledPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card/60 p-6 text-center">
        <h1 className="font-rajdhani text-3xl font-bold text-foreground">Feature Disabled</h1>
        <p className="mt-3 text-sm text-muted-foreground">{formatReason(reason)}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back To Home</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Go To Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
