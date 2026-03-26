import { NextRequest, NextResponse } from "next/server";

type TenantFeatureFlags = {
  platformEnabled: boolean;
  tournamentsEnabled: boolean;
  walletEnabled: boolean;
  supportEnabled: boolean;
  adminPanelEnabled: boolean;
  moderatorPanelEnabled: boolean;
};

const DEFAULT_FLAGS: TenantFeatureFlags = {
  platformEnabled: true,
  tournamentsEnabled: true,
  walletEnabled: true,
  supportEnabled: true,
  adminPanelEnabled: true,
  moderatorPanelEnabled: true,
};

function normalizeMasterUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/\/$/, "");
  }
  return `https://${value.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

function isStaticPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico" || pathname === "/icon.png" || pathname === "/apple-icon.png") return true;
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

async function loadFlags(): Promise<TenantFeatureFlags> {
  const masterUrl = normalizeMasterUrl(
    process.env.NEXT_PUBLIC_MASTER_PANEL_URL || process.env.MASTER_PANEL_PUBLIC_URL || ""
  );
  const tenantSlug = (process.env.NEXT_PUBLIC_TENANT_SLUG || process.env.TENANT_SLUG || "").trim().toLowerCase();

  if (!masterUrl || !tenantSlug) return DEFAULT_FLAGS;

  try {
    const response = await fetch(
      `${masterUrl}/api/public/tenant-flags/${encodeURIComponent(tenantSlug)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return DEFAULT_FLAGS;
    const payload = (await response.json()) as { featureFlags?: Partial<TenantFeatureFlags> };
    return {
      platformEnabled: payload.featureFlags?.platformEnabled !== false,
      tournamentsEnabled: payload.featureFlags?.tournamentsEnabled !== false,
      walletEnabled: payload.featureFlags?.walletEnabled !== false,
      supportEnabled: payload.featureFlags?.supportEnabled !== false,
      adminPanelEnabled: payload.featureFlags?.adminPanelEnabled !== false,
      moderatorPanelEnabled: payload.featureFlags?.moderatorPanelEnabled !== false,
    };
  } catch {
    return DEFAULT_FLAGS;
  }
}

function deny(req: NextRequest, message: string): NextResponse {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/feature-disabled";
  url.searchParams.set("reason", message);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticPath(pathname)) return NextResponse.next();
  if (pathname === "/api/tenant/flags") return NextResponse.next();
  if (pathname === "/feature-disabled") return NextResponse.next();

  const flags = await loadFlags();

  if (!flags.platformEnabled) {
    return deny(req, "Tenant is disabled by master panel.");
  }

  if (!flags.moderatorPanelEnabled) {
    if (
      pathname.startsWith("/moderator") ||
      pathname.startsWith("/api/matches") ||
      pathname.startsWith("/api/matchmaking") ||
      pathname.startsWith("/api/payment")
    ) {
      return deny(req, "Moderator panel is disabled for this tenant.");
    }
  }

  if (!flags.tournamentsEnabled) {
    if (
      pathname.startsWith("/moderator") ||
      pathname.startsWith("/api/matches") ||
      pathname.startsWith("/api/matchmaking")
    ) {
      return deny(req, "Tournament operations are disabled for this tenant.");
    }
  }

  if (!flags.walletEnabled) {
    if (pathname.startsWith("/payment") || pathname.startsWith("/api/payment")) {
      return deny(req, "Wallet and payment features are disabled for this tenant.");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
