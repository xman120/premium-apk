import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  HardDrive,
  LayoutGrid,
  List,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  AdsConfig,
  APP_CATEGORIES,
  AppCategory,
  AppItem,
  SortOption,
  StorefrontConfig,
  UserRatingMap,
} from '@/src/types/store';
import {
  clearAppsOverride,
  DEFAULT_ADS_CONFIG,
  getCombinedAppRating,
  incrementLocalDownloadCount,
  loadDepth3DPreference,
  loadInitialAds,
  loadInitialApps,
  loadLocalDownloadDeltas,
  loadMotion3DPreference,
  loadStorefrontConfig,
  loadThemePreference,
  loadUserRatings,
  saveAdsOverride,
  saveAppsOverride,
  saveDepth3DPreference,
  saveMotion3DPreference,
  saveStorefrontConfig,
  saveThemePreference,
  saveUserRating,
} from '@/src/utils/storage';
import { registerTabPresence } from '@/src/utils/trafficShield';
import { Header } from '@/src/components/Header';
import { Background3DScene } from '@/src/components/Background3DScene';
import { BrandLogo } from '@/src/components/BrandLogo';
import { Home3DStage } from '@/src/components/Home3DStage';
import { HotReleasesStrip } from '@/src/components/HotReleasesStrip';
import { HeroBanner } from '@/src/components/HeroBanner';
import { AppCard } from '@/src/components/AppCard';
import { AdSlot } from '@/src/components/AdSlot';
import { GlobalAdScripts } from '@/src/components/GlobalAdScripts';
import { DownloadFunnel } from '@/src/components/DownloadFunnel';
import { AdminPanel } from '@/src/components/AdminPanel';
import { MobileTabBar } from '@/src/components/MobileTabBar';

function checkIsAdminRoute(): boolean {
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  return hash === '#iamadmin' || hash.startsWith('#iamadmin/') || path === '/iamadmin';
}

