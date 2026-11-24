import React from 'react';
import { ArrowDownToLine, ChevronRight } from 'lucide-react';
import { AppItem, UserRatingMap } from '@/src/types/store';
import { formatDownloadCount } from '@/src/utils/security';
import { getCombinedAppRating } from '@/src/utils/storage';
import { AppImage } from '@/src/components/AppImage';
import { StarRating } from '@/src/components/StarRating';
import { Tilt3DCard } from '@/src/components/Tilt3DCard';

interface AppCardProps {
  app: AppItem;
  userRatings: UserRatingMap;
  localDownloads: Record<string, number>;
  depth3D: boolean;
  layout?: 'grid' | 'row';
  onSelectApp: (app: AppItem) => void;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  userRatings,
  localDownloads,
  depth3D,
  layout = 'grid',
  onSelectApp,
}) => {
  const { average, totalVotes } = getCombinedAppRating(app, userRatings);
  const totalDownloads = app.downloads + (localDownloads[app.id] ?? 0);

  if (layout === 'row') {
    return (
      <Tilt3DCard enabled={depth3D} className="rounded-2xl">
        <article
          className={`group rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
            depth3D ? 'depth-3d-card' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onSelectApp(app)}
              className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200/90 dark:border-slate-700/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] shadow-sm"
            >
              <AppImage
                src={app.iconUrl}
                alt={`${app.title} icon`}
                fallbackTitle={app.title}
                variant="icon"
                className="w-full h-full object-cover"
              />
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <button
                  type="button"
                  onClick={() => onSelectApp(app)}
                  className="text-left cursor-pointer focus-visible:outline-none focus-visible:underline min-w-0"
                >
                  <h3 className="font-display text-base font-bold text-[#0B1120] dark:text-[#F8FAFC] leading-snug truncate group-hover:text-[#059669] dark:group-hover:text-emerald-400 transition-colors">
                    {app.title}
                  </h3>
                </button>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {app.category}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">{app.developer}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] truncate">{app.packageName}</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
                {app.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="flex sm:flex-col sm:items-end gap-3 sm:gap-1">
              <StarRating average={average} totalVotes={totalVotes} userVote={null} />
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                <span>{app.version}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#0B1120] dark:text-slate-200">
                  {app.sizeMB.toFixed(1)} MB
                </span>
                <span aria-hidden="true" className="hidden md:inline">·</span>
                <span className="hidden md:inline-flex items-center gap-1">
                  <ArrowDownToLine className="w-3 h-3" aria-hidden="true" />
                  {formatDownloadCount(totalDownloads)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectApp(app)}
              className="h-11 sm:h-10 px-4 rounded-xl sm:rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F172A]"
            >
              <span>Get APK</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </article>
      </Tilt3DCard>
    );
  }

  return (
    <Tilt3DCard enabled={depth3D} className="h-full rounded-2xl">
      <article
        className={`group h-full rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 transition-colors ${
          depth3D ? 'depth-3d-card' : 'hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div>
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => onSelectApp(app)}
              style={depth3D ? { transform: 'translateZ(18px)' } : undefined}
              className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200/90 dark:border-slate-700/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] shadow-sm"
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
              <button
                type="button"
                onClick={() => onSelectApp(app)}
                className="text-left w-full cursor-pointer focus-visible:outline-none focus-visible:underline"
              >
                <h3 className="font-display text-base font-semibold text-[#0B1120] dark:text-[#F8FAFC] leading-snug truncate group-hover:text-[#059669] dark:group-hover:text-emerald-400 transition-colors">
                  {app.title}
                </h3>
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {app.developer} · <span className="font-mono text-[11px]">{app.packageName}</span>
              </p>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                <span>{app.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{app.version}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-medium text-[#0B1120] dark:text-slate-200">
                  {app.sizeMB.toFixed(1)} MB
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 mt-4">
            {app.subtitle}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <StarRating average={average} totalVotes={totalVotes} userVote={null} />
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
              <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {formatDownloadCount(totalDownloads)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectApp(app)}
            style={depth3D ? { transform: 'translateZ(14px)' } : undefined}
            className="h-11 sm:h-9 px-4 sm:px-3.5 rounded-xl sm:rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F172A]"
          >
            <span>Get APK</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </article>
    </Tilt3DCard>
  );
};
