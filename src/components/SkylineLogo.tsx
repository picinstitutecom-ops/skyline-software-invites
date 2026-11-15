interface SkylineLogoProps {
  compact?: boolean;
}

export function SkylineLogo({ compact = false }: SkylineLogoProps) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none group">
      {/* Bespoke Skyline Cloud + Towers + Orbit Vector Mark */}
      <svg
        viewBox="0 0 84 58"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={compact ? 'w-9 h-6 shrink-0' : 'w-11 h-8 shrink-0'}
      >
        <defs>
          <linearGradient id="skyCloudGrad" x1="8" y1="6" x2="72" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="55%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <linearGradient id="skyTowerGrad" x1="20" y1="10" x2="64" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
          <linearGradient id="skySwooshGrad" x1="4" y1="48" x2="78" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="60%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>

        {/* Outer Cloud Silhouette */}
        <path
          d="M15.5 34.5C11.2 31.5 11.4 24.4 16.4 21.8C17.8 21.1 19.3 20.9 20.7 21.1C22.4 15.1 28.4 11.2 34.9 12.1C38.4 8.3 44.3 7.2 49.4 9.5C55.1 7.6 61.8 10.6 63.7 16.5C68.9 17.5 72.1 22.7 70.6 27.9"
          stroke="url(#skyCloudGrad)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tower 1 (Left) */}
        <path d="M18 42V25L24.5 22.5V41.5L18 42Z" fill="url(#skyTowerGrad)" />

        {/* Tower 2 (Mid-Left with window slits) */}
        <path d="M27.5 41.2V17.8L35.5 15V40.8L27.5 41.2Z" fill="url(#skyTowerGrad)" />
        <path
          d="M30 21.5H33M30 25H33M30 28.5H33M30 32H33"
          stroke="#E0F2FE"
          strokeOpacity="0.85"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Tower 3 (Center Tallest Spire Tower) */}
        <path d="M38.5 40.5V12.5L46.5 9V39.5L38.5 40.5Z" fill="url(#skyTowerGrad)" />
        <path d="M46.5 9L50 13.5V38.8L46.5 39.5V9Z" fill="#1E1B4B" fillOpacity="0.85" />
        <path d="M46.5 9V2.8" stroke="#38BDF8" strokeWidth="1.9" strokeLinecap="round" />

        {/* Tower 4 (Right) */}
        <path d="M53.5 37.5V20L60 22.5V35.5L53.5 37.5Z" fill="url(#skyTowerGrad)" />
        <path
          d="M55.6 24L58 24.8M55.6 27.2L58 28M55.6 30.4L58 31.2"
          stroke="#E0F2FE"
          strokeOpacity="0.8"
          strokeWidth="1.1"
          strokeLinecap="round"
        />

        {/* Sweeping Orbital Swoosh */}
        <path
          d="M11 39.5C5.5 45.8 9.2 52.8 22.8 51.8C41.5 50.4 69.2 40.4 73.2 28.6C75.1 23 71.5 18.8 66.8 18.2C70.8 21.4 71.4 26.2 68.1 30.5C61.2 39.4 37.8 46.8 21.2 46.8C13.6 46.8 10.6 43.7 11 39.5Z"
          fill="url(#skySwooshGrad)"
        />
      </svg>

      {/* Skyline Software Typographic Lockup */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-0.5">
          <span
            className={`font-sans font-extrabold tracking-tight text-white ${
              compact ? 'text-base' : 'text-lg sm:text-xl'
            }`}
          >
            Skyl
            <span className="relative inline-block">
              <span
                aria-hidden="true"
                className="absolute -top-[0.06em] left-1/2 -translate-x-1/2 w-[0.23em] h-[0.23em] rounded-[2px] bg-gradient-to-tr from-cyan-400 to-purple-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]"
              />
              i
            </span>
            ne
          </span>
          <span className="text-[8px] font-bold text-purple-300/75 -translate-y-1.5 ml-0.5">
            TM
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="h-px w-3.5 bg-gradient-to-r from-transparent to-purple-400/70" />
          <span
            className={`font-sans font-semibold tracking-[0.34em] uppercase text-purple-200/85 ${
              compact ? 'text-[7px]' : 'text-[8px]'
            }`}
          >
            SOFTWARE
          </span>
          <span className="h-px w-3.5 bg-gradient-to-l from-transparent to-cyan-400/70" />
        </div>
      </div>
    </div>
  );
}