export default function App() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [bundledApps, setBundledApps] = useState<AppItem[]>([]);
  const [adsConfig, setAdsConfig] = useState<AdsConfig>(DEFAULT_ADS_CONFIG);
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig>(() =>
    loadStorefrontConfig()
  );
  const [userRatings, setUserRatings] = useState<UserRatingMap>(() => loadUserRatings());
  const [localDownloads, setLocalDownloads] = useState<Record<string, number>>(() =>
    loadLocalDownloadDeltas()
  );
  const [loading, setLoading] = useState(true);

  const [isDark, setIsDark] = useState<boolean>(() => loadThemePreference());
  const [depth3D, setDepth3D] = useState<boolean>(() => loadDepth3DPreference());
  const [motion3D, setMotion3D] = useState<boolean>(() => loadMotion3DPreference());
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminRoute());
  const [pageMode, setPageMode] = useState<'home' | 'catalog'>('home');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<'All' | AppCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('trending');
  const [catalogLayout, setCatalogLayout] = useState<'grid' | 'row'>('grid');

  // Hydrate catalog and ad configs from /public/config/*.json + localStorage overrides
  useEffect(() => {
    let active = true;
    Promise.all([loadInitialApps(), loadInitialAds()]).then(
      ([{ apps: loadedApps, bundled }, { ads }]) => {
        if (!active) return;
        setApps(loadedApps);
        setBundledApps(bundled);
        setAdsConfig(ads);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  // Sync Tailwind .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemePreference(isDark);
  }, [isDark]);

  // Persist 3D Card Depth and 3D Background Motion toggles
  useEffect(() => {
    saveDepth3DPreference(depth3D);
  }, [depth3D]);

  useEffect(() => {
    saveMotion3DPreference(motion3D);
  }, [motion3D]);

  // Register lightweight tab presence for Traffic Shield
  useEffect(() => {
    return registerTabPresence();
  }, []);

  // Listen for #iamadmin hash/history changes
  useEffect(() => {
    const syncRoute = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  const visibleApps = useMemo(() => apps.filter((a) => a.active), [apps]);

  const featuredApp = useMemo(() => {
    return visibleApps.find((a) => a.featured) || visibleApps[0] || null;
  }, [visibleApps]);

  const hotReleases = useMemo(() => {
    return [...visibleApps].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const da = a.downloads + (localDownloads[a.id] ?? 0);
      const db = b.downloads + (localDownloads[b.id] ?? 0);
      return db - da;
    });
  }, [visibleApps, localDownloads]);

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = visibleApps.filter((app) => {
      if (selectedCategory !== 'All' && app.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      return (
        app.title.toLowerCase().includes(query) ||
        app.subtitle.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.developer.toLowerCase().includes(query)
      );
    });

    return [...list].sort((a, b) => {
      if (sortOption === 'highest_rated') {
        const ra = getCombinedAppRating(a, userRatings).average;
        const rb = getCombinedAppRating(b, userRatings).average;
        return rb - ra;
      }
      if (sortOption === 'newest') {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      if (sortOption === 'smallest_size') {
        return a.sizeMB - b.sizeMB;
      }
      const da = a.downloads + (localDownloads[a.id] ?? 0);
      const db = b.downloads + (localDownloads[b.id] ?? 0);
      return db - da;
    });
  }, [visibleApps, selectedCategory, searchQuery, sortOption, userRatings, localDownloads]);

  const selectedApp = useMemo(
    () => apps.find((a) => a.id === selectedAppId) || null,
    [apps, selectedAppId]
  );

  const handleSelectApp = (app: AppItem) => {
    setSelectedAppId(app.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    if (isAdminRoute) {
      window.location.hash = '';
      if (window.location.pathname.toLowerCase() === '/iamadmin') {
        window.history.pushState({}, '', '/');
      }
      setIsAdminRoute(false);
    }
    setSelectedAppId(null);
    setSearchQuery('');
    setSelectedCategory('All');
    setPageMode('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateCatalog = () => {
    if (isAdminRoute) {
      window.location.hash = '';
      setIsAdminRoute(false);
    }
    setSelectedAppId(null);
    setPageMode('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdmin = () => {
    window.location.hash = 'iamadmin';
    setIsAdminRoute(true);
    setSelectedAppId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRateApp = (appId: string, stars: number) => {
    const next = saveUserRating(appId, stars);
    setUserRatings(next);
  };

  const handleDownloadTriggered = (appId: string) => {
    const next = incrementLocalDownloadCount(appId);
    setLocalDownloads(next);
  };

  const handleUpdateApps = (nextApps: AppItem[]) => {
    setApps(nextApps);
    saveAppsOverride(nextApps);
  };

  const handleResetApps = () => {
    clearAppsOverride();
    if (bundledApps.length > 0) {
      setApps(bundledApps);
    }
  };

  const handleUpdateAds = (nextAds: AdsConfig) => {
    setAdsConfig(nextAds);
    saveAdsOverride(nextAds);
  };

  const handleUpdateStorefront = (nextConfig: StorefrontConfig) => {
    setStorefrontConfig(nextConfig);
    saveStorefrontConfig(nextConfig);
  };

  const activeView: 'home' | 'catalog' | 'funnel' | 'admin' = isAdminRoute
    ? 'admin'
    : selectedApp
    ? 'funnel'
    : searchQuery.trim() || selectedCategory !== 'All' || pageMode === 'catalog'
    ? 'catalog'
    : 'home';

  const hasStickyFooter =
    !isAdminRoute &&
    !adsConfig.disableAllAds &&
    adsConfig.slots.stickyFooterBanner.enabled &&
    (adsConfig.slots.stickyFooterBanner.script.trim().length > 0 ||
      adsConfig.showPlaceholders);

  const renderCatalogToolbar = (showSearchInput: boolean) => (
    <div className="rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 space-y-3 shadow-sm">
      {showSearchInput && (
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) setPageMode('catalog');
            }}
            placeholder="Instant search by game name, package ID (e.g. com.studio.game), or category..."
            aria-label="Instant search catalog"
            className="w-full h-11 pl-10 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F6F7F9] dark:bg-[#070B14] text-[#0B1120] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 lg:pb-0">
          {APP_CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  if (category !== 'All') setPageMode('catalog');
                }}
                className={`h-10 sm:h-9 px-3.5 rounded-xl sm:rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  active
                    ? 'bg-[#059669] text-white font-semibold'
                    : 'bg-[#F6F7F9] dark:bg-[#070B14] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#059669]/60'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
            {filteredApps.length} {filteredApps.length === 1 ? 'APK' : 'APKs'}
          </span>

          <div className="inline-flex items-center gap-1.5">
            <ArrowUpDown
              className="w-3.5 h-3.5 text-slate-400 shrink-0"
              aria-hidden="true"
            />
            <select
              aria-label="Sort apps"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-9 pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F6F7F9] dark:bg-[#070B14] text-xs font-medium text-[#0B1120] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] cursor-pointer"
            >
              <option value="trending">Sort: Trending</option>
              <option value="highest_rated">Sort: Top Rated</option>
              <option value="newest">Sort: Newest</option>
              <option value="smallest_size">Sort: Size</option>
            </select>
          </div>

          <div
            role="group"
            aria-label="Catalog layout view"
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F6F7F9] dark:bg-[#070B14] p-0.5"
          >
            <button
              type="button"
              onClick={() => setCatalogLayout('grid')}
              aria-label="Grid view"
              aria-pressed={catalogLayout === 'grid'}
              className={`h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer ${
                catalogLayout === 'grid'
                  ? 'bg-white dark:bg-[#0F172A] text-[#059669] shadow-xs'
                  : 'text-slate-500 hover:text-[#0B1120] dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCatalogLayout('row')}
              aria-label="List view"
              aria-pressed={catalogLayout === 'row'}
              className={`h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer ${
                catalogLayout === 'row'
                  ? 'bg-white dark:bg-[#0F172A] text-[#059669] shadow-xs'
                  : 'text-slate-500 hover:text-[#0B1120] dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F6F7F9] dark:bg-[#070B14] text-[#0B1120] dark:text-[#F8FAFC] transition-colors">
      {/* Subtle hardware-accelerated 3D ambient backdrop (suppressed inside #iamadmin) */}
      <Background3DScene
        isDark={isDark}
        motionEnabled={motion3D}
        isAdminActive={isAdminRoute}
      />

      <div
        className={`relative z-10 flex-1 flex flex-col ${
          activeView !== 'admin'
            ? hasStickyFooter
              ? 'pb-28 lg:pb-16'
              : 'pb-16 lg:pb-0'
            : ''
        }`}
      >
        <Header
          storeTitle={storefrontConfig.storeTitle}
          logoAccent={storefrontConfig.logoAccent}
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            if (selectedAppId) setSelectedAppId(null);
            if (val.trim()) setPageMode('catalog');
          }}
          mobileSearchOpen={mobileSearchOpen}
          onToggleMobileSearch={() => setMobileSearchOpen((v) => !v)}
          onCloseMobileSearch={() => setMobileSearchOpen(false)}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
          depth3D={depth3D}
          onToggleDepth3D={() => setDepth3D((d) => !d)}
          motion3D={motion3D}
          onToggleMotion3D={() => setMotion3D((m) => !m)}
          onNavigateHome={() => {
            setMobileSearchOpen(false);
            handleNavigateHome();
          }}
          onNavigateCatalog={() => {
            setMobileSearchOpen(false);
            handleNavigateCatalog();
          }}
          onSelectQuickCategory={(cat) => {
            setSelectedCategory(cat);
            setSelectedAppId(null);
            setPageMode('catalog');
            setMobileSearchOpen(false);
            if (isAdminRoute) {
              window.location.hash = '';
              setIsAdminRoute(false);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          activeView={activeView}
        />

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-7">
          {activeView === 'admin' ? (
            <AdminPanel
              apps={apps}
              adsConfig={adsConfig}
              storefrontConfig={storefrontConfig}
              userRatings={userRatings}
              localDownloads={localDownloads}
              depth3D={depth3D}
              onUpdateApps={handleUpdateApps}
              onResetApps={handleResetApps}
              onUpdateAds={handleUpdateAds}
              onUpdateStorefront={handleUpdateStorefront}
              onExitAdmin={handleNavigateHome}
            />
          ) : activeView === 'funnel' && selectedApp ? (
            <DownloadFunnel
              app={selectedApp}
              adsConfig={adsConfig}
              shieldSettings={storefrontConfig.shield}
              userRatings={userRatings}
              localDownloads={localDownloads}
              isAdminActive={isAdminRoute}
              onRateApp={handleRateApp}
              onDownloadTriggered={handleDownloadTriggered}
              onBack={() => setSelectedAppId(null)}
            />
          ) : activeView === 'home' ? (
            <div className="space-y-8">
              {/* Top Leaderboard Ad Slot */}
              <AdSlot
                slotKey="topLeaderboard"
                adsConfig={adsConfig}
                isAdminActive={isAdminRoute}
                variant="leaderboard"
              />

              {/* APKPure-Inspired Compact Search & Category Bar */}
              {renderCatalogToolbar(true)}

              {/* Featured & Hot Releases Strip */}
              {!loading && (
                <HotReleasesStrip
                  apps={hotReleases}
                  userRatings={userRatings}
                  onSelectApp={handleSelectApp}
                  onViewAll={handleNavigateCatalog}
                />
              )}

              {/* Interactive 3D Hero Stage */}
              <Home3DStage
                storeTitle={storefrontConfig.storeTitle}
                storeTagline={storefrontConfig.storeTagline}
                totalAppsCount={visibleApps.length}
                isDark={isDark}
                onExploreCatalog={handleNavigateCatalog}
                onQuickFeatured={() => {
                  if (featuredApp) handleSelectApp(featuredApp);
                  else handleNavigateCatalog();
                }}
              />

              {/* Featured Release Spotlight */}
              {!loading && featuredApp && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1120] dark:text-[#F8FAFC]">
                      Curated Spotlight
                    </h2>
                    <button
                      type="button"
                      onClick={handleNavigateCatalog}
                      className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Browse All APKs</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <HeroBanner
                    featuredApp={featuredApp}
                    userRatings={userRatings}
                    localDownloads={localDownloads}
                    depth3D={depth3D}
                    onSelectApp={handleSelectApp}
                  />
                </div>
              )}

              {/* All Verified Releases Grid / List */}
              <section aria-label="Popular Android games and apps" className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1120] dark:text-[#F8FAFC]">
                      Popular Android APKs
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Direct verified packages with instant mirror selection and zero login required
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleNavigateCatalog}
                    className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0F172A]/95 text-xs font-semibold text-[#0B1120] dark:text-[#F8FAFC] hover:border-[#059669] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Full Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-48 rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200 dark:border-slate-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className={
                      catalogLayout === 'row'
                        ? 'flex flex-col gap-3.5'
                        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                    }
                  >
                    {filteredApps.map((item) => (
                      <AppCard
                        key={item.id}
                        app={item}
                        userRatings={userRatings}
                        localDownloads={localDownloads}
                        depth3D={depth3D}
                        layout={catalogLayout}
                        onSelectApp={handleSelectApp}
                      />
                    ))}
                  </div>
                )}

                {/* In-Feed Native Ad Placement */}
                <AdSlot
                  slotKey="inFeedNative"
                  adsConfig={adsConfig}
                  isAdminActive={isAdminRoute}
                  variant="native"
                />
              </section>

              {/* Editorial Craftsmanship & Verification Standards */}
              <section
                aria-label="Platform verification standards"
                className="grid grid-cols-1 md:grid-cols-3 gap-5 py-1"
              >
                <div className="rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 p-6 space-y-2">
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0B1120] dark:text-[#F8FAFC]">
                    <ShieldCheck className="w-4 h-4 text-[#059669]" aria-hidden="true" />
                    <span>01. Cryptographic Integrity</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Every APK build passes signature inspection and exposes its full SHA-256 checksum prior to mirror handoff.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 p-6 space-y-2">
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0B1120] dark:text-[#F8FAFC]">
                    <HardDrive className="w-4 h-4 text-[#D97706]" aria-hidden="true" />
                    <span>02. Unthrottled 300MB+ Mirrors</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Direct CDN and GitHub Releases distribution supports full-size Android games without account gates or speed caps.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 p-6 space-y-2">
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0B1120] dark:text-[#F8FAFC]">
                    <Shield className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                    <span>03. Traffic Surge Protection</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Built-in priority queue mode and automated scraper filtering keep download mirrors responsive under peak demand.
                  </p>
                </div>
              </section>
            </div>
          ) : (
            /* FULL CATALOG VIEW */
            <div className="space-y-7">
              <AdSlot
                slotKey="topLeaderboard"
                adsConfig={adsConfig}
                isAdminActive={isAdminRoute}
                variant="leaderboard"
              />

              {renderCatalogToolbar(true)}

              {!loading && !searchQuery.trim() && selectedCategory === 'All' && (
                <HotReleasesStrip
                  apps={hotReleases}
                  userRatings={userRatings}
                  onSelectApp={handleSelectApp}
                />
              )}

              <section aria-label="Catalog results" className="space-y-5">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-48 rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200 dark:border-slate-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                    <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto" />
                    <h2 className="font-display text-lg font-semibold text-[#0B1120] dark:text-[#F8FAFC]">
                      No matching APKs found
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Try clearing your search query or switching back to All categories.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="h-9 px-4 rounded-lg bg-[#2563EB] text-white text-xs font-semibold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      catalogLayout === 'row'
                        ? 'flex flex-col gap-3.5'
                        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                    }
                  >
                    {filteredApps.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        <AppCard
                          app={item}
                          userRatings={userRatings}
                          localDownloads={localDownloads}
                          depth3D={depth3D}
                          layout={catalogLayout}
                          onSelectApp={handleSelectApp}
                        />
                        {idx === Math.min(2, filteredApps.length - 1) && (
                          <div className={catalogLayout === 'row' ? 'w-full' : 'md:col-span-2 lg:col-span-3'}>
                            <AdSlot
                              slotKey="inFeedNative"
                              adsConfig={adsConfig}
                              isAdminActive={isAdminRoute}
                              variant="native"
                            />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>

        {/* Clean Branded Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B1120]/95 mt-auto">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <BrandLogo accent={storefrontConfig.logoAccent} size={28} />
              <div>
                <strong className="font-semibold text-[#0B1120] dark:text-[#F8FAFC]">
                  {storefrontConfig.storeTitle}
                </strong>{' '}
                <span className="hidden sm:inline">—</span>{' '}
                <span className="block sm:inline">{storefrontConfig.storeTagline}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={handleNavigateHome}
                className="hover:text-[#0B1120] dark:hover:text-white transition-colors cursor-pointer"
              >
                Home
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleNavigateCatalog}
                className="hover:text-[#0B1120] dark:hover:text-white transition-colors cursor-pointer"
              >
                All APKs
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleOpenAdmin}
                className="hover:text-[#0B1120] dark:hover:text-white transition-colors cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>
        </footer>

        {/* Native Mobile Thumb-Zone Bottom Navigation */}
        <MobileTabBar
          activeView={activeView}
          searchOpen={mobileSearchOpen}
          onSelectHome={() => {
            setMobileSearchOpen(false);
            handleNavigateHome();
          }}
          onSelectCatalog={() => {
            setMobileSearchOpen(false);
            handleNavigateCatalog();
          }}
          onToggleSearch={() => {
            setMobileSearchOpen((v) => !v);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSelectFeatured={() => {
            setMobileSearchOpen(false);
            if (featuredApp) {
              handleSelectApp(featuredApp);
            } else {
              handleNavigateCatalog();
            }
          }}
        />
      </div>

      {/* Global Adsterra Scripts (strictly suppressed when #iamadmin is active) */}
      <GlobalAdScripts adsConfig={adsConfig} isAdminActive={isAdminRoute} />
    </div>
  );
}
