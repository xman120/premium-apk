import React from 'react';
import { LogoAccent } from '@/src/types/store';

interface BrandLogoProps {
  accent?: LogoAccent;
  size?: number;
  className?: string;
}

const ACCENT_PALETTES: Record<
  LogoAccent,
  {
    primary: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    playFill: string;
  }
> = {
  'emerald-blue': {
    primary: '#059669',
    primaryDark: '#047857',
    secondary: '#2563EB',
    secondaryLight: '#3B82F6',
    playFill: '#FFFFFF',
  },
  'emerald-gold': {
    primary: '#059669',
    primaryDark: '#065F46',
    secondary: '#D97706',
    secondaryLight: '#F59E0B',
    playFill: '#FFFFFF',
  },
  'cobalt-cyan': {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    secondary: '#0891B2',
    secondaryLight: '#06B6D4',
    playFill: '#FFFFFF',
  },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  accent = 'emerald-blue',
  size = 38,
  className = '',
}) => {
  const palette = ACCENT_PALETTES[accent] ?? ACCENT_PALETTES['emerald-blue'];
  const gradId = `paw-grad-${accent}`;
  const cubeTopId = `paw-top-${accent}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
        <linearGradient id={cubeTopId} x1="12" y1="6" x2="32" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.secondaryLight} />
          <stop offset="100%" stopColor={palette.primary} />
        </linearGradient>
      </defs>

      {/* Outer Isometric 3D Hex Vault Shield */}
      <path
        d="M22 2.5L38.5 11.8V30.4L22 39.7L5.5 30.4V11.8L22 2.5Z"
        fill="#0F172A"
        stroke={`url(#${gradId})`}
        strokeWidth="1.75"
      />

      {/* Top 3D Facet */}
      <path
        d="M22 4.8L36.2 12.8L22 20.5L7.8 12.8L22 4.8Z"
        fill={`url(#${cubeTopId})`}
        fillOpacity="0.92"
      />

      {/* Left 3D Vault Wall */}
      <path
        d="M7.8 12.8L22 20.5V37.2L7.8 29.3V12.8Z"
        fill={palette.primaryDark}
        fillOpacity="0.94"
      />

      {/* Right 3D Vault Wall */}
      <path
        d="M36.2 12.8L22 20.5V37.2L36.2 29.3V12.8Z"
        fill={palette.secondary}
        fillOpacity="0.88"
      />

      {/* Crisp Front Isometric Play / APK Badge */}
      <path
        d="M18.2 17.5L28.6 23.4L18.2 29.3V17.5Z"
        fill={palette.playFill}
      />

      {/* Top Specular Edge Line */}
      <path
        d="M11.5 12.8L22 7L32.5 12.8"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
