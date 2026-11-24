import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Megaphone,
  PackagePlus,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import {
  AdsConfig,
  AdSlotKey,
  APP_CATEGORIES,
  AppCategory,
  AppItem,
  BotStrictness,
  LogoAccent,
  QueueMode,
  StorefrontConfig,
  UserRatingMap,
} from '@/src/types/store';
import {
  copyTextToClipboard,
  downloadJsonFile,
  hashPassword,
  isSafeUrl,
  timingSafeEqualHex,
} from '@/src/utils/security';
import {
  getStoredAdminHash,
  resetStoredAdminHash,
  setStoredAdminHash,
} from '@/src/utils/storage';
import { AppCard } from '@/src/components/AppCard';
import { BrandLogo } from '@/src/components/BrandLogo';

interface AdminPanelProps {
  apps: AppItem[];
  adsConfig: AdsConfig;
  storefrontConfig: StorefrontConfig;
  userRatings: UserRatingMap;
  localDownloads: Record<string, number>;
  depth3D: boolean;
  onUpdateApps: (apps: AppItem[]) => void;
  onResetApps: () => void;
  onUpdateAds: (ads: AdsConfig) => void;
  onUpdateStorefront: (config: StorefrontConfig) => void;
  onExitAdmin: () => void;
}

type AdminTab = 'apps' | 'ads' | 'shield';

const CATEGORIES_ONLY = APP_CATEGORIES.filter(
  (c): c is AppCategory => c !== 'All'
);

const EMPTY_APP_DRAFT = (): AppItem => ({
  id: `app-${Date.now().toString(36)}`,
  title: '',
  subtitle: '',
  packageName: 'com.studio.newapp',
  version: 'v1.0.0',
  sizeMB: 125.0,
  category: 'Action Games',
  minAndroid: 'Android 10.0+',
  developer: '',
  iconUrl: '/src/assets/images/icon_apex_velocity_1795505063914.jpg',
  screenshots: ['/src/assets/images/screen_apex_track_1795505066230.jpg'],
  description: '',
  changelog: 'Initial verified release.',
  apkUrl: 'https://github.com/your-org/releases/releases/download/v1.0.0/app-v1.0.0.apk',
  sha256: '0000000000000000000000000000000000000000000000000000000000000000',
  downloads: 1000,
  initialRating: 4.7,
  initialVotes: 120,
  featured: false,
  active: true,
  updatedAt: new Date().toISOString().slice(0, 10),
});

