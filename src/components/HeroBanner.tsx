import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { AppItem, UserRatingMap } from '@/src/types/store';
import { formatDownloadCount } from '@/src/utils/security';
import { getCombinedAppRating } from '@/src/utils/storage';
import { AppImage } from '@/src/components/AppImage';
import { Tilt3DCard } from '@/src/components/Tilt3DCard';

interface HeroBannerProps {
  featuredApp: AppItem;
  userRatings: UserRatingMap;
  localDownloads: Record<string, number>;
  depth3D: boolean;
  onSelectApp: (app: AppItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredApp,
  userRatings,
  localDownloads,
  depth3D,
  onSelectApp,
}) => {
  const { average, totalVotes } = getCombinedAppRating(featuredApp, userRatings);
  const totalDownloads = featuredApp.downloads + (localDownloads[featuredApp.id] ?? 0);
  const bannerImage = featuredApp.screenshots[0] || featuredApp.iconUrl;

  return (
    <Tilt3DCard enabled={depth3D} className="rounded-2xl">
      <section
        aria-label="Featured release"
        className={`rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200/90 dark:border-slate-800 overflow-hidden ${
          depth3D ? 'depth-3d-card' : ''
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-5 sm:p-8 lg:p-10 flex flex-col justify-between gap-5 sm:gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="text-[#D97706] dark:text-amber-400 font-semibold">
                  Featured Release
                </span>
                <span aria-hidden="true">·</span>
                <span>{featuredApp.category}</span>
                <span aria-hidden="true">·</span>
                <span>{featuredApp.minAndroid}</span>
              </div>

              <div className="flex items-center gap-3.5 sm:gap-4 mt-3.5 sm:mt-4">
                <div
                  style={depth3D ? { transform: 'translateZ(18px)' } : undefined}
                  className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
                >
                  <AppImage
                    src={featuredApp.iconUrl}
                    alt={`${featuredApp.title} icon`}
                    fallbackTitle={featuredApp.title}
                    variant="icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-[#0B1120] dark:text-[#F8FAFC] [text-wrap:balance]">
                    {featuredApp.title}
                  </h2>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate mt-1">
                    {featuredApp.packageName}
                  </p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mt-3.5 sm:mt-4 max-w-xl">
                {featuredApp.subtitle}. Verified SHA-256 package signature and high-speed direct APK mirror ready for installation.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 py-3.5 sm:py-4 border-y border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Version</div>
                  <div className="font-mono text-sm font-semibold text-[#0B1120] dark:text-[#F8FAFC] mt-0.5 tabular-nums">
                    {featuredApp.version}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">APK Size</div>
                  <div className="font-mono text-sm font-semibold text-[#0B1120] dark:text-[#F8FAFC] mt-0.5 tabular-nums">
                    {featuredApp.sizeMB.toFixed(1)} MB
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Rating</div>
                  <div className="font-mono text-sm font-semibold text-[#0B1120] dark:text-[#F8FAFC] mt-0.5 tabular-nums">
                    {average.toFixed(1)} / 5 ({totalVotes.toLocaleString()})
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Downloads</div>
                  <div className="font-mono text-sm font-semibold text-[#0B1120] dark:text-[#F8FAFC] mt-0.5 tabular-nums">
                    {formatDownloadCount(totalDownloads)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => onSelectApp(featuredApp)}
                  style={depth3D ? { transform: 'translateZ(14px)' } : undefined}
                  className="w-full sm:w-auto h-12 sm:h-11 px-6 rounded-xl sm:rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F172A]"
                >
                  <span>Download APK ({featuredApp.sizeMB.toFixed(1)} MB)</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" aria-hidden="true" />
                  <span>SHA-256 Verified · No Sign-Up</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-first lg:order-last lg:col-span-6 relative aspect-video lg:aspect-auto min-h-[200px] lg:min-h-[360px] bg-slate-900 overflow-hidden">
            <AppImage
              src={bannerImage}
              alt={`${featuredApp.title} gameplay showcase`}
              fallbackTitle={featuredApp.title}
              variant="banner"
              className="w-full h-full object-cover lg:h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between gap-4 text-white">
              <span className="text-xs font-medium text-white/90 truncate">
                {featuredApp.developer}
              </span>
              <span className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
                Updated {featuredApp.updatedAt}
              </span>
            </div>
          </div>
        </div>
      </section>
    </Tilt3DCard>
  );
};
