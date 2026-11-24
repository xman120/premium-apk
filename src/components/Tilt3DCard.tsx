import React, { useRef, useState } from 'react';

interface Tilt3DCardProps {
  enabled: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  enabled,
  className = '',
  children,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50, active: false });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !cardRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = cardRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    const rx = (0.5 - ny) * 8;
    const ry = (nx - 0.5) * 9;

    setTilt({
      rx,
      ry,
      px: Math.round(nx * 100),
      py: Math.round(ny * 100),
      active: true,
    });
  };

  const handlePointerLeave = () => {
    if (!enabled) return;
    setTilt({ rx: 0, ry: 0, px: 50, py: 50, active: false });
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        enabled
          ? {
              transform: `perspective(1100px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) translateY(${tilt.active ? '-3px' : '0px'})`,
              transition: tilt.active
                ? 'transform 90ms ease-out, box-shadow 180ms ease-out'
                : 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms ease-out',
              transformStyle: 'preserve-3d',
            }
          : undefined
      }
      className={`relative ${className}`}
    >
      {enabled && tilt.active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
          style={{
            background: `radial-gradient(circle at ${tilt.px}% ${tilt.py}%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};
