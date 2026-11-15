import { Calendar, RotateCcw } from 'lucide-react';
import type {
  CardSurface,
  InvitationConfig,
  ThemePreset,
  TimingMode,
  TypographyStyle,
} from '../types/invitation';

interface InvitationFormProps {
  config: InvitationConfig;
  theme: ThemePreset;
  onChange: (patch: Partial<InvitationConfig>) => void;
  onReset: () => void;
  onFocusDetailsField: () => void;
  onFocusNameField: () => void;
  section?: 'details' | 'style' | 'both';
}

const MILESTONE_PRESETS = [
  'First Birthday',
  '2nd Birthday',
  '3rd Birthday',
  'Birthday Bash',
];

const TIMING_OPTIONS: { value: TimingMode; label: string; hint: string }[] = [
  {
    value: 'chapters',
    label: 'Chapters',
    hint: 'Theme crest at opening, minimal header during story, full 3D notice in final 14s.',
  },
  {
    value: 'always',
    label: 'Always On',
    hint: 'Theme header at top and 3D notice cleanly visible across the entire video.',
  },
  {
    value: 'finale',
    label: 'Finale',
    hint: 'Clean character animation until the final 13s, then reveals the 3D notice.',
  },
];

const TYPOGRAPHY_OPTIONS: { value: TypographyStyle; label: string; sample: string }[] = [
  { value: 'editorial', label: 'Editorial Serif', sample: 'Playfair Display' },
  { value: 'storybook', label: 'Storybook Sans', sample: 'Plus Jakarta' },
  { value: 'royal', label: 'Royal Monogram', sample: 'Ceremonial Caps' },
];

const SURFACE_OPTIONS: { value: CardSurface; label: string }[] = [
  { value: 'dark', label: 'Velvet Theme' },
  { value: 'ivory', label: 'Ivory Letterpress' },
];

function formatCalendarDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

