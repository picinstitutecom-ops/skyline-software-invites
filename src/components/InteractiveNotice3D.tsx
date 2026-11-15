import { useState } from 'react';
import { Eye, Orbit, Rotate3D } from 'lucide-react';
import type { InvitationConfig, ThemePreset } from '../types/invitation';

interface InteractiveNotice3DProps {
  config: InvitationConfig;
  theme: ThemePreset;
  onJumpToVideoNotice: () => void;
}

export function InteractiveNotice3D({
  config,
  theme,
  onJumpToVideoNotice,
}: InteractiveNotice3DProps) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 35 });
  const [isPressed, setIsPressed] = useState(false);
  const [isFlippedToCover, setIsFlippedToCover] = useState(false);
  const [spinOffset, setSpinOffset] = useState(0);

  const childName = config.childName.trim() || theme.defaultChildName;
  const milestone = config.milestone.trim() || theme.defaultMilestone;
  const dateLine = [config.dateText.trim(), config.timeText.trim()]
    .filter(Boolean)
    .join(' · ');
  const venue = config.venue.trim() || 'Venue to be announced';
  const parents = config.parentsName.trim() || 'Family & Loved Ones';
  const hostPrefix = config.hostPrefix.trim() || 'Hosted with love by';

  const isIvory = config.cardSurface === 'ivory';

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 20;
    const rx = (0.5 - py) * 16;
    setTilt({
      rx,
      ry,
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
    });
  };

  const handlePointerLeave = () => {
    setIsPressed(false);
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 35 });
  };

  const trigger360Spin = () => {
    setSpinOffset((prev) => prev + 360);
  };

  return (
    <div className="bg-[#11101B] rounded-2xl border border-purple-500/25 p-4 sm:p-5 shadow-[0_20px_55px_-18px_rgba(124,58,237,0.34)] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-purple-500/15">
        <div>
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100">
            3D Interactive Invitation Notice
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Tilt, spin or tap card to flip 3D cover
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={trigger360Spin}
            title="360° 3D Spin"
            className="btn-3d-surface inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#1A1829] border border-purple-400/25 text-[11px] font-semibold text-cyan-200 hover:text-white whitespace-nowrap shrink-0"
          >
            <Orbit className="w-3.5 h-3.5" />
            360°
          </button>

          <button
            type="button"
            onClick={() => setIsFlippedToCover((prev) => !prev)}
            className="btn-3d-surface inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#1A1829] border border-purple-400/25 text-[11px] font-semibold text-purple-200 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Rotate3D className="w-3.5 h-3.5" />
            {isFlippedToCover ? 'Open' : 'Flip'}
          </button>

          <button
            type="button"
            onClick={onJumpToVideoNotice}
            className="btn-3d-purple inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 text-[11px] font-semibold text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <Eye className="w-3.5 h-3.5" />
            In Video
          </button>
        </div>
      </div>

      {/* 3D Perspective Stage */}
      <div
        className="perspective-1200 select-none cursor-pointer"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onClick={() => setIsFlippedToCover((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-label="Interactive 3D invitation notice card. Press or click to flip."
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlippedToCover((prev) => !prev);
          }
        }}
      >
        <div
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${
              tilt.ry + spinOffset + (isFlippedToCover ? 180 : 0)
            }deg) scale(${isPressed ? 0.965 : 1})`,
            transition: isPressed
              ? 'transform 90ms ease-out'
              : 'transform 520ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative w-full min-h-[245px] sm:min-h-[265px] preserve-3d"
        >
          {/* FRONT: Full Visible 3D Invitation Notice */}
          <div
            style={{
              background: isIvory
                ? 'linear-gradient(165deg, #FFFDF9 0%, #F4EDE0 100%)'
                : 'linear-gradient(165deg, #1E1938 0%, #0B0915 100%)',
              boxShadow: isPressed
                ? '0 6px 18px rgba(0,0,0,0.65), 0 0 0 1px rgba(168,85,247,0.5)'
                : '0 22px 44px -10px rgba(0,0,0,0.8), 0 8px 0 0 rgba(76, 29, 149, 0.6), 0 0 0 1px rgba(168,85,247,0.42)',
            }}
            className="backface-hidden relative rounded-2xl p-5 sm:p-6 overflow-hidden"
          >
            <div
              aria-hidden="true"
              style={{
                background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, ${
                  isIvory ? 'rgba(139,92,246,0.14)' : 'rgba(168,85,247,0.28)'
                }, transparent 58%)`,
              }}
              className="absolute inset-0 pointer-events-none"
            />

            <div
              aria-hidden="true"
              className={`absolute inset-2.5 rounded-xl border pointer-events-none ${
                isIvory ? 'border-purple-900/15' : 'border-purple-300/25'
              }`}
            />

            <div className="relative text-center space-y-2.5 preserve-3d">
              <div
                style={{
                  transform: 'translateZ(18px)',
                  color: isIvory ? '#6D28D9' : theme.palette.accentBright,
                }}
                className="text-[10px] font-semibold tracking-[0.2em] uppercase"
              >
                {theme.wording.detailsKicker}
              </div>

              <div style={{ transform: 'translateZ(34px)' }}>
                <div
                  className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${
                    isIvory ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  {childName}
                </div>
                <div
                  style={{ color: isIvory ? '#7C3AED' : theme.palette.accent }}
                  className="font-display italic text-base sm:text-lg mt-0.5"
                >
                  {milestone}
                </div>
              </div>

              <div
                aria-hidden="true"
                className={`mx-auto w-24 h-px ${
                  isIvory ? 'bg-purple-900/20' : 'bg-purple-300/25'
                }`}
              />

              <div style={{ transform: 'translateZ(22px)' }} className="space-y-2 pt-0.5">
                <div>
                  <div
                    className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${
                      isIvory ? 'text-zinc-500' : 'text-purple-200/75'
                    }`}
                  >
                    Date &amp; Time
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-semibold mt-0.5 ${
                      isIvory ? 'text-zinc-900' : 'text-zinc-100'
                    }`}
                  >
                    {dateLine || 'Date to be announced'}
                  </div>
                </div>

                <div>
                  <div
                    className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${
                      isIvory ? 'text-zinc-500' : 'text-purple-200/75'
                    }`}
                  >
                    Venue
                  </div>
                  <div
                    className={`text-xs font-medium mt-0.5 max-w-sm mx-auto leading-snug ${
                      isIvory ? 'text-zinc-700' : 'text-zinc-300'
                    }`}
                  >
                    {venue}
                  </div>
                </div>

                <div
                  className={`pt-2 border-t max-w-xs mx-auto ${
                    isIvory ? 'border-purple-900/15' : 'border-purple-300/15'
                  }`}
                >
                  <div
                    className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${
                      isIvory ? 'text-zinc-500' : 'text-purple-200/75'
                    }`}
                  >
                    {hostPrefix}
                  </div>
                  <div
                    className={`font-display italic text-sm sm:text-base mt-0.5 ${
                      isIvory ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    {parents}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BACK: Embossed 3D Invitation Seal Cover */}
          <div
            style={{
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(145deg, #211740 0%, #090712 100%)',
              boxShadow:
                '0 22px 44px -10px rgba(0,0,0,0.8), 0 8px 0 0 rgba(76, 29, 149, 0.6), 0 0 0 1px rgba(168,85,247,0.48)',
            }}
            className="backface-hidden absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div
              aria-hidden="true"
              className="absolute inset-2.5 rounded-xl border border-purple-400/25 pointer-events-none"
            />
            <div
              style={{ transform: 'translateZ(28px)' }}
              className="w-14 h-14 rounded-2xl bg-purple-600/35 border border-purple-300/55 flex items-center justify-center mb-3 shadow-[0_0_28px_rgba(168,85,247,0.5)]"
            >
              <span className="font-display text-2xl font-bold text-purple-100">
                {childName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] font-semibold tracking-[0.22em] text-purple-300 uppercase">
              {theme.wording.openingKicker}
            </div>
            <div className="font-display text-2xl font-bold text-white mt-1.5">
              {childName}&apos;s {milestone}
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              Tap card to open full invitation notice
            </p>
          </div>
        </div>
      </div>

      {/* Live 3D Spec Strip — fills bottom cleanly */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="rounded-xl bg-[#161423] border border-purple-400/15 px-2.5 py-2 text-center">
          <div className="text-[10px] text-zinc-400">Theme Price</div>
          <div className="text-xs font-bold text-purple-200 tabular-nums mt-0.5">
            ₹{theme.priceInr}
          </div>
        </div>
        <div className="rounded-xl bg-[#161423] border border-purple-400/15 px-2.5 py-2 text-center">
          <div className="text-[10px] text-zinc-400">Writing Style</div>
          <div className="text-xs font-semibold text-zinc-100 capitalize truncate mt-0.5">
            {config.typographyStyle}
          </div>
        </div>
        <div className="rounded-xl bg-[#161423] border border-purple-400/15 px-2.5 py-2 text-center">
          <div className="text-[10px] text-zinc-400">3D Surface</div>
          <div className="text-xs font-semibold text-zinc-100 capitalize mt-0.5">
            {config.cardSurface}
          </div>
        </div>
      </div>
    </div>
  );
}
