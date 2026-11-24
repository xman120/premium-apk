import { BotStrictness, ShieldSettings } from '@/src/types/store';
import { ipMatchesRule } from '@/src/utils/security';

const RATE_LIMIT_KEY = 'fs_shield_dl_timestamps_v1';
const HEARTBEAT_KEY = 'fs_shield_tab_presence_v1';

export interface BotCheckResult {
  isSuspicious: boolean;
  reasons: string[];
}

export interface InteractionTelemetry {
  mountTimestamp: number;
  hadUserInteraction: boolean;
}

export interface QueueEvaluation {
  inQueue: boolean;
  estimatedActiveUsers: number;
  queuePosition: number;
  waitSeconds: number;
}

export interface IpAccessResult {
  allowed: boolean;
  ip?: string;
  countryCode?: string;
  reason?: string;
}

/**
 * Evaluates client environment and interaction signals to catch automated scrapers
 * and headless browsers without blocking legitimate mobile or desktop visitors.
 */
export function detectBotSignals(
  strictness: BotStrictness,
  telemetry: InteractionTelemetry
): BotCheckResult {
  if (strictness === 'off') {
    return { isSuspicious: false, reasons: [] };
  }

  const reasons: string[] = [];
  const nav = typeof navigator !== 'undefined' ? navigator : null;

  if (nav) {
    if ((nav as Navigator & { webdriver?: boolean }).webdriver === true) {
      reasons.push('Automated WebDriver environment detected');
    }

    const ua = nav.userAgent || '';
    const headlessPattern =
      /HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|SlimerJS|CasperJS/i;
    if (headlessPattern.test(ua)) {
      reasons.push('Headless browser signature detected');
    }

    if (!nav.languages || nav.languages.length === 0) {
      reasons.push('Missing browser language headers');
    }

    if (strictness === 'strict') {
      const elapsed = Date.now() - telemetry.mountTimestamp;
      if (elapsed < 350 || !telemetry.hadUserInteraction) {
        reasons.push('Zero-interaction instant trigger detected');
      }
      if (typeof nav.plugins !== 'undefined' && nav.plugins.length === 0 && !/Android|iPhone|iPad|Mobile/i.test(ua)) {
        reasons.push('Desktop browser missing standard plugin list');
      }
    } else {
      const elapsed = Date.now() - telemetry.mountTimestamp;
      if (elapsed < 180 && !telemetry.hadUserInteraction) {
        reasons.push('Instantaneous automated click detected');
      }
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Tracks active local tabs and combines with admin-configured concurrency simulation
 * to determine if visitors enter the High-Traffic Priority Queue.
 */
export function registerTabPresence(): () => void {
  const tabId = `tab_${Math.random().toString(36).slice(2, 10)}`;
  const update = () => {
    try {
      const raw = localStorage.getItem(HEARTBEAT_KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const cleaned: Record<string, number> = {};
      for (const [id, ts] of Object.entries(map)) {
        if (now - ts < 15000) {
          cleaned[id] = ts;
        }
      }
      cleaned[tabId] = now;
      localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(cleaned));
    } catch {
      // noop
    }
  };

  update();
  const interval = window.setInterval(update, 5000);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel('fs_traffic_shield');
    channel.postMessage({ type: 'ping', tabId });
  } catch {
    // BroadcastChannel not supported
  }

  return () => {
    window.clearInterval(interval);
    try {
      channel?.close();
    } catch {
      // noop
    }
  };
}

export function evaluateQueueState(settings: ShieldSettings): QueueEvaluation {
  let localTabs = 1;
  try {
    const raw = localStorage.getItem(HEARTBEAT_KEY);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, number>;
      const now = Date.now();
      localTabs = Math.max(
        1,
        Object.values(map).filter((ts) => now - ts < 15000).length
      );
    }
  } catch {
    localTabs = 1;
  }

  const estimatedActiveUsers = Math.max(
    localTabs,
    settings.simulatedConcurrentUsers + localTabs
  );

  if (settings.queueMode === 'off') {
    return {
      inQueue: false,
      estimatedActiveUsers,
      queuePosition: 0,
      waitSeconds: 0,
    };
  }

  if (settings.queueMode === 'force_active') {
    const overflow = Math.max(12, estimatedActiveUsers - settings.maxConcurrentThreshold);
    return {
      inQueue: true,
      estimatedActiveUsers: Math.max(estimatedActiveUsers, settings.maxConcurrentThreshold + 42),
      queuePosition: overflow > 0 ? Math.min(overflow, 185) : 24,
      waitSeconds: Math.max(3, settings.queueWaitSeconds),
    };
  }

  // Auto mode: triggers when concurrent traffic exceeds threshold (default 2,000+)
  if (estimatedActiveUsers >= settings.maxConcurrentThreshold) {
    const excess = estimatedActiveUsers - settings.maxConcurrentThreshold + 1;
    return {
      inQueue: true,
      estimatedActiveUsers,
      queuePosition: Math.max(1, Math.min(excess, 450)),
      waitSeconds: Math.max(3, settings.queueWaitSeconds),
    };
  }

  return {
    inQueue: false,
    estimatedActiveUsers,
    queuePosition: 0,
    waitSeconds: 0,
  };
}

/**
 * Checks per-device download rate limit within a rolling 10-minute window.
 */
export function checkDownloadRateLimit(maxPer10Min: number): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  if (maxPer10Min <= 0) {
    return { allowed: true, remaining: 999, retryAfterSeconds: 0 };
  }
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const active = list.filter((ts) => now - ts < windowMs);
    if (active.length >= maxPer10Min) {
      const oldest = Math.min(...active);
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    return {
      allowed: true,
      remaining: Math.max(0, maxPer10Min - active.length),
      retryAfterSeconds: 0,
    };
  } catch {
    return { allowed: true, remaining: maxPer10Min, retryAfterSeconds: 0 };
  }
}

export function recordDownloadAttempt(): void {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const active = list.filter((ts) => now - ts < windowMs);
    active.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(active));
  } catch {
    // noop
  }
}

/**
 * Optional lightweight IP/Country check with strict 1800ms timeout and fail-open guarantee
 * so legitimate visitors are never stranded if offline or blocked by privacy extensions.
 */
export async function checkIpAccess(settings: ShieldSettings): Promise<IpAccessResult> {
  const hasIpRules = settings.blockedIpsAndCidrs.length > 0;
  const hasCountryRules = settings.blockedCountries.length > 0;

  if (!settings.enableGeoIpLookup || (!hasIpRules && !hasCountryRules)) {
    return { allowed: true };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 1800);

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      cache: 'no-store',
    });
    window.clearTimeout(timer);

    if (!res.ok) {
      return { allowed: true };
    }

    const data = (await res.json()) as { ip?: string; country_code?: string };
    const ip = data.ip || '';
    const country = (data.country_code || '').toUpperCase();

    if (ip && settings.blockedIpsAndCidrs.some((rule) => ipMatchesRule(ip, rule))) {
      return {
        allowed: false,
        ip,
        countryCode: country,
        reason: 'Your network address is restricted by the storefront administrator.',
      };
    }

    if (
      country &&
      settings.blockedCountries.some((c) => c.trim().toUpperCase() === country)
    ) {
      return {
        allowed: false,
        ip,
        countryCode: country,
        reason: `Downloads are currently restricted in your region (${country}).`,
      };
    }

    return { allowed: true, ip, countryCode: country };
  } catch {
    window.clearTimeout(timer);
    // Strict fail-open fallback
    return { allowed: true };
  }
}
