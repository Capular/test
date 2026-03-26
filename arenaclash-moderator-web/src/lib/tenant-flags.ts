export interface TenantFeatureFlags {
  platformEnabled: boolean;
  tournamentsEnabled: boolean;
  walletEnabled: boolean;
  supportEnabled: boolean;
  adminPanelEnabled: boolean;
  moderatorPanelEnabled: boolean;
}

export const defaultTenantFeatureFlags: TenantFeatureFlags = {
  platformEnabled: true,
  tournamentsEnabled: true,
  walletEnabled: true,
  supportEnabled: true,
  adminPanelEnabled: true,
  moderatorPanelEnabled: true,
};

export interface TenantFlagsPayload {
  tenantId?: string;
  slug?: string;
  status: string;
  featureFlags: TenantFeatureFlags;
}

export function normalizeFeatureFlags(value: unknown): TenantFeatureFlags {
  const raw = (value ?? {}) as Partial<TenantFeatureFlags>;
  return {
    platformEnabled: raw.platformEnabled !== false,
    tournamentsEnabled: raw.tournamentsEnabled !== false,
    walletEnabled: raw.walletEnabled !== false,
    supportEnabled: raw.supportEnabled !== false,
    adminPanelEnabled: raw.adminPanelEnabled !== false,
    moderatorPanelEnabled: raw.moderatorPanelEnabled !== false,
  };
}
