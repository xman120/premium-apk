import React from 'react';
import { ArrowRight, Flame, ShieldCheck } from 'lucide-react';
import { AppItem, UserRatingMap } from '@/src/types/store';
import { getCombinedAppRating } from '@/src/utils/storage';
import { AppImage } from '@/src/components/AppImage';
import { StarRating } from '@/src/components/StarRating';

interface HotReleasesStripProps {
  apps: AppItem[];
  userRatings: UserRatingMap;
  onSelectApp: (app: AppItem) => void;
  onViewAll?: () => void;
}

export const HotReleasesStrip: React.FC<HotReleasesStripProps> = ({
  apps,
  userRatings,
  onSelectApp,
  onViewAll,
}) => {
  if (apps.length === 0) return null;

  return (
    <section
      aria-label="Featured and hot APK releases"
      className="rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#059669]/10 text-[#059669] flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1120] dark:text-[#F8FAFC] truncate">
              Featured &amp; Hot Releases
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Verified high-speed APK builds ready for direct mirror download
            </p>
          </div>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>See all</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex lg:grid lg:grid-cols-4 gap-3.5 overflow-x-auto lg:overflow-visible snap-x snap-mandatory no-scrollbar pb-1 lg:pb-0">
        {apps.slice(0, 4).map((app) => {
          const { average, totalVotes } = getCombinedAppRating(app, userRatings);
          return (
            <div
              key={app.id}
              className="snap-start shrink-0 w-[264px] sm:w-[276px] lg:w-auto rounded-xl border border-slate-200/90 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1120] p-3.5 flex flex-col justify-between gap-3 hover:border-[#059669]/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onSelectApp(app)}
                  className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <AppImage
                    src={app.iconUrl}
                    alt={`${app.title} icon`}
                    fallbackTitle={app.title}
                    variant="icon"
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {app.featured && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#059669]">
                        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                        Hot
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {app.version}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectApp(app)}
                    className="text-left w-full cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    <h3 className="font-display text-sm font-bold text-[#0B1120] dark:text-[#F8FAFC] truncate hover:text-[#059669] transition-colors">
                      {app.title}
                    </h3>
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {app.category}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                <div className="min-w-0 space-y-0.5">
                  <StarRating average={average} totalVotes={totalVotes} userVote={null} />
                  <div className="font-mono text-[11px] font-semibold text-[#0B1120] dark:text-slate-200 tabular-nums">
                    {app.sizeMB.toFixed(1)} MB
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectApp(app)}
                  className="h-9 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
                >
                  Get APK
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
