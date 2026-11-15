import { useRef } from 'react';
import { Check, Play } from 'lucide-react';
import type { ThemePreset } from '../types/invitation';

interface ThemeSelectorProps {
  themes: ThemePreset[];
  selectedThemeId: string;
  onSelectTheme: (theme: ThemePreset) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ThemeCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: ThemePreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const thumbVideoRef = useRef<HTMLVideoElement | null>(null);

  const handleMouseEnter = () => {
    const vid = thumbVideoRef.current;
    if (vid) {
      vid.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    const vid = thumbVideoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = 0.8;
    }
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-pressed={isSelected}
      style={
        isSelected
          ? {
              boxShadow:
                '0 5px 0 0 #4c1d95, 0 12px 24px -8px rgba(139, 92, 246, 0.55)',
            }
          : {
              boxShadow: '0 4px 0 0 #171526',
            }
      }
      className={`group text-left rounded-2xl bg-[#161423] transition-all duration-150 active:translate-y-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
        isSelected
          ? 'ring-2 ring-purple-500 -translate-y-0.5'
          : 'ring-1 ring-purple-400/20 hover:ring-purple-400/50 hover:-translate-y-0.5'
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-black">
        <video
          ref={thumbVideoRef}
          src={`${theme.videoUrl}#t=0.8`}
          preload="metadata"
          muted
          loop
          playsInline
          aria-hidden="true"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/35"
        />

        <span
          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold tabular-nums shadow-md backdrop-blur-sm border ${
            isSelected
              ? 'bg-purple-600/95 text-white border-purple-300/60'
              : 'bg-black/75 text-purple-200 border-purple-400/35'
          }`}
        >
          ₹{theme.priceInr}
        </span>

        {isSelected ? (
          <span
            aria-label="Selected theme"
            className="absolute top-1.5 right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md ring-2 ring-purple-200/80"
          >
            <Check className="w-3 h-3 stroke-[2.5]" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-black/60 text-purple-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-purple-400/30"
          >
            <Play className="w-2.5 h-2.5 fill-purple-200 ml-0.5" />
          </span>
        )}

        <div className="absolute inset-x-2 bottom-1.5 flex items-center justify-between gap-1 text-white">
          <span className="text-[10px] font-mono font-medium tabular-nums text-zinc-200">
            {formatDuration(theme.durationSeconds)}
          </span>
          <span
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/70 shrink-0"
            style={{ backgroundColor: theme.palette.accent }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="p-2">
        <div className="text-[11px] sm:text-xs font-semibold text-zinc-100 truncate">
          {theme.title}
        </div>
        <div className="text-[10px] text-purple-300/85 font-medium truncate">
          {theme.editionLabel} · ₹{theme.priceInr}
        </div>
      </div>
    </button>
  );
}

export function ThemeSelector({
  themes,
  selectedThemeId,
  onSelectTheme,
}: ThemeSelectorProps) {
  return (
    <section
      id="themes"
      aria-labelledby="themes-heading"
      className="bg-[#11101B] rounded-2xl border border-purple-500/20 p-4 sm:p-5 space-y-3"
    >
      <div className="pb-2.5 border-b border-purple-500/15">
        <h2
          id="themes-heading"
          className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100"
        >
          01. Choose Theme (₹299 – ₹699)
        </h2>
        <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
          Racer &amp; Wonderland ₹299 · Space &amp; Ocean ₹499 · Royal &amp; Princess ₹699
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={theme.id === selectedThemeId}
            onSelect={() => onSelectTheme(theme)}
          />
        ))}
      </div>
    </section>
  );
}
