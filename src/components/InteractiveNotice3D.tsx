import { useState } from 'react';
import { CalendarDays, Eye, MapPin, Orbit, Rotate3D, Sparkles } from 'lucide-react';
import type { InvitationConfig, ThemePreset } from '../types/invitation';

interface InteractiveNotice3DProps {
  config: InvitationConfig;
  theme: ThemePreset;
  onJumpToVideoNotice: () => void;
}

interface ThemeVisualStyle {
  darkBg: string;
  ivoryBg: string;
  backBg: string;
  lipColor: string;
  rimGlow: string;
  spotlight: string;
  ivoryBorder: string;
  darkBorder: string;
  badgeBg: string;
  badgeText: string;
  inviteTagline: string;
}

function getThemeVisualStyle(theme: ThemePreset): ThemeVisualStyle {
  switch (theme.id) {
    case 'grand-prix-racer':
      return {
        darkBg: 'linear-gradient(155deg, #1F172A 0%, #121626 55%, #090B12 100%)',
        ivoryBg: 'linear-gradient(160deg, #FFFDF8 0%, #FDF2F0 100%)',
        backBg: 'linear-gradient(145deg, #2D1120 0%, #121626 60%, #090B12 100%)',
        lipColor: 'rgba(190, 18, 60, 0.72)',
        rimGlow: 'rgba(255, 107, 125, 0.52)',
        spotlight: 'rgba(255, 107, 125, 0.28)',
        ivoryBorder: 'rgba(190, 18, 60, 0.34)',
        darkBorder: 'rgba(255, 107, 125, 0.55)',
        badgeBg: 'rgba(225, 29, 72, 0.18)',
        badgeText: '#FDE047',
        inviteTagline: 'Race Track Party · VIP Pit Pass',
      };
    case 'wonderland-bunny':
      return {
        darkBg: 'linear-gradient(155deg, #153124 0%, #0E2219 55%, #07120D 100%)',
        ivoryBg: 'linear-gradient(160deg, #FFFDF7 0%, #F1F8F3 100%)',
        backBg: 'linear-gradient(145deg, #1B3D2C 0%, #0E2219 60%, #07120D 100%)',
        lipColor: 'rgba(4, 120, 87, 0.68)',
        rimGlow: 'rgba(252, 211, 77, 0.48)',
        spotlight: 'rgba(167, 243, 208, 0.24)',
        ivoryBorder: 'rgba(4, 120, 87, 0.32)',
        darkBorder: 'rgba(252, 211, 77, 0.52)',
        badgeBg: 'rgba(16, 185, 129, 0.16)',
        badgeText: '#FCD34D',
        inviteTagline: 'Enchanted Garden Tea Celebration',
      };
    case 'cosmic-astronaut':
      return {
        darkBg: 'linear-gradient(155deg, #16214D 0%, #0B112B 55%, #050816 100%)',
        ivoryBg: 'linear-gradient(160deg, #FAFCFF 0%, #EDF3FF 100%)',
        backBg: 'linear-gradient(145deg, #1D2B64 0%, #0B112B 60%, #050816 100%)',
        lipColor: 'rgba(37, 99, 235, 0.66)',
        rimGlow: 'rgba(125, 211, 252, 0.5)',
        spotlight: 'rgba(125, 211, 252, 0.26)',
        ivoryBorder: 'rgba(29, 78, 216, 0.30)',
        darkBorder: 'rgba(125, 211, 252, 0.54)',
        badgeBg: 'rgba(56, 189, 248, 0.16)',
        badgeText: '#7DD3FC',
        inviteTagline: 'Cosmic Voyage · Starlight Celebration',
      };
    case 'ocean-mermaid':
      return {
        darkBg: 'linear-gradient(155deg, #0D3952 0%, #082336 55%, #04131E 100%)',
        ivoryBg: 'linear-gradient(160deg, #FBFEFE 0%, #ECF9F8 100%)',
        backBg: 'linear-gradient(145deg, #114866 0%, #082336 60%, #04131E 100%)',
        lipColor: 'rgba(13, 148, 136, 0.68)',
        rimGlow: 'rgba(94, 234, 212, 0.5)',
        spotlight: 'rgba(94, 234, 212, 0.26)',
        ivoryBorder: 'rgba(14, 116, 144, 0.32)',
        darkBorder: 'rgba(94, 234, 212, 0.52)',
        badgeBg: 'rgba(45, 212, 191, 0.16)',
        badgeText: '#5EEAD4',
        inviteTagline: 'Pearl Cove · Coral Reef Party',
      };
    case 'palace-princess':
      return {
        darkBg: 'linear-gradient(155deg, #3C1637 0%, #240D22 55%, #120612 100%)',
        ivoryBg: 'linear-gradient(160deg, #FFFAFD 0%, #FDF0F6 100%)',
        backBg: 'linear-gradient(145deg, #4B1B44 0%, #240D22 60%, #120612 100%)',
        lipColor: 'rgba(190, 24, 93, 0.66)',
        rimGlow: 'rgba(249, 168, 212, 0.52)',
        spotlight: 'rgba(249, 168, 212, 0.28)',
        ivoryBorder: 'rgba(157, 23, 77, 0.30)',
        darkBorder: 'rgba(249, 168, 212, 0.56)',
        badgeBg: 'rgba(244, 114, 182, 0.16)',
        badgeText: '#FDE68A',
        inviteTagline: 'Fairytale Castle · Royal Reception',
      };
    case 'royal-prince':
    default:
      return {
        darkBg: 'linear-gradient(155deg, #192652 0%, #0E1633 55%, #070B1B 100%)',
        ivoryBg: 'linear-gradient(160deg, #FFFDF8 0%, #F7EFE0 100%)',
        backBg: 'linear-gradient(145deg, #21326A 0%, #0E1633 60%, #070B1B 100%)',
        lipColor: 'rgba(180, 130, 40, 0.66)',
        rimGlow: 'rgba(230, 194, 101, 0.54)',
        spotlight: 'rgba(230, 194, 101, 0.26)',
        ivoryBorder: 'rgba(140, 98, 25, 0.36)',
        darkBorder: 'rgba(230, 194, 101, 0.58)',
        badgeBg: 'rgba(230, 194, 101, 0.16)',
        badgeText: '#F8E39C',
        inviteTagline: 'Royal Palace · Grand Celebration',
      };
  }
}

