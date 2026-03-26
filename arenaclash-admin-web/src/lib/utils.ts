import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMasterPanelUrl(): string {
  const raw = process.env.NEXT_PUBLIC_MASTER_PANEL_URL?.trim() || ""
  if (!raw) return ""
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "")
  }
  return `https://${raw.replace(/^\/+/, "").replace(/\/$/, "")}`
}

export function getTenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_SLUG || process.env.TENANT_SLUG || "").trim().toLowerCase()
}
