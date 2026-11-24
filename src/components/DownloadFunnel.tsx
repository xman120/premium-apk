import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  HardDrive,
  Lock,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import {
  AdsConfig,
  AppItem,
  FunnelStep,
  ShieldSettings,
  UserRatingMap,
} from '@/src/types/store';
import {
  copyTextToClipboard,
  formatDownloadCount,
  getSafeExternalHref,
} from '@/src/utils/security';
import { getCombinedAppRating } from '@/src/utils/storage';
import {
  checkDownloadRateLimit,
  checkIpAccess,
  detectBotSignals,
  evaluateQueueState,
  QueueEvaluation,
  recordDownloadAttempt,
} from '@/src/utils/trafficShield';
import { AdSlot } from '@/src/components/AdSlot';
import { AppImage } from '@/src/components/AppImage';
import { StarRating } from '@/src/components/StarRating';

interface DownloadFunnelProps {
  app: AppItem;
  adsConfig: AdsConfig;
  shieldSettings: ShieldSettings;
  userRatings: UserRatingMap;
  localDownloads: Record<string, number>;
  isAdminActive: boolean;
  onRateApp: (appId: string, stars: number) => void;
  onDownloadTriggered: (appId: string) => void;
  onBack: () => void;
}

type ShieldOverlayState =
  | { type: 'none' }
  | { type: 'checking' }
  | { type: 'queue'; info: QueueEvaluation; remainingSeconds: number }
  | { type: 'bot_challenge'; reasons: string[]; challengeCode: string }
  | { type: 'blocked'; reason: string }
  | { type: 'rate_limited'; retryAfterSeconds: number };

