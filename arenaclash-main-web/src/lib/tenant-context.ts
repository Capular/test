import { getTenantSlug } from "@/lib/utils";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function getTenantId(): string {
  const explicitId = process.env.NEXT_PUBLIC_TENANT_ID || process.env.TENANT_ID;
  if (explicitId && explicitId.trim()) {
    return normalize(explicitId);
  }
  const slug = getTenantSlug();
  return slug ? normalize(slug) : "default-tenant";
}

export function getTenantContext() {
  const tenantSlug = getTenantSlug() || getTenantId();
  const tenantId = getTenantId();
  return { tenantSlug, tenantId };
}

export function tenantUserPath(uid: string): [string, string, string, string] {
  return ["tenants", getTenantId(), "users", uid];
}

export function tenantUsersCollectionPath(): [string, string, string] {
  return ["tenants", getTenantId(), "users"];
}

export function legacyUserPath(uid: string): [string, string] {
  return ["users", uid];
}
