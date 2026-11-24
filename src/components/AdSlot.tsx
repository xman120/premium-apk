import React, { useMemo } from 'react';
import { AdsConfig, AdSlotKey } from '@/src/types/store';

export type AdSlotVariant = 'leaderboard' | 'rectangle' | 'native' | 'sticky';

interface AdSlotProps {
  slotKey: Exclude<AdSlotKey, 'socialBar' | 'inPagePush' | 'interstitial' | 'popunder'>;
  adsConfig: AdsConfig;
  isAdminActive: boolean;
  variant: AdSlotVariant;
  className?: string;
}

const VARIANT_DIMENSIONS: Record<
  AdSlotVariant,
  { minHeightClass: string; heightPx: number; badgeText: string }
> = {
  leaderboard: {
    minHeightClass: 'min-h-[96px]',
    heightPx: 96,
    badgeText: '728x90 / 970x90 Leaderboard Placement',
  },
  rectangle: {
    minHeightClass: 'min-h-[258px]',
    heightPx: 256,
    badgeText: '300x250 / 336x280 Display Placement',
  },
  native: {
    minHeightClass: 'min-h-[164px]',
    heightPx: 164,
    badgeText: 'Native In-Feed Placement',
  },
  sticky: {
    minHeightClass: 'min-h-[56px]',
    heightPx: 54,
    badgeText: '728x90 / 320x50 Sticky Banner Placement',
  },
};

export const AdSlot: React.FC<AdSlotProps> = ({
  slotKey,
  adsConfig,
  isAdminActive,
  variant,
  className = '',
}) => {
  const slot = adsConfig.slots[slotKey];

  const srcDoc = useMemo(() => {
    const raw = slot?.script?.trim();
    if (!raw) return '';
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100%;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
      }
    </style>
  </head>
  <body>
    ${raw}
  </body>
</html>`;
  }, [slot?.script]);

  if (isAdminActive || adsConfig.disableAllAds || !slot || !slot.enabled) {
    return null;
  }

  const dims = VARIANT_DIMENSIONS[variant];
  const hasScript = Boolean(slot.script && slot.script.trim().length > 0);

  if (!hasScript && !adsConfig.showPlaceholders) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored placement"
      className={`w-full flex flex-col items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0B1120]/60 px-3 py-2 ${dims.minHeightClass} ${className}`}
    >
      {hasScript ? (
        <div className="w-full flex flex-col items-center">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5 select-none">
            Sponsored
          </span>
          <iframe
            title={slot.label}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            style={{ height: `${dims.heightPx}px` }}
            className="w-full max-w-[970px] border-0 bg-transparent overflow-hidden"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-2 px-4">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sponsored Placement · {slot.label}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {dims.badgeText} — configure live code in #iamadmin
          </span>
        </div>
      )}
    </aside>
  );
};
