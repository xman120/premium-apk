import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { isSafeUrl } from '@/src/utils/security';

interface AppImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
  variant?: 'icon' | 'banner';
}

export const AppImage: React.FC<AppImageProps> = ({
  src,
  alt,
  fallbackTitle,
  className = '',
  variant = 'icon',
}) => {
  const [failed, setFailed] = useState(false);
  const safeSrc = isSafeUrl(src) ? src : '';

  if (!safeSrc || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-500 dark:text-slate-400 select-none ${className}`}
      >
        <Package
          className={variant === 'icon' ? 'w-6 h-6 mb-0.5' : 'w-10 h-10 mb-2'}
          aria-hidden="true"
        />
        {variant === 'banner' && (
          <span className="text-xs font-medium px-4 text-center line-clamp-1">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
};
