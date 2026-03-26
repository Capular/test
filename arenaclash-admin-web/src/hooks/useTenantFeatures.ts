"use client";

import { useEffect, useState } from "react";
import {
  defaultTenantFeatureFlags,
  normalizeFeatureFlags,
  type TenantFeatureFlags,
} from "@/lib/tenant-flags";

interface FeatureState {
  loading: boolean;
  status: string;
  flags: TenantFeatureFlags;
}

export function useTenantFeatures(): FeatureState {
  const [state, setState] = useState<FeatureState>({
    loading: true,
    status: "active",
    flags: defaultTenantFeatureFlags,
  });

  useEffect(() => {
    let mounted = true;

    const loadFlags = async () => {
      try {
        const response = await fetch("/api/tenant/flags", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load feature flags");
        const payload = (await response.json()) as { status?: string; featureFlags?: unknown };
        if (!mounted) return;
        setState({
          loading: false,
          status: payload.status || "active",
          flags: normalizeFeatureFlags(payload.featureFlags),
        });
      } catch {
        if (!mounted) return;
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    loadFlags();
    const intervalId = window.setInterval(loadFlags, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}
