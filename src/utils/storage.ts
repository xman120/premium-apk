import {
  AdsConfig,
  AppItem,
  StorefrontConfig,
  UserRatingMap,
} from '@/src/types/store';
import { DEFAULT_ADMIN_PASSWORD_HASH } from '@/src/utils/security';

const KEYS = {
  APPS: 'fs_store_apps_v1',
  ADS: 'fs_store_ads_v1',
  STOREFRONT: 'fs_store_config_v1',
  RATINGS: 'fs_user_ratings_v1',
  DOWNLOAD_COUNTS: 'fs_local_downloads_v1',
  ADMIN_HASH: 'fs_admin_pass_hash_v1',
  THEME: 'fs_theme_mode_v1',
  DEPTH_3D: 'fs_depth_3d_v1',
  MOTION_3D: 'fs_motion_3d_v1',
} as const;

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  storeTitle: 'Premium APK World',
  storeTagline: 'Download verified Android games and APKs safely with SHA-256 package checks and high-speed mirrors.',
  logoAccent: 'emerald-blue',
  shield: {
    step2CountdownSeconds: 8,
    queueMode: 'auto',
    maxConcurrentThreshold: 2000,
    simulatedConcurrentUsers: 380,
    queueWaitSeconds: 6,
    botStrictness: 'standard',
    enableGeoIpLookup: false,
    blockedIpsAndCidrs: [],
    blockedCountries: [],
    rateLimitMaxPer10Min: 12,
  },
};

export const DEFAULT_ADS_CONFIG: AdsConfig = {
  disableAllAds: false,
  showPlaceholders: true,
  slots: {
    topLeaderboard: {
      enabled: true,
      label: 'Top Leaderboard Banner (728x90 / 970x90)',
      script: '',
    },
    inFeedNative: {
      enabled: true,
      label: 'In-Feed / Native Grid Card Ad',
      script: '',
    },
    detailsMiddleBanner: {
      enabled: true,
      label: 'App Details Middle Banner (300x250 / 336x280)',
      script: '',
    },
    step2VerificationBanner: {
      enabled: true,
      label: 'Download Step 2 Verification Banner (728x90 & 300x250)',
      script: '',
    },
    step3MirrorBanner: {
      enabled: true,
      label: 'Download Step 3 Mirror Banner (728x90 & 300x250)',
      script: '',
    },
    stickyFooterBanner: {
      enabled: false,
      label: 'Sticky Footer Banner (728x90 / 320x50)',
      script: '',
    },
    socialBar: {
      enabled: false,
      label: 'Social Bar Script',
      script: '',
    },
    inPagePush: {
      enabled: false,
      label: 'In-Page Push Script',
      script: '',
    },
    interstitial: {
      enabled: false,
      label: 'Interstitial Script',
      script: '',
    },
    popunder: {
      enabled: false,
      label: 'Popunder Script (Default OFF)',
      script: '',
    },
    directSmartlink: {
      enabled: false,
      label: 'Direct / Smartlink URL + Label',
      url: '',
      buttonLabel: 'Open Fast Cloud Mirror',
    },
  },
};

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in restricted browsing modes
  }
}

export async function loadInitialApps(): Promise<{ apps: AppItem[]; bundled: AppItem[] }> {
  let bundled: AppItem[] = [];
  try {
    const res = await fetch('/config/apps.json', { cache: 'no-store' });
    if (res.ok) {
      const parsed = await res.json();
      if (Array.isArray(parsed)) {
        bundled = parsed;
      }
    }
  } catch {
    bundled = [];
  }

  const localOverride = safeReadJson<AppItem[]>(KEYS.APPS);
  if (localOverride && Array.isArray(localOverride) && localOverride.length > 0) {
    return { apps: localOverride, bundled };
  }
  return { apps: bundled, bundled };
}

export function saveAppsOverride(apps: AppItem[]): void {
  safeWriteJson(KEYS.APPS, apps);
}

export function clearAppsOverride(): void {
  try {
    localStorage.removeItem(KEYS.APPS);
  } catch {
    // noop
  }
}

export async function loadInitialAds(): Promise<{ ads: AdsConfig; bundled: AdsConfig }> {
  let bundled: AdsConfig = DEFAULT_ADS_CONFIG;
  try {
    const res = await fetch('/config/ads.json', { cache: 'no-store' });
    if (res.ok) {
      const parsed = (await res.json()) as Partial<AdsConfig>;
      bundled = mergeAdsConfig(DEFAULT_ADS_CONFIG, parsed);
    }
  } catch {
    bundled = DEFAULT_ADS_CONFIG;
  }

  const localOverride = safeReadJson<Partial<AdsConfig>>(KEYS.ADS);
  if (localOverride) {
    return { ads: mergeAdsConfig(bundled, localOverride), bundled };
  }
  return { ads: bundled, bundled };
}

function mergeAdsConfig(base: AdsConfig, partial: Partial<AdsConfig>): AdsConfig {
  return {
    disableAllAds: partial.disableAllAds ?? base.disableAllAds,
    showPlaceholders: partial.showPlaceholders ?? base.showPlaceholders,
    slots: {
      topLeaderboard: { ...base.slots.topLeaderboard, ...(partial.slots?.topLeaderboard ?? {}) },
      inFeedNative: { ...base.slots.inFeedNative, ...(partial.slots?.inFeedNative ?? {}) },
      detailsMiddleBanner: { ...base.slots.detailsMiddleBanner, ...(partial.slots?.detailsMiddleBanner ?? {}) },
      step2VerificationBanner: { ...base.slots.step2VerificationBanner, ...(partial.slots?.step2VerificationBanner ?? {}) },
      step3MirrorBanner: { ...base.slots.step3MirrorBanner, ...(partial.slots?.step3MirrorBanner ?? {}) },
      stickyFooterBanner: { ...base.slots.stickyFooterBanner, ...(partial.slots?.stickyFooterBanner ?? {}) },
      socialBar: { ...base.slots.socialBar, ...(partial.slots?.socialBar ?? {}) },
      inPagePush: { ...base.slots.inPagePush, ...(partial.slots?.inPagePush ?? {}) },
      interstitial: { ...base.slots.interstitial, ...(partial.slots?.interstitial ?? {}) },
      popunder: { ...base.slots.popunder, ...(partial.slots?.popunder ?? {}) },
      directSmartlink: { ...base.slots.directSmartlink, ...(partial.slots?.directSmartlink ?? {}) },
    },
  };
}

