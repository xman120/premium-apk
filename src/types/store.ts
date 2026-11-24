export type AppCategory =
  | 'Action Games'
  | 'Racing'
  | 'Arcade'
  | 'Casual'
  | 'Tools & Utilities'
  | 'Productivity';

export const APP_CATEGORIES: ReadonlyArray<'All' | AppCategory> = [
  'All',
  'Action Games',
  'Racing',
  'Arcade',
  'Casual',
  'Tools & Utilities',
  'Productivity',
];

export type SortOption = 'trending' | 'highest_rated' | 'newest' | 'smallest_size';

export interface AppItem {
  id: string;
  title: string;
  subtitle: string;
  packageName: string;
  version: string;
  sizeMB: number;
  category: AppCategory;
  minAndroid: string;
  developer: string;
  iconUrl: string;
  screenshots: string[];
  description: string;
  changelog: string;
  apkUrl: string;
  sha256: string;
  downloads: number;
  initialRating: number;
  initialVotes: number;
  featured: boolean;
  active: boolean;
  updatedAt: string;
}

export type AdSlotKey =
  | 'topLeaderboard'
  | 'inFeedNative'
  | 'detailsMiddleBanner'
  | 'step2VerificationBanner'
  | 'step3MirrorBanner'
  | 'stickyFooterBanner'
  | 'socialBar'
  | 'inPagePush'
  | 'interstitial'
  | 'popunder';

export interface AdSlotConfig {
  enabled: boolean;
  label: string;
  script: string;
}

export interface DirectSmartlinkConfig {
  enabled: boolean;
  label: string;
  url: string;
  buttonLabel: string;
}

export interface AdsConfig {
  disableAllAds: boolean;
  showPlaceholders: boolean;
  slots: {
    topLeaderboard: AdSlotConfig;
    inFeedNative: AdSlotConfig;
    detailsMiddleBanner: AdSlotConfig;
    step2VerificationBanner: AdSlotConfig;
    step3MirrorBanner: AdSlotConfig;
    stickyFooterBanner: AdSlotConfig;
    socialBar: AdSlotConfig;
    inPagePush: AdSlotConfig;
    interstitial: AdSlotConfig;
    popunder: AdSlotConfig;
    directSmartlink: DirectSmartlinkConfig;
  };
}

export type QueueMode = 'auto' | 'force_active' | 'off';
export type BotStrictness = 'off' | 'standard' | 'strict';

export interface ShieldSettings {
  step2CountdownSeconds: number;
  queueMode: QueueMode;
  maxConcurrentThreshold: number;
  simulatedConcurrentUsers: number;
  queueWaitSeconds: number;
  botStrictness: BotStrictness;
  enableGeoIpLookup: boolean;
  blockedIpsAndCidrs: string[];
  blockedCountries: string[];
  rateLimitMaxPer10Min: number;
}

export type LogoAccent = 'emerald-blue' | 'emerald-gold' | 'cobalt-cyan';

export interface StorefrontConfig {
  storeTitle: string;
  storeTagline: string;
  logoAccent: LogoAccent;
  shield: ShieldSettings;
}

export interface UserRatingRecord {
  stars: number;
  updatedAt: string;
  fingerprint: string;
}

export type UserRatingMap = Record<string, UserRatingRecord>;

export type FunnelStep = 1 | 2 | 3;