export const DownloadFunnel: React.FC<DownloadFunnelProps> = ({
  app,
  adsConfig,
  shieldSettings,
  userRatings,
  localDownloads,
  isAdminActive,
  onRateApp,
  onDownloadTriggered,
  onBack,
}) => {
  const [step, setStep] = useState<FunnelStep>(1);
  const [countdown, setCountdown] = useState<number>(shieldSettings.step2CountdownSeconds);
  const [selectedMirror, setSelectedMirror] = useState<'primary' | 'github'>('primary');
  const [copiedHash, setCopiedHash] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [shieldState, setShieldState] = useState<ShieldOverlayState>({ type: 'none' });
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeError, setChallengeError] = useState('');

  const mountTimestampRef = useRef<number>(Date.now());
  const hadInteractionRef = useRef<boolean>(false);

  useEffect(() => {
    const markInteraction = () => {
      hadInteractionRef.current = true;
    };
    window.addEventListener('pointerdown', markInteraction, { passive: true });
    window.addEventListener('keydown', markInteraction, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, []);

  // Reset funnel when switching apps
  useEffect(() => {
    setStep(1);
    setCountdown(shieldSettings.step2CountdownSeconds);
    setDownloadStarted(false);
    setShieldState({ type: 'none' });
    mountTimestampRef.current = Date.now();
  }, [app.id, shieldSettings.step2CountdownSeconds]);

  // Priority Queue countdown timer
  useEffect(() => {
    if (shieldState.type !== 'queue') return;
    if (shieldState.remainingSeconds <= 0) {
      setShieldState({ type: 'none' });
      setCountdown(shieldSettings.step2CountdownSeconds);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const timer = window.setTimeout(() => {
      setShieldState((prev) =>
        prev.type === 'queue'
          ? { ...prev, remainingSeconds: Math.max(0, prev.remainingSeconds - 1) }
          : prev
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [shieldState, shieldSettings.step2CountdownSeconds]);

  // Step 2 Verification Countdown timer
  useEffect(() => {
    if (step !== 2) return;
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [step, countdown]);

  const { average, totalVotes, userVote } = getCombinedAppRating(app, userRatings);
  const totalDownloads = app.downloads + (localDownloads[app.id] ?? 0);

  const safeApkHref = useMemo(() => getSafeExternalHref(app.apkUrl), [app.apkUrl]);
  const safeSmartlinkHref = useMemo(
    () =>
      adsConfig.slots.directSmartlink.enabled
        ? getSafeExternalHref(adsConfig.slots.directSmartlink.url)
        : null,
    [adsConfig.slots.directSmartlink]
  );

  const enterStep2AfterChecks = async () => {
    setShieldState({ type: 'checking' });

    const ipResult = await checkIpAccess(shieldSettings);
    if (!ipResult.allowed) {
      setShieldState({
        type: 'blocked',
        reason: ipResult.reason || 'Access is restricted for your region or IP.',
      });
      return;
    }

    const rate = checkDownloadRateLimit(shieldSettings.rateLimitMaxPer10Min);
    if (!rate.allowed) {
      setShieldState({
        type: 'rate_limited',
        retryAfterSeconds: rate.retryAfterSeconds,
      });
      return;
    }

    const botCheck = detectBotSignals(shieldSettings.botStrictness, {
      mountTimestamp: mountTimestampRef.current,
      hadUserInteraction: hadInteractionRef.current,
    });
    if (botCheck.isSuspicious) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setChallengeInput('');
      setChallengeError('');
      setShieldState({
        type: 'bot_challenge',
        reasons: botCheck.reasons,
        challengeCode: code,
      });
      return;
    }

    const queue = evaluateQueueState(shieldSettings);
    if (queue.inQueue) {
      setShieldState({
        type: 'queue',
        info: queue,
        remainingSeconds: queue.waitSeconds,
      });
      return;
    }

    setShieldState({ type: 'none' });
    setCountdown(shieldSettings.step2CountdownSeconds);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSolveBotChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (shieldState.type !== 'bot_challenge') return;
    if (challengeInput.trim() !== shieldState.challengeCode) {
      setChallengeError('Code does not match. Please enter the 4 digits shown above.');
      return;
    }
    const queue = evaluateQueueState(shieldSettings);
    if (queue.inQueue) {
      setShieldState({
        type: 'queue',
        info: queue,
        remainingSeconds: queue.waitSeconds,
      });
      return;
    }
    setShieldState({ type: 'none' });
    setCountdown(shieldSettings.step2CountdownSeconds);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopySha256 = async () => {
    const ok = await copyTextToClipboard(app.sha256);
    if (ok) {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleTriggerFinalDownload = () => {
    if (!safeApkHref) return;
    recordDownloadAttempt();
    onDownloadTriggered(app.id);
    setDownloadStarted(true);

    // Programmatic anchor download trigger (avoids window.open / unsafe redirects)
    const link = document.createElement('a');
    link.href = safeApkHref;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Optional separate non-blocking Smartlink tab if enabled by admin
    if (safeSmartlinkHref && !isAdminActive && !adsConfig.disableAllAds) {
      const adLink = document.createElement('a');
      adLink.href = safeSmartlinkHref;
      adLink.target = '_blank';
      adLink.rel = 'noopener noreferrer';
      document.body.appendChild(adLink);
      adLink.click();
      document.body.removeChild(adLink);
    }
  };

  const totalWait = Math.max(1, shieldSettings.step2CountdownSeconds);
  const progressRatio = Math.min(1, Math.max(0, (totalWait - countdown) / totalWait));

  const verificationItems = [
    {
      label: 'Checking package integrity & APK manifest...',
      done: progressRatio >= 0.25 || countdown === 0,
    },
    {
      label: 'Verifying SHA-256 cryptographic digest...',
      done: progressRatio >= 0.55 || countdown === 0,
    },
    {
      label: 'Scanning archive signature for anomalies...',
      done: progressRatio >= 0.85 || countdown === 0,
    },
    {
      label: 'Allocating high-speed CDN mirror...',
      done: countdown === 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Funnel Navigation & Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Storefront</span>
        </button>

        <nav aria-label="Download progress" className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3">
          {([
            { num: 1, label: 'Overview', short: '1. Overview' },
            { num: 2, label: 'Verification', short: '2. Verify' },
            { num: 3, label: 'Mirror Ready', short: '3. Mirror' },
          ] as const).map((item, idx) => {
            const active = step === item.num;
            const completed = step > item.num;
            return (
              <React.Fragment key={item.num}>
                <div
                  className={`inline-flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap py-1.5 sm:py-0 rounded-lg sm:rounded-none border sm:border-0 ${
                    active
                      ? 'border-[#2563EB]/40 bg-[#2563EB]/10 sm:bg-transparent text-[#2563EB] dark:text-blue-400 font-semibold'
                      : completed
                      ? 'border-[#059669]/30 bg-[#059669]/10 sm:bg-transparent text-[#059669]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <span
                    className={`hidden sm:inline-flex w-5 h-5 rounded-full items-center justify-center font-mono text-[11px] border ${
                      active
                        ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : completed
                        ? 'border-[#059669] bg-[#059669] text-white'
                        : 'border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {completed ? <Check className="w-3 h-3" /> : item.num}
                  </span>
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">
                    Step {item.num} of 3 · {item.label}
                  </span>
                </div>
                {idx < 2 && (
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700 select-none" aria-hidden="true">
                    /
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Shield Overlay Screens (Queue / Bot Verification / Blocked / Rate Limited) */}
      {shieldState.type !== 'none' && (
        <section
          aria-live="polite"
          className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 max-w-2xl mx-auto my-8"
        >
          {shieldState.type === 'checking' && (
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <Shield className="w-10 h-10 text-[#2563EB] animate-pulse" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Evaluating Traffic Shield & Mirror Capacity
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Checking regional availability and server concurrency...
              </p>
            </div>
          )}

          {shieldState.type === 'queue' && (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 text-[#2563EB] mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  High Server Demand — You Are in the Priority Queue
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-lg mx-auto">
                  Traffic has exceeded normal storefront capacity. Your download slot for{' '}
                  <span className="font-semibold">{app.title}</span> is reserved and will open automatically.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Queue Position</div>
                  <div className="font-mono text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums mt-0.5">
                    #{shieldState.info.queuePosition}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Concurrent Load</div>
                  <div className="font-mono text-xl font-bold text-[#2563EB] dark:text-blue-400 tabular-nums mt-0.5">
                    {shieldState.info.estimatedActiveUsers.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Auto-Entry In</div>
                  <div className="font-mono text-xl font-bold text-[#059669] tabular-nums mt-0.5">
                    {shieldState.remainingSeconds}s
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keep this tab open — do not refresh so your place in line stays reserved.
              </p>
            </div>
          )}

          {shieldState.type === 'bot_challenge' && (
            <form onSubmit={handleSolveBotChallenge} className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Quick Human Verification Required
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Automated traffic protection flagged this request ({shieldState.reasons[0]}). Enter the 4-digit security code below to continue to the APK download.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Verification Code
                </span>
                <span className="font-mono text-2xl font-bold tracking-[0.25em] text-[#0F172A] dark:text-[#F8FAFC] select-none">
                  {shieldState.challengeCode}
                </span>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="bot-challenge-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Type the 4 digits above
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="bot-challenge-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={challengeInput}
                    onChange={(e) => setChallengeInput(e.target.value)}
                    placeholder="0000"
                    className="flex-1 h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] font-mono text-base tracking-widest text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="submit"
                    className="h-11 px-5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Verify & Continue
                  </button>
                </div>
                {challengeError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{challengeError}</p>
                )}
              </div>
            </form>
          )}

          {shieldState.type === 'blocked' && (
            <div className="space-y-4 text-center py-4">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400 mx-auto" />
              <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Download Access Restricted
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {shieldState.reason}
              </p>
              <button
                type="button"
                onClick={() => setShieldState({ type: 'none' })}
                className="h-10 px-5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium cursor-pointer"
              >
                Return to App Details
              </button>
            </div>
          )}

          {shieldState.type === 'rate_limited' && (
            <div className="space-y-4 text-center py-4">
              <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
              <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Download Rate Limit Reached
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                To keep high-speed mirrors available for everyone, please wait{' '}
                <span className="font-mono font-semibold">{shieldState.retryAfterSeconds}s</span>{' '}
                before initiating another download.
              </p>
              <button
                type="button"
                onClick={() => setShieldState({ type: 'none' })}
                className="h-10 px-5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium cursor-pointer"
              >
                Back to Overview
              </button>
            </div>
          )}
        </section>
      )}

      {/* STEP 1: App Details & Overview */}
      {shieldState.type === 'none' && step === 1 && (
        <div className="space-y-6">
          {/* Ad Slot 1: Top Leaderboard */}
          <AdSlot
            slotKey="topLeaderboard"
            adsConfig={adsConfig}
            isAdminActive={isAdminActive}
            variant="leaderboard"
          />

          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-8">
            {/* App Header + Contiguous Action Module */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <AppImage
                    src={app.iconUrl}
                    alt={`${app.title} icon`}
                    fallbackTitle={app.title}
                    variant="icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {app.category} · {app.developer}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1">
                    {app.title}
                  </h1>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">
                    {app.packageName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-3">
                    <span className="font-mono font-semibold">{app.version}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold">{app.sizeMB.toFixed(1)} MB</span>
                    <span aria-hidden="true">·</span>
                    <span>{app.minAndroid}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatDownloadCount(totalDownloads)} downloads
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={enterStep2AfterChecks}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111827]"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Proceed to Download ({app.sizeMB.toFixed(1)} MB)</span>
                </button>
                <span className="inline-flex items-center justify-center sm:justify-end gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" aria-hidden="true" />
                  <span>Direct APK · SHA-256 Verified</span>
                </span>
              </div>
            </div>

            {/* Screenshot Gallery (Swipeable horizontal snap on mobile, 2-col grid on tablet/desktop) */}
            {app.screenshots.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Screenshots & Media
                </h2>
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-1 no-scrollbar sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible">
                  {app.screenshots.map((shot, i) => (
                    <button
                      key={`${shot}-${i}`}
                      type="button"
                      onClick={() => setPreviewImage(shot)}
                      className="w-[84%] shrink-0 snap-center sm:w-auto aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 cursor-zoom-in group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      <AppImage
                        src={shot}
                        alt={`${app.title} screenshot ${i + 1}`}
                        fallbackTitle={app.title}
                        variant="banner"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ad Slot 2: Details Middle Banner */}
            <AdSlot
              slotKey="detailsMiddleBanner"
              adsConfig={adsConfig}
              isAdminActive={isAdminActive}
              variant="rectangle"
            />

            {/* Description & Changelog */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    About This Release
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mt-2 whitespace-pre-line">
                    {app.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h2 className="font-display text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    What's New in {app.version}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2 whitespace-pre-line">
                    {app.changelog}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1120] p-5 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Technical Package Metadata
                  </h3>
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400">Package ID</dt>
                      <dd className="font-mono text-[#0F172A] dark:text-slate-200 truncate">
                        {app.packageName}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400">Version Code</dt>
                      <dd className="font-mono text-[#0F172A] dark:text-slate-200">
                        {app.version}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400">Archive Size</dt>
                      <dd className="font-mono text-[#0F172A] dark:text-slate-200">
                        {app.sizeMB.toFixed(1)} MB
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400">Minimum OS</dt>
                      <dd className="text-[#0F172A] dark:text-slate-200">{app.minAndroid}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400">Updated</dt>
                      <dd className="font-mono text-[#0F172A] dark:text-slate-200">
                        {app.updatedAt}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Ad Slot 3: Native Card */}
                <AdSlot
                  slotKey="inFeedNative"
                  adsConfig={adsConfig}
                  isAdminActive={isAdminActive}
                  variant="native"
                />
              </div>
            </div>

            {/* No-Login Interactive Star Rating */}
            <div className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Community Rating
              </h2>
              <StarRating
                average={average}
                totalVotes={totalVotes}
                userVote={userVote}
                interactive
                onRate={(stars) => onRateApp(app.id, stars)}
              />
            </div>

            {/* Bottom CTA + Ad Slot 4 */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Ready to verify package <span className="font-mono font-medium">{app.version}</span>?
              </div>
              <button
                type="button"
                onClick={enterStep2AfterChecks}
                className="w-full sm:w-auto h-12 px-7 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Proceed to Download ({app.sizeMB.toFixed(1)} MB)</span>
              </button>
            </div>
          </section>

          <AdSlot
            slotKey="step2VerificationBanner"
            adsConfig={adsConfig}
            isAdminActive={isAdminActive}
            variant="leaderboard"
          />
        </div>
      )}

      {/* STEP 2: Package Verification & Security Check */}
      {shieldState.type === 'none' && step === 2 && (
        <div className="space-y-6">
          {/* Top Verification Leaderboard */}
          <AdSlot
            slotKey="topLeaderboard"
            adsConfig={adsConfig}
            isAdminActive={isAdminActive}
            variant="leaderboard"
          />

          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <AppImage
                    src={app.iconUrl}
                    alt={`${app.title} icon`}
                    fallbackTitle={app.title}
                    variant="icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Verifying {app.title}
                  </h1>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {app.packageName} · {app.version} · {app.sizeMB.toFixed(1)} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shrink-0">
                <Clock className="w-4 h-4 text-[#2563EB] dark:text-blue-400" aria-hidden="true" />
                <div className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Mirror unlocks in </span>
                  <span className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                    {countdown}s
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Verification Banner */}
            <AdSlot
              slotKey="step2VerificationBanner"
              adsConfig={adsConfig}
              isAdminActive={isAdminActive}
              variant="rectangle"
            />

            {/* Animated Verification Checklist */}
            <div className="space-y-3">
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#059669] transition-all duration-500"
                  style={{ width: `${Math.round(progressRatio * 100)}%` }}
                />
              </div>

              <ul className="space-y-2.5 pt-2">
                {verificationItems.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1120]"
                  >
                    <span className="text-sm text-[#0F172A] dark:text-slate-200">
                      {item.label}
                    </span>
                    {item.done ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] whitespace-nowrap">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>Passed</span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        Scanning...
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Native Slot */}
            <AdSlot
              slotKey="inFeedNative"
              adsConfig={adsConfig}
              isAdminActive={isAdminActive}
              variant="native"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium text-slate-500 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                Back to App Overview
              </button>

              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => {
                  setStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full sm:w-auto h-12 px-7 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  countdown > 0
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-[#059669] hover:bg-[#047857] text-white cursor-pointer'
                }`}
              >
                {countdown > 0 ? (
                  <span>Preparing Mirror ({countdown}s)...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>Continue to Mirror Selection</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Bottom Step 2 Banner */}
          <AdSlot
            slotKey="detailsMiddleBanner"
            adsConfig={adsConfig}
            isAdminActive={isAdminActive}
            variant="leaderboard"
          />
        </div>
      )}

      {/* STEP 3: Mirror & Download Ready */}
      {shieldState.type === 'none' && step === 3 && (
        <div className="space-y-6">
          <AdSlot
            slotKey="step3MirrorBanner"
            adsConfig={adsConfig}
            isAdminActive={isAdminActive}
            variant="leaderboard"
          />

          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <AppImage
                    src={app.iconUrl}
                    alt={`${app.title} icon`}
                    fallbackTitle={app.title}
                    variant="icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#059669]">
                    Signature Verified · Ready for Download
                  </div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                    {app.title} ({app.version})
                  </h1>
                </div>
              </div>

              <div className="font-mono text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {app.sizeMB.toFixed(1)} MB · {app.minAndroid}
              </div>
            </div>

            {/* Mirror Selector */}
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Select High-Speed Download Mirror
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMirror('primary')}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    selectedMirror === 'primary'
                      ? 'border-[#059669] bg-[#059669]/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      <Server className="w-4 h-4 text-[#059669]" aria-hidden="true" />
                      <span>Primary CDN Mirror</span>
                    </span>
                    <span className="text-xs font-mono text-[#059669]">Online</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Direct unthrottled APK delivery · Supports 300MB+ resume
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMirror('github')}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    selectedMirror === 'github'
                      ? 'border-[#2563EB] bg-[#2563EB]/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      <HardDrive className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                      <span>Release Archive Mirror</span>
                    </span>
                    <span className="text-xs font-mono text-[#2563EB] dark:text-blue-400">
                      Standby
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Signed release artifact backup · SHA-256 matched
                  </p>
                </button>
              </div>
            </div>

            {/* SHA-256 Checksum Bar */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                  SHA-256 Checksum
                </span>
                <code className="font-mono text-xs text-[#0F172A] dark:text-slate-200 break-all">
                  {app.sha256}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopySha256}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer self-start sm:self-center"
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>

            {/* Non-Overlapping Step 3 Display Slot */}
            <AdSlot
              slotKey="detailsMiddleBanner"
              adsConfig={adsConfig}
              isAdminActive={isAdminActive}
              variant="rectangle"
            />

            {/* Primary Download Action */}
            <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {downloadStarted
                    ? 'Download started — check your browser downloads'
                    : 'Your verified APK package is ready'}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {safeApkHref
                    ? 'Direct HTTPS package link verified'
                    : 'Invalid download URL configured — inspect in #iamadmin'}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                {safeSmartlinkHref && !isAdminActive && !adsConfig.disableAllAds && (
                  <a
                    href={safeSmartlinkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 px-5 rounded-xl border border-[#2563EB]/40 bg-white dark:bg-[#111827] text-[#2563EB] dark:text-blue-400 text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {adsConfig.slots.directSmartlink.buttonLabel || 'Open Cloud Mirror'}
                    </span>
                  </a>
                )}

                <button
                  type="button"
                  disabled={!safeApkHref}
                  onClick={handleTriggerFinalDownload}
                  className="h-12 px-7 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:bg-slate-300 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Start Direct APK Download</span>
                </button>
              </div>
            </div>

            {/* Android Install Instructions */}
            <div className="pt-2 space-y-3">
              <h2 className="font-display text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>How to Install on Android</span>
              </h2>
              <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
                <li className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1120]">
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block mb-1">
                    1. Download APK File
                  </span>
                  Tap "Start Direct APK Download" above and wait for the {app.sizeMB.toFixed(1)} MB file to finish saving.
                </li>
                <li className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1120]">
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block mb-1">
                    2. Enable Unknown Sources
                  </span>
                  Open Android Settings → Security / Apps → allow "Install unknown apps" for your browser.
                </li>
                <li className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1120]">
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block mb-1">
                    3. Open & Install
                  </span>
                  Tap the downloaded `.apk` notification or open it in your Files app to complete setup.
                </li>
              </ol>
            </div>

            {/* Native Ad Slot */}
            <AdSlot
              slotKey="inFeedNative"
              adsConfig={adsConfig}
              isAdminActive={isAdminActive}
              variant="native"
            />
          </section>
        </div>
      )}

      {/* Lightbox Screenshot Preview */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              aria-label="Close preview"
              className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <AppImage
              src={previewImage}
              alt={`${app.title} full screenshot`}
              fallbackTitle={app.title}
              variant="banner"
              className="w-full max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Security Footer Note inside Funnel */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-2">
        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Protected by client-side Traffic Shield & SHA-256 package validation</span>
      </div>
    </div>
  );
};