export function saveAdsOverride(ads: AdsConfig): void {
  safeWriteJson(KEYS.ADS, ads);
}

export function clearAdsOverride(): void {
  try {
    localStorage.removeItem(KEYS.ADS);
  } catch {
    // noop
  }
}

export function loadStorefrontConfig(): StorefrontConfig {
  const saved = safeReadJson<Partial<StorefrontConfig>>(KEYS.STOREFRONT);
  if (!saved) return DEFAULT_STOREFRONT_CONFIG;
  const legacyDefaults = ['FormSnap Arcade & Apps', 'FormSnap Premium APK'];
  const title =
    saved.storeTitle && !legacyDefaults.includes(saved.storeTitle)
      ? saved.storeTitle
      : DEFAULT_STOREFRONT_CONFIG.storeTitle;
  return {
    storeTitle: title,
    storeTagline: saved.storeTagline || DEFAULT_STOREFRONT_CONFIG.storeTagline,
    logoAccent: saved.logoAccent || DEFAULT_STOREFRONT_CONFIG.logoAccent,
    shield: {
      ...DEFAULT_STOREFRONT_CONFIG.shield,
      ...(saved.shield ?? {}),
    },
  };
}

export function saveStorefrontConfig(config: StorefrontConfig): void {
  safeWriteJson(KEYS.STOREFRONT, config);
}

export function getBrowserFingerprint(): string {
  const parts = [
    navigator.language || 'en',
    String(navigator.hardwareConcurrency || 4),
    String(screen.width || 1440),
    String(screen.height || 900),
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  ];
  const raw = parts.join('|');
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

export function loadUserRatings(): UserRatingMap {
  return safeReadJson<UserRatingMap>(KEYS.RATINGS) ?? {};
}

export function saveUserRating(appId: string, stars: number): UserRatingMap {
  const clamped = Math.max(1, Math.min(5, Math.round(stars)));
  const current = loadUserRatings();
  const next: UserRatingMap = {
    ...current,
    [appId]: {
      stars: clamped,
      updatedAt: new Date().toISOString(),
      fingerprint: getBrowserFingerprint(),
    },
  };
  safeWriteJson(KEYS.RATINGS, next);
  return next;
}

export function getCombinedAppRating(
  app: AppItem,
  userRatings: UserRatingMap
): { average: number; totalVotes: number; userVote: number | null } {
  const record = userRatings[app.id];
  const baseTotal = app.initialRating * app.initialVotes;
  if (!record) {
    return {
      average: Number(app.initialRating.toFixed(1)),
      totalVotes: app.initialVotes,
      userVote: null,
    };
  }
  const totalVotes = app.initialVotes + 1;
  const average = Number(((baseTotal + record.stars) / totalVotes).toFixed(1));
  return {
    average,
    totalVotes,
    userVote: record.stars,
  };
}

export function loadLocalDownloadDeltas(): Record<string, number> {
  return safeReadJson<Record<string, number>>(KEYS.DOWNLOAD_COUNTS) ?? {};
}

export function incrementLocalDownloadCount(appId: string): Record<string, number> {
  const current = loadLocalDownloadDeltas();
  const next = {
    ...current,
    [appId]: (current[appId] ?? 0) + 1,
  };
  safeWriteJson(KEYS.DOWNLOAD_COUNTS, next);
  return next;
}

export function getStoredAdminHash(): string {
  try {
    const saved = localStorage.getItem(KEYS.ADMIN_HASH);
    if (saved && /^[a-f0-9]{64}$/i.test(saved)) {
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_ADMIN_PASSWORD_HASH;
}

export function setStoredAdminHash(hash: string): void {
  try {
    localStorage.setItem(KEYS.ADMIN_HASH, hash);
  } catch {
    // noop
  }
}

export function resetStoredAdminHash(): void {
  try {
    localStorage.removeItem(KEYS.ADMIN_HASH);
  } catch {
    // noop
  }
}

export function loadThemePreference(): boolean {
  try {
    return localStorage.getItem(KEYS.THEME) === 'dark';
  } catch {
    return false;
  }
}

export function saveThemePreference(isDark: boolean): void {
  try {
    localStorage.setItem(KEYS.THEME, isDark ? 'dark' : 'light');
  } catch {
    // noop
  }
}

export function loadDepth3DPreference(): boolean {
  try {
    const val = localStorage.getItem(KEYS.DEPTH_3D);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function saveDepth3DPreference(enabled: boolean): void {
  try {
    localStorage.setItem(KEYS.DEPTH_3D, enabled ? 'true' : 'false');
  } catch {
    // noop
  }
}

export function loadMotion3DPreference(): boolean {
  try {
    const val = localStorage.getItem(KEYS.MOTION_3D);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function saveMotion3DPreference(enabled: boolean): void {
  try {
    localStorage.setItem(KEYS.MOTION_3D, enabled ? 'true' : 'false');
  } catch {
    // noop
  }
}