export function InvitationForm({
  config,
  theme,
  onChange,
  onReset,
  onFocusDetailsField,
  onFocusNameField,
  section = 'both',
}: InvitationFormProps) {
  const activeTiming = TIMING_OPTIONS.find((t) => t.value === config.timingMode);

  const detailsCard = (
    <section
      id="details"
      aria-labelledby="details-heading"
      className="bg-[#11101B] rounded-2xl border border-purple-500/20 p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-purple-500/15">
        <div>
          <h2
            id="details-heading"
            className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100"
          >
            02. Invitation Details
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            Name, date, venue &amp; parents auto-align inside the video.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="btn-3d-surface inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-purple-200 hover:text-white rounded-xl bg-[#191729] border border-purple-400/25 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor="child-name"
              className="block text-[11px] font-medium text-zinc-200 mb-1"
            >
              Birthday Name
            </label>
            <input
              id="child-name"
              type="text"
              maxLength={36}
              value={config.childName}
              onFocus={onFocusNameField}
              onChange={(e) => onChange({ childName: e.target.value })}
              placeholder={`e.g. ${theme.defaultChildName}`}
              className="w-full h-9 px-3 rounded-xl border border-purple-400/25 bg-[#181626] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label
              htmlFor="milestone"
              className="block text-[11px] font-medium text-zinc-200 mb-1"
            >
              Celebration Title
            </label>
            <input
              id="milestone"
              type="text"
              maxLength={40}
              value={config.milestone}
              onFocus={onFocusNameField}
              onChange={(e) => onChange({ milestone: e.target.value })}
              placeholder="e.g. First Birthday"
              className="w-full h-9 px-3 rounded-xl border border-purple-400/25 bg-[#181626] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {MILESTONE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange({ milestone: preset });
                onFocusNameField();
              }}
              className={`px-2 py-1.5 text-[11px] font-semibold rounded-xl border transition-all whitespace-nowrap truncate ${
                config.milestone === preset
                  ? 'btn-3d-purple bg-purple-600 text-white border-purple-300/40'
                  : 'btn-3d-surface bg-[#191729] text-zinc-300 border-purple-400/15 hover:text-white'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor="event-date"
              className="block text-[11px] font-medium text-zinc-200 mb-1"
            >
              Date
            </label>
            <div className="relative flex items-center">
              <input
                id="event-date"
                type="text"
                maxLength={44}
                value={config.dateText}
                onFocus={onFocusDetailsField}
                onChange={(e) => onChange({ dateText: e.target.value })}
                placeholder="Sat, 19 Dec 2026"
                className="w-full h-9 pl-3 pr-8 rounded-xl border border-purple-400/25 bg-[#181626] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <label
                title="Pick from calendar"
                className="absolute right-1 w-7 h-7 rounded-lg flex items-center justify-center text-purple-300 hover:text-white hover:bg-purple-500/20 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <input
                  type="date"
                  aria-label="Pick celebration date from calendar"
                  onChange={(e) => {
                    const formatted = formatCalendarDate(e.target.value);
                    if (formatted) {
                      onChange({ dateText: formatted });
                      onFocusDetailsField();
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="event-time"
              className="block text-[11px] font-medium text-zinc-200 mb-1"
            >
              Time
            </label>
            <input
              id="event-time"
              type="text"
              maxLength={28}
              value={config.timeText}
              onFocus={onFocusDetailsField}
              onChange={(e) => onChange({ timeText: e.target.value })}
              placeholder="6:00 PM Onwards"
              className="w-full h-9 px-3 rounded-xl border border-purple-400/25 bg-[#181626] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="event-venue"
            className="block text-[11px] font-medium text-zinc-200 mb-1"
          >
            Venue &amp; Address
          </label>
          <input
            id="event-venue"
            type="text"
            maxLength={110}
            value={config.venue}
            onFocus={onFocusDetailsField}
            onChange={(e) => onChange({ venue: e.target.value })}
            placeholder="The Grand Courtyard, Taj Palace Hotel, New Delhi"
            className="w-full h-9 px-3 rounded-xl border border-purple-400/25 bg-[#181626] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label
              htmlFor="host-prefix"
              className="block text-[11px] font-medium text-zinc-200 mb-1"
            >
              Host Label
            </label>
            <input
              id="host-prefix"
              type="text"
              maxLength={28}
              value={config.hostPrefix}
              onFocus={onFocusDetailsField}
              onChange={(e) => onChange({ hostPrefix: e.target.value })}
              placeholder="Hosted by"
              className="w-full h-9 px-2.5 rounded-xl border border-purple-400/25 bg-[#181626] text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="col-span-2">
            <label
              htmlFor="parents-name"
              className="block text-[11px] font-medium text-zinc-200 mb-1"
            >
              Parents&apos; Names
            </label>
            <input
              id="parents-name"
              type="text"
              maxLength={64}
              value={config.parentsName}
              onFocus={onFocusDetailsField}
              onChange={(e) => onChange({ parentsName: e.target.value })}
              placeholder="Priya & Rohan Sharma"
              className="w-full h-9 px-3 rounded-xl border border-purple-400/25 bg-[#181626] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>
    </section>
  );

  const styleCard = (
    <section
      id="typography"
      aria-labelledby="typography-heading"
      className="bg-[#11101B] rounded-2xl border border-purple-500/20 p-4 sm:p-5 space-y-3"
    >
      <div className="pb-2.5 border-b border-purple-500/15">
        <h2
          id="typography-heading"
          className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100"
        >
          03. Theme Text &amp; Typography
        </h2>
        <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
          Tailor writing timing, font pairing, and 3D notice finish.
        </p>
      </div>

      <div className="p-2.5 rounded-xl bg-[#181626] border border-purple-400/20 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium text-purple-300/80">
            Active {theme.title} Headline
          </div>
          <div className="text-xs font-semibold text-zinc-100 tracking-wide truncate">
            {theme.wording.openingKicker}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-3 h-3 rounded-full ring-1 ring-white/25"
            style={{ backgroundColor: theme.palette.accent }}
            aria-hidden="true"
          />
          <span
            className="w-3 h-3 rounded-full ring-1 ring-white/25"
            style={{ backgroundColor: theme.palette.swatch }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div>
        <span className="block text-[11px] font-medium text-zinc-200 mb-1.5">
          Writing Placement &amp; Timing
        </span>
        <div className="grid grid-cols-3 gap-2">
          {TIMING_OPTIONS.map((opt) => {
            const active = config.timingMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ timingMode: opt.value })}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-xl border transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  active
                    ? 'btn-3d-purple bg-purple-600 text-white border-purple-300/50'
                    : 'btn-3d-surface bg-[#191729] text-zinc-300 border-purple-400/15 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {activeTiming && (
          <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug">
            {activeTiming.hint}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <span className="block text-[11px] font-medium text-zinc-200 mb-1.5">
            Typeface
          </span>
          <div className="flex flex-col gap-1.5">
            {TYPOGRAPHY_OPTIONS.map((opt) => {
              const active = config.typographyStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ typographyStyle: opt.value })}
                  className={`px-2.5 py-2 text-left rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    active
                      ? 'btn-3d-purple bg-purple-600/35 border-purple-400/60 text-white'
                      : 'btn-3d-surface bg-[#191729] border-purple-400/15 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{opt.label}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{opt.sample}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-zinc-200 mb-1.5">
            3D Card Surface
          </span>
          <div className="flex flex-col gap-1.5">
            {SURFACE_OPTIONS.map((opt) => {
              const active = config.cardSurface === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ cardSurface: opt.value })}
                  className={`px-2.5 py-2.5 text-[11px] font-semibold rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    active
                      ? 'btn-3d-purple bg-purple-600/35 border-purple-400/60 text-white'
                      : 'btn-3d-surface bg-[#191729] border-purple-400/15 text-zinc-300 hover:text-white'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/25 shrink-0"
                    style={{
                      backgroundColor:
                        opt.value === 'dark' ? theme.palette.swatch : '#FAF7F0',
                    }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1.5 leading-snug">
            Synced to 3D card &amp; HD video.
          </p>
        </div>
      </div>
    </section>
  );

  if (section === 'details') return detailsCard;
  if (section === 'style') return styleCard;

  return (
    <div className="space-y-4">
      {detailsCard}
      {styleCard}
    </div>
  );
}
