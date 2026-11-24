import React, { useEffect, useRef } from 'react';
import { Box, Layers, Moon, Search, Sun, X } from 'lucide-react';
import { APP_CATEGORIES, AppCategory, LogoAccent } from '@/src/types/store';
import { BrandLogo } from '@/src/components/BrandLogo';

interface HeaderProps {
  storeTitle: string;
  logoAccent: LogoAccent;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  mobileSearchOpen: boolean;
  onToggleMobileSearch: () => void;
  onCloseMobileSearch: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  depth3D: boolean;
  onToggleDepth3D: () => void;
  motion3D: boolean;
  onToggleMotion3D: () => void;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onSelectQuickCategory: (category: 'All' | AppCategory) => void;
  activeView: 'home' | 'catalog' | 'funnel' | 'admin';
}

export const Header: React.FC<HeaderProps> = ({
  storeTitle,
  logoAccent,
  searchQuery,
  onSearchChange,
  mobileSearchOpen,
  onToggleMobileSearch,
  onCloseMobileSearch,
  isDark,
  onToggleTheme,
  depth3D,
  onToggleDepth3D,
  motion3D,
  onToggleMotion3D,
  onNavigateHome,
  onNavigateCatalog,
  onSelectQuickCategory,
  activeView,
}) => {
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      const timer = window.setTimeout(() => mobileInputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
  }, [mobileSearchOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
        {/* Zone 1: Custom SVG BrandLogo + Wordmark */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left min-w-0 shrink-0 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg pr-1 py-0.5"
        >
          <BrandLogo accent={logoAccent} size={36} className="transition-transform group-hover:scale-105" />
          <div className="min-w-0">
            <span className="font-display text-sm sm:text-base lg:text-lg font-bold tracking-tight text-[#0B1120] dark:text-[#F8FAFC] whitespace-nowrap truncate block max-w-[145px] sm:max-w-none">
              {storeTitle}
            </span>
          </div>
        </button>

        {/* Zone 2 (Desktop): Single-line Nav Links + Search Input */}
        {activeView !== 'admin' ? (
          <div className="hidden md:flex flex-1 max-w-2xl items-center gap-4 min-w-0">
            <nav className="hidden lg:flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-300 shrink-0">
              <button
                type="button"
                onClick={onNavigateHome}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'home'
                    ? 'text-[#0B1120] dark:text-white font-semibold underline decoration-[#059669] decoration-2 underline-offset-8'
                    : 'hover:text-[#0B1120] dark:hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={onNavigateCatalog}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'catalog'
                    ? 'text-[#0B1120] dark:text-white font-semibold underline decoration-[#059669] decoration-2 underline-offset-8'
                    : 'hover:text-[#0B1120] dark:hover:text-white'
                }`}
              >
                All APKs
              </button>
              <button
                type="button"
                onClick={() => onSelectQuickCategory('Action Games')}
                className="hover:text-[#0B1120] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Games
              </button>
              <button
                type="button"
                onClick={() => onSelectQuickCategory('Tools & Utilities')}
                className="hover:text-[#0B1120] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Apps
              </button>
            </nav>

            <div className="relative flex-1 min-w-0">
              <Search
                className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search games, apps, or package IDs..."
                aria-label="Search Premium APK World catalog"
                className="w-full h-10 pl-9 pr-8 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F6F7F9] dark:bg-[#070B14] text-[#0B1120] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Storefront Administration Console
            </span>
          </div>
        )}

        {/* Zone 3: Mobile Search + 3D Motion Toggle + 3D Mode + Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {activeView !== 'admin' && (
            <button
              type="button"
              onClick={onToggleMobileSearch}
              aria-label="Toggle search"
              aria-expanded={mobileSearchOpen}
              className={`md:hidden w-11 h-11 rounded-xl inline-flex items-center justify-center border transition-colors cursor-pointer ${
                mobileSearchOpen
                  ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          )}

          {activeView !== 'admin' && (
            <button
              type="button"
              onClick={onToggleMotion3D}
              aria-pressed={motion3D}
              title={motion3D ? 'Pause 3D background motion' : 'Enable 3D background motion'}
              className={`min-w-[44px] h-11 sm:h-10 px-2.5 sm:px-3 rounded-xl sm:rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                motion3D
                  ? 'border-[#059669]/40 bg-[#059669]/10 text-[#059669] dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Box className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
              <span className="hidden xl:inline">3D Motion: {motion3D ? 'On' : 'Off'}</span>
              <span className="hidden sm:inline xl:hidden">Motion</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleDepth3D}
            aria-pressed={depth3D}
            title={depth3D ? 'Disable 3D card depth' : 'Enable 3D card depth'}
            className={`hidden md:inline-flex h-10 px-3 rounded-lg text-xs font-medium items-center justify-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
              depth3D
                ? 'border-[#2563EB]/40 bg-[#2563EB]/10 text-[#2563EB] dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden xl:inline">3D Cards</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to Daylight mode' : 'Switch to Dark Studio mode'}
            title={isDark ? 'Daylight mode' : 'Dark Studio mode'}
            className="min-w-[44px] h-11 sm:h-10 px-2.5 sm:px-3 rounded-xl sm:rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070B14] text-[#0B1120] dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400" aria-hidden="true" />
                <span className="hidden sm:inline">Daylight</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-600" aria-hidden="true" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search & Quick-Category Drawer */}
      {mobileSearchOpen && activeView !== 'admin' && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] px-4 py-3 space-y-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={mobileInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search games, apps, or package IDs..."
              aria-label="Mobile search"
              className="w-full h-11 pl-10 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F6F7F9] dark:bg-[#070B14] text-[#0B1120] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {APP_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onSelectQuickCategory(cat);
                  onCloseMobileSearch();
                }}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F6F7F9] dark:bg-[#0F172A] text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
