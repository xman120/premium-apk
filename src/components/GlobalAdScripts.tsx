import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AdsConfig } from '@/src/types/store';
import { AdSlot } from '@/src/components/AdSlot';

interface GlobalAdScriptsProps {
  adsConfig: AdsConfig;
  isAdminActive: boolean;
}

function injectScriptSnippet(snippet: string, markerAttr: string): () => void {
  const trimmed = snippet.trim();
  if (!trimmed) {
    return () => {};
  }

  const createdNodes: HTMLElement[] = [];
  const temp = document.createElement('div');
  temp.innerHTML = trimmed;

  const scripts = Array.from(temp.querySelectorAll('script'));
  if (scripts.length === 0 && trimmed.startsWith('http')) {
    const s = document.createElement('script');
    s.src = trimmed;
    s.async = true;
    s.setAttribute('data-fs-ad-marker', markerAttr);
    document.body.appendChild(s);
    createdNodes.push(s);
  } else {
    scripts.forEach((orig) => {
      const s = document.createElement('script');
      Array.from(orig.attributes).forEach((attr) => {
        s.setAttribute(attr.name, attr.value);
      });
      if (orig.textContent) {
        s.textContent = orig.textContent;
      }
      s.setAttribute('data-fs-ad-marker', markerAttr);
      document.body.appendChild(s);
      createdNodes.push(s);
    });
  }

  return () => {
    createdNodes.forEach((node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  };
}

export const GlobalAdScripts: React.FC<GlobalAdScriptsProps> = ({
  adsConfig,
  isAdminActive,
}) => {
  const [stickyDismissed, setStickyDismissed] = useState(false);

  // Strictly block all global scripts when #iamadmin is open or disableAllAds is enabled
  const shouldExecuteGlobals = !isAdminActive && !adsConfig.disableAllAds;

  useEffect(() => {
    if (!shouldExecuteGlobals) return;
    const slot = adsConfig.slots.socialBar;
    if (!slot.enabled || !slot.script.trim()) return;
    return injectScriptSnippet(slot.script, 'socialBar');
  }, [shouldExecuteGlobals, adsConfig.slots.socialBar]);

  useEffect(() => {
    if (!shouldExecuteGlobals) return;
    const slot = adsConfig.slots.inPagePush;
    if (!slot.enabled || !slot.script.trim()) return;
    return injectScriptSnippet(slot.script, 'inPagePush');
  }, [shouldExecuteGlobals, adsConfig.slots.inPagePush]);

  useEffect(() => {
    if (!shouldExecuteGlobals) return;
    const slot = adsConfig.slots.interstitial;
    if (!slot.enabled || !slot.script.trim()) return;
    return injectScriptSnippet(slot.script, 'interstitial');
  }, [shouldExecuteGlobals, adsConfig.slots.interstitial]);

  useEffect(() => {
    if (!shouldExecuteGlobals) return;
    const slot = adsConfig.slots.popunder;
    if (!slot.enabled || !slot.script.trim()) return;
    return injectScriptSnippet(slot.script, 'popunder');
  }, [shouldExecuteGlobals, adsConfig.slots.popunder]);

  const stickySlot = adsConfig.slots.stickyFooterBanner;
  const showSticky =
    shouldExecuteGlobals &&
    !stickyDismissed &&
    stickySlot.enabled &&
    (stickySlot.script.trim().length > 0 || adsConfig.showPlaceholders);

  if (!showSticky) {
    return null;
  }

  return (
    <div className="fixed bottom-14 lg:bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md px-3 py-1.5">
      <div className="max-w-[1040px] mx-auto relative flex items-center justify-center">
        <AdSlot
          slotKey="stickyFooterBanner"
          adsConfig={adsConfig}
          isAdminActive={isAdminActive}
          variant="sticky"
          className="border-0 bg-transparent py-0 min-h-[50px]"
        />
        <button
          type="button"
          onClick={() => setStickyDismissed(true)}
          aria-label="Dismiss bottom banner"
          className="ml-2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
