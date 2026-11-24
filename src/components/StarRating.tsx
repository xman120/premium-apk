import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  average: number;
  totalVotes: number;
  userVote: number | null;
  interactive?: boolean;
  onRate?: (stars: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({
  average,
  totalVotes,
  userVote,
  interactive = false,
  onRate,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!interactive) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
        <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
          {average.toFixed(1)}
        </span>
        <span className="font-mono text-slate-400 dark:text-slate-500 tabular-nums">
          ({totalVotes.toLocaleString()})
        </span>
      </div>
    );
  }

  const displayStars = hovered ?? userVote ?? Math.round(average);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
      <div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
            {average.toFixed(1)}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            out of 5.0 · <span className="font-mono tabular-nums">{totalVotes.toLocaleString()}</span> ratings
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {userVote
            ? `Your rating (${userVote} / 5) is saved for this browser. Click any star to update.`
            : 'No sign-up required — click a star to rate this release.'}
        </p>
      </div>

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(null)}
        role="radiogroup"
        aria-label="Rate this app from 1 to 5 stars"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayStars;
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onClick={() => onRate?.(star)}
              aria-label={`Rate ${star} out of 5 stars`}
              aria-checked={userVote === star}
              role="radio"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
