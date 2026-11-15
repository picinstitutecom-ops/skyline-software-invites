import { useEffect, useRef, useState } from 'react';
import { Music, Pause, Play, Volume2 } from 'lucide-react';
import { BACKGROUND_AUDIO_ASSET } from '../data/themes';
import type { AudioConfig } from '../types/invitation';

interface AudioMixerProps {
  audio: AudioConfig;
  onChange: (next: AudioConfig) => void;
}

export function AudioMixer({ audio, onChange }: AudioMixerProps) {
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAuditioning, setIsAuditioning] = useState(false);

  useEffect(() => {
    const el = sampleAudioRef.current;
    if (el) {
      el.volume = Math.max(0, Math.min(1, audio.musicVolume / 100));
    }
  }, [audio.musicVolume]);

  useEffect(() => {
    if (!audio.musicEnabled && isAuditioning) {
      sampleAudioRef.current?.pause();
      setIsAuditioning(false);
    }
  }, [audio.musicEnabled, isAuditioning]);

  const toggleAudition = async () => {
    const el = sampleAudioRef.current;
    if (!el) return;
    if (isAuditioning) {
      el.pause();
      setIsAuditioning(false);
    } else {
      if (!audio.musicEnabled) {
        onChange({ ...audio, musicEnabled: true });
      }
      el.currentTime = 0;
      el.volume = Math.max(0, Math.min(1, audio.musicVolume / 100));
      try {
        await el.play();
        setIsAuditioning(true);
      } catch {
        setIsAuditioning(false);
      }
    }
  };

  return (
    <section
      id="audio"
      aria-labelledby="audio-heading"
      className="bg-[#11101B] rounded-2xl border border-purple-500/20 p-4 sm:p-5 space-y-3"
    >
      <audio
        ref={sampleAudioRef}
        src={BACKGROUND_AUDIO_ASSET.url}
        loop
        onEnded={() => setIsAuditioning(false)}
      />

      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-purple-500/15">
        <div>
          <h2
            id="audio-heading"
            className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100"
          >
            04. Audio &amp; Volume Mixer
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            Balance celebration music &amp; video voiceover in HD export.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={audio.musicEnabled}
          onClick={() => onChange({ ...audio, musicEnabled: !audio.musicEnabled })}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
            audio.musicEnabled
              ? 'btn-3d-purple bg-purple-600/35 border-purple-400/55 text-purple-100'
              : 'btn-3d-surface bg-[#191729] border-zinc-700 text-zinc-400'
          }`}
        >
          {audio.musicEnabled ? 'Music: On' : 'Music: Off'}
        </button>
      </div>

      {/* Soundtrack Audition Row */}
      <div className="p-3 rounded-xl bg-[#181626] border border-purple-400/15 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-100 truncate">
              {BACKGROUND_AUDIO_ASSET.title}
            </div>
            <div className="text-[10px] text-zinc-400 tabular-nums truncate">
              0:36 MP3 · Loops seamlessly in HD
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleAudition}
          className="btn-3d-purple inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          {isAuditioning ? (
            <>
              <Pause className="w-3 h-3" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-white" />
              Play
            </>
          )}
        </button>
      </div>

      {/* Dual Volume Sliders */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-[#161423] border border-purple-400/15 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <label
              htmlFor="music-volume"
              className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1 truncate"
            >
              <Volume2 className="w-3 h-3 text-purple-400 shrink-0" />
              Music
            </label>
            <span className="text-[11px] font-mono tabular-nums text-purple-300 font-semibold">
              {audio.musicEnabled ? `${audio.musicVolume}%` : 'Off'}
            </span>
          </div>
          <input
            id="music-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            disabled={!audio.musicEnabled}
            value={audio.musicEnabled ? audio.musicVolume : 0}
            onChange={(e) =>
              onChange({
                ...audio,
                musicEnabled: true,
                musicVolume: Number(e.target.value),
              })
            }
            className="w-full accent-purple-500 cursor-pointer h-2 bg-zinc-800 rounded-lg disabled:opacity-40"
          />
        </div>

        <div className="p-3 rounded-xl bg-[#161423] border border-purple-400/15 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <label
              htmlFor="voice-volume"
              className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1 truncate"
            >
              <Volume2 className="w-3 h-3 text-purple-400 shrink-0" />
              Voice
            </label>
            <span className="text-[11px] font-mono tabular-nums text-purple-300 font-semibold">
              {audio.voiceVolume}%
            </span>
          </div>
          <input
            id="voice-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={audio.voiceVolume}
            onChange={(e) =>
              onChange({ ...audio, voiceVolume: Number(e.target.value) })
            }
            className="w-full accent-purple-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
          />
        </div>
      </div>

      {/* Quick Mix Presets */}
      <div>
        <div className="text-[11px] text-zinc-400 mb-1.5">Quick 3D mix presets</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Voice + Soft', musicEnabled: true, musicVolume: 40, voiceVolume: 100 },
            { label: 'Music Focus', musicEnabled: true, musicVolume: 85, voiceVolume: 30 },
            { label: 'Music Only', musicEnabled: true, musicVolume: 100, voiceVolume: 0 },
            { label: 'Voice Only', musicEnabled: false, musicVolume: 0, voiceVolume: 100 },
          ].map((preset) => {
            const active =
              audio.musicEnabled === preset.musicEnabled &&
              audio.musicVolume === preset.musicVolume &&
              audio.voiceVolume === preset.voiceVolume;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange({
                    musicEnabled: preset.musicEnabled,
                    musicVolume: preset.musicVolume,
                    voiceVolume: preset.voiceVolume,
                  })
                }
                className={`px-2 py-2 text-[11px] font-semibold rounded-xl border transition-all whitespace-nowrap ${
                  active
                    ? 'btn-3d-purple bg-purple-600 text-white border-purple-300/50'
                    : 'btn-3d-surface bg-[#191729] text-zinc-300 border-purple-400/15 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
