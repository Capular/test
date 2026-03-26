import { NextResponse } from "next/server";
import { getMasterPanelUrl, getTenantSlug } from "@/lib/utils";
import {
  defaultTenantFeatureFlags,
  normalizeFeatureFlags,
  type TenantFlagsPayload,
} from "@/lib/tenant-flags";

export async function GET() {
  const masterPanelUrl = getMasterPanelUrl();
  const tenantSlug = getTenantSlug();

  if (!masterPanelUrl || !tenantSlug) {
    return NextResponse.json<TenantFlagsPayload>({
      tenantId: tenantSlug || "default-tenant",
      slug: tenantSlug || "default-tenant",
      status: "active",
      featureFlags: defaultTenantFeatureFlags,
    });
  }

  try {
    const response = await fetch(
      `${masterPanelUrl}/api/public/tenant-flags/${encodeURIComponent(tenantSlug)}`,
      { next: { revalidate: 30 } }
    );

    if (!response.ok) {
      return NextResponse.json<TenantFlagsPayload>({
        tenantId: tenantSlug,
        slug: tenantSlug,
        status: "active",
        featureFlags: defaultTenantFeatureFlags,
      });
    }

    const payload = (await response.json()) as {
      tenantId?: string;
      slug?: string;
      status?: string;
      featureFlags?: unknown;
    };
    return NextResponse.json<TenantFlagsPayload>({
      tenantId: payload.tenantId || tenantSlug,
      slug: payload.slug || tenantSlug,
      status: payload.status || "active",
      featureFlags: normalizeFeatureFlags(payload.featureFlags),
    });
  } catch {
    return NextResponse.json<TenantFlagsPayload>({
      tenantId: tenantSlug,
      slug: tenantSlug,
      status: "active",
      featureFlags: defaultTenantFeatureFlags,
    });
  }
}