function ThemeCrestSvg({
  themeId,
  color,
  highlight,
  size = 38,
}: {
  themeId: string;
  color: string;
  highlight: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-32 -26 64 52"
      fill="none"
      aria-hidden="true"
      className="mx-auto shrink-0"
    >
      {themeId === 'royal-prince' && (
        <>
          <path
            d="M-22 10 L-26 -10 L-10 0 L0 -16 L10 0 L26 -10 L22 10 Z"
            stroke={color}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <line x1="-22" y1="15" x2="22" y2="15" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="-26" cy="-13" r="2.8" fill={highlight} />
          <circle cx="0" cy="-19" r="3" fill={highlight} />
          <circle cx="26" cy="-13" r="2.8" fill={highlight} />
        </>
      )}
      {themeId === 'palace-princess' && (
        <>
          <path
            d="M-26 12 Q-18 -4 -10 4 Q-5 -14 0 -17 Q5 -14 10 4 Q18 -4 26 12 Z"
            stroke={color}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M0 -10 L4.5 -3 L0 4 L-4.5 -3 Z" fill={highlight} />
          <circle cx="0" cy="-21" r="2.6" fill={highlight} />
        </>
      )}
      {themeId === 'grand-prix-racer' && (
        <>
          <path
            d="M-14 -13 L14 -13 L11 2 Q0 11 0 11 Q0 11 -11 2 Z"
            stroke={color}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M-14 -9 Q-23 -8 -19 0 Q-15 3 -11 1" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M14 -9 Q23 -8 19 0 Q15 3 11 1" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="0" y1="11" x2="0" y2="17" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="-10" y1="17" x2="10" y2="17" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="0" cy="-5" r="3.2" fill={highlight} />
        </>
      )}
      {themeId === 'cosmic-astronaut' && (
        <>
          <circle cx="0" cy="0" r="11" stroke={color} strokeWidth="2.4" />
          <ellipse
            cx="0"
            cy="0"
            rx="26"
            ry="7"
            transform="rotate(-20)"
            stroke={highlight}
            strokeWidth="2"
          />
          <path d="M22 -20 L23.8 -15.8 L28 -14 L23.8 -12.2 L22 -8 L20.2 -12.2 L16 -14 L20.2 -15.8 Z" fill={highlight} />
          <path d="M-23 7 L-21.6 10.6 L-18 12 L-21.6 13.4 L-23 17 L-24.4 13.4 L-28 12 L-24.4 10.6 Z" fill={highlight} />
        </>
      )}
      {themeId === 'ocean-mermaid' && (
        <>
          <path
            d="M-19 5 A19 19 0 0 1 19 5 L9 14 L-9 14 Z"
            stroke={color}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <line x1="0" y1="12" x2="-9" y2="-9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="0" y1="12" x2="0" y2="-12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="0" y1="12" x2="9" y2="-9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="0" cy="1" r="4.2" fill={highlight} />
        </>
      )}
      {themeId === 'wonderland-bunny' && (
        <>
          <ellipse cx="-8" cy="-4" rx="5.5" ry="15" transform="rotate(-10 -8 -4)" stroke={color} strokeWidth="2.3" />
          <ellipse cx="8" cy="-4" rx="5.5" ry="15" transform="rotate(10 8 -4)" stroke={color} strokeWidth="2.3" />
          <circle cx="0" cy="14" r="3.4" fill={highlight} />
        </>
      )}
    </svg>
  );
}