const AD_SLOT_ORDER: AdSlotKey[] = [
  'topLeaderboard',
  'inFeedNative',
  'detailsMiddleBanner',
  'step2VerificationBanner',
  'step3MirrorBanner',
  'stickyFooterBanner',
  'socialBar',
  'inPagePush',
  'interstitial',
  'popunder',
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  apps,
  adsConfig,
  storefrontConfig,
  userRatings,
  localDownloads,
  depth3D,
  onUpdateApps,
  onResetApps,
  onUpdateAds,
  onUpdateStorefront,
  onExitAdmin,
}) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('apps');

  // App CRUD editor state
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [screenshotsText, setScreenshotsText] = useState('');
  const [showGithubGuide, setShowGithubGuide] = useState(false);
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const candidateHash = await hashPassword(passwordInput);
      const expectedHash = getStoredAdminHash();
      if (timingSafeEqualHex(candidateHash, expectedHash)) {
        setAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError('Incorrect administrator password.');
      }
    } catch {
      setAuthError('Browser cryptography is unavailable in this context.');
    }
  };

  const notifyCopy = (label: string) => {
    setCopiedBanner(label);
    setTimeout(() => setCopiedBanner(null), 2200);
  };

  const openEditorForApp = (app: AppItem | null) => {
    const draft = app ? { ...app, screenshots: [...app.screenshots] } : EMPTY_APP_DRAFT();
    setEditingApp(draft);
    setScreenshotsText(draft.screenshots.join('\n'));
  };

  const handleSaveAppDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    const cleanScreenshots = screenshotsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const finalized: AppItem = {
      ...editingApp,
      title: editingApp.title.trim() || 'Untitled App',
      subtitle: editingApp.subtitle.trim() || 'Verified Android release',
      developer: editingApp.developer.trim() || 'Independent Studio',
      screenshots: cleanScreenshots,
      sizeMB: Number(editingApp.sizeMB) || 10,
      initialRating: Math.min(5, Math.max(1, Number(editingApp.initialRating) || 4.5)),
      initialVotes: Math.max(1, Math.round(Number(editingApp.initialVotes) || 1)),
      downloads: Math.max(0, Math.round(Number(editingApp.downloads) || 0)),
    };

    const exists = apps.some((a) => a.id === finalized.id);
    let nextApps = exists
      ? apps.map((a) => (a.id === finalized.id ? finalized : a))
      : [finalized, ...apps];

    if (finalized.featured) {
      nextApps = nextApps.map((a) =>
        a.id === finalized.id ? { ...a, featured: true } : { ...a, featured: false }
      );
    }

    onUpdateApps(nextApps);
    setEditingApp(null);
  };

  const handleMoveApp = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= apps.length) return;
    const copy = [...apps];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    onUpdateApps(copy);
  };

  const handleDeleteApp = (id: string) => {
    onUpdateApps(apps.filter((a) => a.id !== id));
    if (editingApp?.id === id) {
      setEditingApp(null);
    }
  };

  const handleToggleFeatured = (id: string) => {
    onUpdateApps(
      apps.map((a) => ({
        ...a,
        featured: a.id === id ? !a.featured : false,
      }))
    );
  };

  const handleToggleActive = (id: string) => {
    onUpdateApps(
      apps.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const handleApplySafeHighRevenuePreset = () => {
    onUpdateAds({
      ...adsConfig,
      disableAllAds: false,
      slots: {
        ...adsConfig.slots,
        topLeaderboard: { ...adsConfig.slots.topLeaderboard, enabled: true },
        inFeedNative: { ...adsConfig.slots.inFeedNative, enabled: true },
        detailsMiddleBanner: { ...adsConfig.slots.detailsMiddleBanner, enabled: true },
        step2VerificationBanner: { ...adsConfig.slots.step2VerificationBanner, enabled: true },
        step3MirrorBanner: { ...adsConfig.slots.step3MirrorBanner, enabled: true },
        stickyFooterBanner: { ...adsConfig.slots.stickyFooterBanner, enabled: true },
        socialBar: { ...adsConfig.slots.socialBar, enabled: true },
        inPagePush: { ...adsConfig.slots.inPagePush, enabled: true },
        interstitial: { ...adsConfig.slots.interstitial, enabled: false },
        popunder: { ...adsConfig.slots.popunder, enabled: false },
        directSmartlink: { ...adsConfig.slots.directSmartlink, enabled: true },
      },
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    try {
      const currentHash = await hashPassword(currentPw);
      const expected = getStoredAdminHash();
      if (!timingSafeEqualHex(currentHash, expected)) {
        setPwMessage({ type: 'err', text: 'Current password is incorrect.' });
        return;
      }
      if (newPw.length < 6) {
        setPwMessage({ type: 'err', text: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPw !== confirmPw) {
        setPwMessage({ type: 'err', text: 'New passwords do not match.' });
        return;
      }
      const nextHash = await hashPassword(newPw);
      setStoredAdminHash(nextHash);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwMessage({ type: 'ok', text: 'Administrator password updated for this browser.' });
    } catch {
      setPwMessage({ type: 'err', text: 'Failed to update password.' });
    }
  };

  const handleResetPassword = () => {
    resetStoredAdminHash();
    setPwMessage({
      type: 'ok',
      text: 'Password hash reset to default (documented in README.md).',
    });
  };

  // Password Gate Screen
  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storefront</span>
            </button>
            <span className="text-xs font-mono text-slate-400">SHA-256 Gate</span>
          </div>

          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Storefront Administration
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Global ad scripts are paused while this panel is open. Enter your administrator password to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Administrator Password
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Unlock Admin Console
            </button>
          </form>

          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Default credentials are documented in <span className="font-mono">README.md</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#059669]">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Global Ads Paused · Static JSON + Local Preview Active</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1">
            Admin Control Center
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {copiedBanner && (
            <span className="text-xs font-medium text-[#059669] inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{copiedBanner}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onExitAdmin}
            className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to Storefront</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('apps')}
          className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'apps'
              ? 'bg-white dark:bg-[#0B1120] text-[#0F172A] dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <PackagePlus className="w-3.5 h-3.5" />
          <span>App & Game Manager ({apps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ads')}
          className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'ads'
              ? 'bg-white dark:bg-[#0B1120] text-[#0F172A] dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Adsterra Ad Manager</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shield')}
          className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'shield'
              ? 'bg-white dark:bg-[#0B1120] text-[#0F172A] dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Traffic Shield & Branding</span>
        </button>
      </div>

      {/* TAB 1: APP & GAME MANAGER */}
      {activeTab === 'apps' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => openEditorForApp(null)}
                className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Add New App / Game</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGithubGuide((v) => !v)}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>300MB+ GitHub Releases Guide</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadJsonFile('apps.json', apps)}
                className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export apps.json</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const ok = await copyTextToClipboard(JSON.stringify(apps, null, 2));
                  if (ok) notifyCopy('Copied JSON for /public/config/apps.json');
                }}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON for /public/config/apps.json</span>
              </button>

              <button
                type="button"
                onClick={onResetApps}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 hover:text-red-600 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Catalog</span>
              </button>
            </div>
          </div>

          {showGithubGuide && (
            <div className="p-5 rounded-xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-900/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Hosting Large 300MB+ APKs Free on GitHub Releases
              </div>
              <p>
                Cloudflare static assets cap individual files at 25 MiB, while GitHub Releases hosts single `.apk` assets up to <strong>2 GiB</strong> for free with global CDN delivery:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a public release tag in your GitHub repository (e.g. `v2.4.1`).</li>
                <li>Upload your 200MB–350MB `.apk` binary to the Release Assets section (or run <code className="font-mono">gh release create v2.4.1 app.apk</code>).</li>
                <li>Copy the direct download URL (<code className="font-mono">https://github.com/ORG/REPO/releases/download/v2.4.1/app.apk</code>) and paste it into the Direct APK URL field below.</li>
              </ol>
            </div>
          )}

          {/* App Editor Modal / Inline Form with Live Card Preview */}
          {editingApp && (
            <form
              onSubmit={handleSaveAppDraft}
              className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="font-display text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {apps.some((a) => a.id === editingApp.id)
                    ? `Editing: ${editingApp.title}`
                    : 'Create New App / Game'}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editingApp.title}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, title: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      required
                      value={editingApp.subtitle}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, subtitle: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Package Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingApp.packageName}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, packageName: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={editingApp.category}
                      onChange={(e) =>
                        setEditingApp({
                          ...editingApp,
                          category: e.target.value as AppCategory,
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                    >
                      {CATEGORIES_ONLY.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Version
                    </label>
                    <input
                      type="text"
                      required
                      value={editingApp.version}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, version: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      File Size (MB — supports 300+ MB)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={editingApp.sizeMB}
                      onChange={(e) =>
                        setEditingApp({
                          ...editingApp,
                          sizeMB: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Developer Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingApp.developer}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, developer: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Minimum Android OS
                    </label>
                    <input
                      type="text"
                      required
                      value={editingApp.minAndroid}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, minAndroid: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Direct APK Download URL (GitHub Releases / CDN / HTTPS `.apk`)
                    </label>
                    <input
                      type="url"
                      required
                      value={editingApp.apkUrl}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, apkUrl: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs"
                    />
                    {!isSafeUrl(editingApp.apkUrl) && (
                      <span className="text-xs text-red-600 mt-1 block">
                        URL must start with https:// or http://
                      </span>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Icon URL
                    </label>
                    <input
                      type="text"
                      required
                      value={editingApp.iconUrl}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, iconUrl: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Screenshot URLs (one per line)
                    </label>
                    <textarea
                      rows={2}
                      value={screenshotsText}
                      onChange={(e) => {
                        setScreenshotsText(e.target.value);
                        setEditingApp({
                          ...editingApp,
                          screenshots: e.target.value
                            .split(/[\n,]+/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        });
                      }}
                      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      SHA-256 Checksum
                    </label>
                    <input
                      type="text"
                      value={editingApp.sha256}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, sha256: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={editingApp.description}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, description: e.target.value })
                      }
                      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      What's New / Changelog
                    </label>
                    <textarea
                      rows={2}
                      value={editingApp.changelog}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, changelog: e.target.value })
                      }
                      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Initial Rating (1.0 - 5.0)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={editingApp.initialRating}
                      onChange={(e) =>
                        setEditingApp({
                          ...editingApp,
                          initialRating: parseFloat(e.target.value) || 4.5,
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Initial Vote Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingApp.initialVotes}
                      onChange={(e) =>
                        setEditingApp({
                          ...editingApp,
                          initialVotes: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingApp.active}
                        onChange={(e) =>
                          setEditingApp({ ...editingApp, active: e.target.checked })
                        }
                        className="rounded border-slate-300"
                      />
                      <span>Active (Visible on Storefront)</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingApp.featured}
                        onChange={(e) =>
                          setEditingApp({ ...editingApp, featured: e.target.checked })
                        }
                        className="rounded border-slate-300"
                      />
                      <span>Featured Hero Banner</span>
                    </label>
                  </div>
                </div>

                {/* Live Storefront Card Preview */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Live Card Preview
                  </div>
                  <AppCard
                    app={editingApp}
                    userRatings={userRatings}
                    localDownloads={localDownloads}
                    depth3D={depth3D}
                    onSelectApp={() => {}}
                  />
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingApp(null)}
                      className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-10 px-5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold cursor-pointer"
                    >
                      Save to Storefront
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Apps Table */}
          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">App / Package</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Version</th>
                  <th className="py-3 px-4 text-right">Size</th>
                  <th className="py-3 px-4 text-center">Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {apps.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveApp(idx, -1)}
                          aria-label="Move up"
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === apps.length - 1}
                          onClick={() => handleMoveApp(idx, 1)}
                          aria-label="Move down"
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {item.title}
                      </div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {item.packageName}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {item.version}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {item.sizeMB.toFixed(1)} MB
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(item.id)}
                          title="Toggle Featured Hero"
                          className={`p-1.5 rounded-md border text-xs cursor-pointer ${
                            item.featured
                              ? 'border-amber-300 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:border-amber-800'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${item.featured ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id)}
                          title={item.active ? 'Hide from storefront' : 'Show on storefront'}
                          className={`p-1.5 rounded-md border text-xs cursor-pointer ${
                            item.active
                              ? 'border-emerald-200 bg-emerald-50 text-[#059669] dark:bg-emerald-950/30 dark:border-emerald-800'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          {item.active ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditorForApp(item)}
                          className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium inline-flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteApp(item.id)}
                          aria-label={`Delete ${item.title}`}
                          className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ADSTERRA AD MANAGER */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleApplySafeHighRevenuePreset}
                className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Safe High-Revenue Preset</span>
              </button>

              <label className="h-9 px-3.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-xs font-semibold text-red-700 dark:text-red-400 inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adsConfig.disableAllAds}
                  onChange={(e) =>
                    onUpdateAds({ ...adsConfig, disableAllAds: e.target.checked })
                  }
                />
                <span>Disable All Ads (Emergency Switch)</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adsConfig.showPlaceholders}
                  onChange={(e) =>
                    onUpdateAds({ ...adsConfig, showPlaceholders: e.target.checked })
                  }
                />
                <span>Show Empty Slot Placeholders</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadJsonFile('ads.json', adsConfig)}
                className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ads.json</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyTextToClipboard(
                    JSON.stringify(adsConfig, null, 2)
                  );
                  if (ok) notifyCopy('Copied JSON for /public/config/ads.json');
                }}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON for /public/config/ads.json</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AD_SLOT_ORDER.map((key, index) => {
              const slot = adsConfig.slots[key];
              return (
                <div
                  key={key}
                  className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs text-slate-400">
                        Slot {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-display text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {slot.label}
                      </h3>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={(e) =>
                          onUpdateAds({
                            ...adsConfig,
                            slots: {
                              ...adsConfig.slots,
                              [key]: { ...slot, enabled: e.target.checked },
                            },
                          })
                        }
                      />
                      <span>{slot.enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    value={slot.script}
                    onChange={(e) =>
                      onUpdateAds({
                        ...adsConfig,
                        slots: {
                          ...adsConfig.slots,
                          [key]: { ...slot, script: e.target.value },
                        },
                      })
                    }
                    placeholder="Paste Adsterra <script> tag or atOptions snippet here..."
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs text-[#0F172A] dark:text-slate-200"
                  />
                </div>
              );
            })}

            {/* Slot 11: Direct / Smartlink URL + Label */}
            <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-slate-400">Slot 11</span>
                  <h3 className="font-display text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {adsConfig.slots.directSmartlink.label}
                  </h3>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adsConfig.slots.directSmartlink.enabled}
                    onChange={(e) =>
                      onUpdateAds({
                        ...adsConfig,
                        slots: {
                          ...adsConfig.slots,
                          directSmartlink: {
                            ...adsConfig.slots.directSmartlink,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  <span>
                    {adsConfig.slots.directSmartlink.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Direct / Smartlink HTTPS URL
                  </label>
                  <input
                    type="url"
                    value={adsConfig.slots.directSmartlink.url}
                    onChange={(e) =>
                      onUpdateAds({
                        ...adsConfig,
                        slots: {
                          ...adsConfig.slots,
                          directSmartlink: {
                            ...adsConfig.slots.directSmartlink,
                            url: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Button Label (Step 3 Mirror Page)
                  </label>
                  <input
                    type="text"
                    value={adsConfig.slots.directSmartlink.buttonLabel}
                    onChange={(e) =>
                      onUpdateAds({
                        ...adsConfig,
                        slots: {
                          ...adsConfig.slots,
                          directSmartlink: {
                            ...adsConfig.slots.directSmartlink,
                            buttonLabel: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRAFFIC, QUEUE & BOT/IP SHIELD SETTINGS */}
      {activeTab === 'shield' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Funnel, Queue & Bot Shield */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
              <h2 className="font-display text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Traffic Surge Queue & Download Funnel Controls
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Step 2 Verification Countdown (seconds)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={45}
                    value={storefrontConfig.shield.step2CountdownSeconds}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          step2CountdownSeconds: Math.max(
                            1,
                            Math.min(45, parseInt(e.target.value, 10) || 8)
                          ),
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    High-Traffic Queue Mode
                  </label>
                  <select
                    value={storefrontConfig.shield.queueMode}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          queueMode: e.target.value as QueueMode,
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                  >
                    <option value="auto">Auto (Trigger above threshold)</option>
                    <option value="force_active">Force Active (Always queue)</option>
                    <option value="off">Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Concurrent Threshold (Users)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    value={storefrontConfig.shield.maxConcurrentThreshold}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          maxConcurrentThreshold: Math.max(
                            50,
                            parseInt(e.target.value, 10) || 2000
                          ),
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Queue Wait Timer (seconds)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={60}
                    value={storefrontConfig.shield.queueWaitSeconds}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          queueWaitSeconds: Math.max(
                            3,
                            parseInt(e.target.value, 10) || 6
                          ),
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Simulated Concurrent Load (for testing Auto Queue)
                  </span>
                  <span className="font-mono font-semibold text-[#2563EB] dark:text-blue-400 tabular-nums">
                    {storefrontConfig.shield.simulatedConcurrentUsers.toLocaleString()} users
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3500}
                  step={50}
                  value={storefrontConfig.shield.simulatedConcurrentUsers}
                  onChange={(e) =>
                    onUpdateStorefront({
                      ...storefrontConfig,
                      shield: {
                        ...storefrontConfig.shield,
                        simulatedConcurrentUsers: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full accent-[#2563EB]"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
              <h2 className="font-display text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Bot Filter, Rate Limit & IP / Country Blocklist
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Bot & Scraper Strictness
                  </label>
                  <select
                    value={storefrontConfig.shield.botStrictness}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          botStrictness: e.target.value as BotStrictness,
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                  >
                    <option value="standard">Standard (WebDriver + Headless)</option>
                    <option value="strict">Strict (Includes timing & plugins)</option>
                    <option value="off">Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Max Downloads per Device (10 min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={storefrontConfig.shield.rateLimitMaxPer10Min}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          rateLimitMaxPer10Min: Math.max(
                            0,
                            parseInt(e.target.value, 10) || 0
                          ),
                        },
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-sm"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storefrontConfig.shield.enableGeoIpLookup}
                  onChange={(e) =>
                    onUpdateStorefront({
                      ...storefrontConfig,
                      shield: {
                        ...storefrontConfig.shield,
                        enableGeoIpLookup: e.target.checked,
                      },
                    })
                  }
                />
                <span>
                  Enable lightweight IP/Country check on download (strict 1.8s fail-open fallback)
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Blocked IPs & CIDRs (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={storefrontConfig.shield.blockedIpsAndCidrs.join('\n')}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          blockedIpsAndCidrs: e.target.value
                            .split(/[\n,]+/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="203.0.113.5&#10;198.51.100.0/24"
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Blocked Country Codes (ISO-2, comma/line)
                  </label>
                  <textarea
                    rows={3}
                    value={storefrontConfig.shield.blockedCountries.join(', ')}
                    onChange={(e) =>
                      onUpdateStorefront({
                        ...storefrontConfig,
                        shield: {
                          ...storefrontConfig.shield,
                          blockedCountries: e.target.value
                            .split(/[\n,]+/)
                            .map((s) => s.trim().toUpperCase())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="XX, YY"
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Storefront Branding + Admin Password */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Storefront Branding
                </h2>
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                  <BrandLogo accent={storefrontConfig.logoAccent} size={26} />
                  <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-[140px]">
                    {storefrontConfig.storeTitle || 'Premium APK World'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Storefront Title
                </label>
                <input
                  type="text"
                  value={storefrontConfig.storeTitle}
                  onChange={(e) =>
                    onUpdateStorefront({
                      ...storefrontConfig,
                      storeTitle: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Storefront Subtitle / Tagline
                </label>
                <textarea
                  rows={2}
                  value={storefrontConfig.storeTagline}
                  onChange={(e) =>
                    onUpdateStorefront({
                      ...storefrontConfig,
                      storeTagline: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Brand Logo Accent
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'emerald-blue', label: 'Emerald & Blue' },
                      { id: 'emerald-gold', label: 'Emerald & Gold' },
                      { id: 'cobalt-cyan', label: 'Cobalt & Cyan' },
                    ] as ReadonlyArray<{ id: LogoAccent; label: string }>
                  ).map((opt) => {
                    const active = storefrontConfig.logoAccent === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateStorefront({
                            ...storefrontConfig,
                            logoAccent: opt.id,
                          })
                        }
                        className={`p-2 rounded-lg border text-left flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
                          active
                            ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#0F172A] dark:text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <BrandLogo accent={opt.id} size={28} />
                        <span className="text-[11px] font-medium text-center leading-tight">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleChangePassword}
              className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] inline-flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#2563EB]" />
                  <span>Admin Password</span>
                </h2>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-medium text-slate-500 hover:text-[#2563EB] cursor-pointer"
                >
                  Reset to Default
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                />
                <input
                  type="password"
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                />
                <input
                  type="password"
                  required
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm"
                />
              </div>

              {pwMessage && (
                <p
                  className={`text-xs ${
                    pwMessage.type === 'ok'
                      ? 'text-[#059669]'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {pwMessage.text}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Update Password (SHA-256)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
