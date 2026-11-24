import React from 'react';
import { Award, Home, LayoutGrid, Search } from 'lucide-react';

interface MobileTabBarProps {
  activeView: 'home' | 'catalog' | 'funnel' | 'admin';
  searchOpen: boolean;
  onSelectHome: () => void;
  onSelectCatalog: () => void;
  onToggleSearch: () => void;
  onSelectFeatured: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeView,
  searchOpen,
  onSelectHome,
  onSelectCatalog,
  onToggleSearch,
  onSelectFeatured,
}) => {
  if (activeView === 'admin') {
    return null;
  }

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 border-t border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md"
    >
      <div className="grid grid-cols-4 h-full max-w-lg mx-auto">
        <button
          type="button"
          onClick={onSelectHome}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors cursor-pointer ${
            activeView === 'home' && !searchOpen
              ? 'text-[#059669]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Home</span>
        </button>

        <button
          type="button"
          onClick={onSelectCatalog}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors cursor-pointer ${
            activeView === 'catalog' && !searchOpen
              ? 'text-[#059669]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutGrid className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Catalog</span>
        </button>

        <button
          type="button"
          onClick={onToggleSearch}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors cursor-pointer ${
            searchOpen
              ? 'text-[#2563EB] dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Search className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Search</span>
        </button>

        <button
          type="button"
          onClick={onSelectFeatured}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors cursor-pointer ${
            activeView === 'funnel' && !searchOpen
              ? 'text-[#D97706] dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Award className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Featured</span>
        </button>
      </div>
    </nav>
  );
};