function ThemeDividerSvg({
  themeId,
  lineColor,
  accent,
  highlight,
}: {
  themeId: string;
  lineColor: string;
  accent: string;
  highlight: string;
}) {
  return (
    <svg width="210" height="16" viewBox="0 0 210 16" fill="none" aria-hidden="true" className="mx-auto">
      {themeId === 'grand-prix-racer' ? (
        <>
          <line x1="0" y1="8" x2="72" y2="8" stroke={lineColor} strokeWidth="1.5" />
          <line x1="138" y1="8" x2="210" y2="8" stroke={lineColor} strokeWidth="1.5" />
          {Array.from({ length: 8 }).map((_, col) => (
            <g key={col}>
              <rect x={81 + col * 6} y="2" width="6" height="6" fill={col % 2 === 0 ? accent : highlight} />
              <rect x={81 + col * 6} y="8" width="6" height="6" fill={col % 2 === 1 ? accent : highlight} />
            </g>
          ))}
        </>
      ) : themeId === 'ocean-mermaid' ? (
        <>
          <path
            d="M4 8 Q20 2 36 8 T68 8 T92 8"
            stroke={lineColor}
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d="M118 8 Q134 2 150 8 T182 8 T206 8"
            stroke={lineColor}
            strokeWidth="1.6"
            fill="none"
          />
          <circle cx="105" cy="8" r="4" fill={highlight} />
        </>
      ) : themeId === 'cosmic-astronaut' ? (
        <>
          <line x1="8" y1="8" x2="88" y2="8" stroke={lineColor} strokeWidth="1.5" />
          <line x1="122" y1="8" x2="202" y2="8" stroke={lineColor} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2.5" fill={highlight} />
          <circle cx="202" cy="8" r="2.5" fill={highlight} />
          <path d="M105 1 L107.2 5.8 L112 8 L107.2 10.2 L105 15 L102.8 10.2 L98 8 L102.8 5.8 Z" fill={highlight} />
        </>
      ) : (
        <>
          <line x1="8" y1="8" x2="88" y2="8" stroke={lineColor} strokeWidth="1.5" />
          <line x1="122" y1="8" x2="202" y2="8" stroke={lineColor} strokeWidth="1.5" />
          <path d="M105 2 L111 8 L105 14 L99 8 Z" fill={accent} />
          <circle cx="93" cy="8" r="2" fill={highlight} />
          <circle cx="117" cy="8" r="2" fill={highlight} />
        </>
      )}
    </svg>
  );
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
  const visual = getThemeVisualStyle(theme);
  const accentColor = isIvory ? theme.palette.ivoryAccent : theme.palette.accent;
  const highlightColor = isIvory ? theme.palette.ivoryAccent : theme.palette.accentBright;

  const isStorybookFont = config.typographyStyle === 'storybook';
  const isRoyalCaps = config.typographyStyle === 'royal';
  const displayName = isRoyalCaps ? childName.toUpperCase() : childName;

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
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: theme.palette.accentBright }}
              aria-hidden="true"
            />
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100">
              3D Interactive Invitation Notice
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {theme.title} edition · Tilt, spin or tap to flip 3D cover
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
          className="relative w-full min-h-[290px] sm:min-h-[310px] preserve-3d"
        >
          {/* FRONT: Theme-Matched Bespoke 3D Invitation Notice */}
          <div
            style={{
              background: isIvory ? visual.ivoryBg : visual.darkBg,
              boxShadow: isPressed
                ? `0 6px 18px rgba(0,0,0,0.65), 0 0 0 1.5px ${visual.rimGlow}`
                : `0 22px 44px -10px rgba(0,0,0,0.82), 0 8px 0 0 ${visual.lipColor}, 0 0 0 1.5px ${
                    isIvory ? visual.ivoryBorder : visual.darkBorder
                  }`,
            }}
            className="backface-hidden relative rounded-2xl p-5 sm:p-6 overflow-hidden"
          >
            {/* Dynamic Pointer-Tracked Specular Spotlight */}
            <div
              aria-hidden="true"
              style={{
                background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, ${visual.spotlight}, transparent 60%)`,
              }}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Theme-Matched Double Architectural Inner Frame */}
            <div
              aria-hidden="true"
              style={{
                borderColor: isIvory ? visual.ivoryBorder : visual.darkBorder,
              }}
              className="absolute inset-2.5 rounded-xl border opacity-55 pointer-events-none"
            />

            {/* Decorative Corner Flourishes */}
            <span
              aria-hidden="true"
              style={{ borderColor: accentColor }}
              className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-sm opacity-80 pointer-events-none"
            />
            <span
              aria-hidden="true"
              style={{ borderColor: accentColor }}
              className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2 rounded-tr-sm opacity-80 pointer-events-none"
            />
            <span
              aria-hidden="true"
              style={{ borderColor: accentColor }}
              className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2 rounded-bl-sm opacity-80 pointer-events-none"
            />
            <span
              aria-hidden="true"
              style={{ borderColor: accentColor }}
              className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2 rounded-br-sm opacity-80 pointer-events-none"
            />

            <div className="relative text-center space-y-2.5 preserve-3d">
              {/* Theme Emblem + Tagline Pill */}
              <div style={{ transform: 'translateZ(20px)' }} className="space-y-1.5">
                <ThemeCrestSvg
                  themeId={theme.id}
                  color={accentColor}
                  highlight={highlightColor}
                  size={38}
                />
                <div
                  style={{
                    color: isIvory ? theme.palette.ivoryAccent : theme.palette.accentBright,
                  }}
                  className="text-[10px] font-semibold tracking-[0.2em] uppercase"
                >
                  {theme.wording.detailsKicker}
                </div>
              </div>

              {/* Highlighted Child Name + Milestone */}
              <div style={{ transform: 'translateZ(36px)' }}>
                <div
                  style={{
                    letterSpacing: isRoyalCaps ? '0.08em' : '-0.02em',
                    color: isIvory ? '#18181B' : '#FFFFFF',
                    textShadow: isIvory ? 'none' : `0 4px 18px ${visual.spotlight}`,
                  }}
                  className={`text-2xl sm:text-3xl font-bold leading-tight ${
                    isStorybookFont ? 'font-sans' : 'font-display'
                  }`}
                >
                  {displayName}
                </div>
                <div
                  style={{ color: accentColor }}
                  className="font-display italic text-base sm:text-lg mt-0.5 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-85" />
                  <span>{milestone}</span>
                  <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-85" />
                </div>
              </div>

              {/* Theme Ornamental SVG Divider */}
              <div style={{ transform: 'translateZ(16px)' }} className="py-0.5">
                <ThemeDividerSvg
                  themeId={theme.id}
                  lineColor={isIvory ? 'rgba(24,24,27,0.18)' : 'rgba(255,255,255,0.22)'}
                  accent={accentColor}
                  highlight={highlightColor}
                />
              </div>

              {/* Crisp Event Details */}
              <div style={{ transform: 'translateZ(22px)' }} className="space-y-2">
                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl border text-xs sm:text-sm font-semibold"
                  style={{
                    background: isIvory ? 'rgba(24,24,27,0.04)' : visual.badgeBg,
                    borderColor: isIvory ? visual.ivoryBorder : visual.darkBorder,
                    color: isIvory ? '#18181B' : '#FFFFFF',
                  }}
                >
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{dateLine || 'Date to be announced'}</span>
                </div>

                <div className="flex items-start justify-center gap-1.5 max-w-sm mx-auto">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor }} />
                  <span
                    className={`text-xs font-medium leading-snug ${
                      isIvory ? 'text-zinc-700' : 'text-zinc-200'
                    }`}
                  >
                    {venue}
                  </span>
                </div>

                <div
                  className="pt-2 border-t max-w-xs mx-auto"
                  style={{
                    borderColor: isIvory ? 'rgba(24,24,27,0.12)' : 'rgba(255,255,255,0.14)',
                  }}
                >
                  <div
                    className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${
                      isIvory ? 'text-zinc-500' : 'text-zinc-300/75'
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

          {/* BACK: Theme-Matched Embossed 3D Invitation Seal Cover */}
          <div
            style={{
              transform: 'rotateY(180deg)',
              background: visual.backBg,
              boxShadow: `0 22px 44px -10px rgba(0,0,0,0.82), 0 8px 0 0 ${visual.lipColor}, 0 0 0 1.5px ${visual.darkBorder}`,
            }}
            className="backface-hidden absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div
              aria-hidden="true"
              style={{ borderColor: visual.darkBorder }}
              className="absolute inset-2.5 rounded-xl border opacity-50 pointer-events-none"
            />
            <div
              style={{
                transform: 'translateZ(28px)',
                background: visual.badgeBg,
                borderColor: visual.darkBorder,
                boxShadow: `0 0 32px ${visual.spotlight}`,
              }}
              className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-3"
            >
              <ThemeCrestSvg
                themeId={theme.id}
                color={theme.palette.accent}
                highlight={theme.palette.accentBright}
                size={42}
              />
            </div>
            <div
              style={{ color: theme.palette.accentBright }}
              className="text-[10px] font-semibold tracking-[0.22em] uppercase"
            >
              {theme.wording.openingKicker}
            </div>
            <div
              className={`text-2xl font-bold text-white mt-1.5 ${
                isStorybookFont ? 'font-sans' : 'font-display'
              }`}
            >
              {displayName}&apos;s {milestone}
            </div>
            <div className="mt-2">
              <ThemeDividerSvg
                themeId={theme.id}
                lineColor="rgba(255,255,255,0.22)"
                accent={theme.palette.accent}
                highlight={theme.palette.accentBright}
              />
            </div>
            <p className="text-[11px] text-zinc-300 mt-2">
              {visual.inviteTagline} · Tap to open
            </p>
          </div>
        </div>
      </div>

      {/* Live 3D Spec Strip */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="rounded-xl bg-[#161423] border border-purple-400/15 px-2.5 py-2 text-center">
          <div className="text-[10px] text-zinc-400">Theme</div>
          <div
            className="text-xs font-bold truncate mt-0.5"
            style={{ color: theme.palette.accentBright }}
          >
            {theme.title}
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
