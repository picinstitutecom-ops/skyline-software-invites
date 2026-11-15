import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { BACKGROUND_AUDIO_ASSET } from '../data/themes';
import type { InvitationConfig, ThemePreset } from '../types/invitation';
import {
  ensureFontsLoaded,
  getTimelineWindows,
  HD_HEIGHT,
  HD_WIDTH,
  renderLiveVideoOverlay,
} from '../lib/renderOverlay';

interface VideoPreviewStageProps {
  theme: ThemePreset;
  config: InvitationConfig;
  seekRequest: { time: number; nonce: number } | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const EQ_BARS = [42, 78, 60, 95, 52, 86, 68, 90, 48, 76, 64, 84];

export function VideoPreviewStage({
  theme,
  config,
  seekRequest,
  videoRef,
}: VideoPreviewStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(1.6);
  const [duration, setDuration] = useState(theme.durationSeconds);
  const [fontsReady, setFontsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [enable3DStage, setEnable3DStage] = useState(true);
  const [stageTilt, setStageTilt] = useState({ rx: 0, ry: 0 });
  const [stagePressed, setStagePressed] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureFontsLoaded().then(() => {
      if (mounted) setFontsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const voiceVol = isMuted ? 0 : Math.max(0, Math.min(1, config.audio.voiceVolume / 100));
    const musicVol =
      isMuted || !config.audio.musicEnabled
        ? 0
        : Math.max(0, Math.min(1, config.audio.musicVolume / 100));

    if (videoRef.current) {
      videoRef.current.volume = voiceVol;
      videoRef.current.muted = isMuted || voiceVol === 0;
    }
    if (modalVideoRef.current) {
      modalVideoRef.current.volume = voiceVol;
      modalVideoRef.current.muted = isMuted || voiceVol === 0;
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = musicVol;
      musicAudioRef.current.muted = isMuted || !config.audio.musicEnabled || musicVol === 0;
      if ((isPlaying || isFullscreen) && config.audio.musicEnabled && !isMuted && musicVol > 0) {
        if (musicAudioRef.current.paused) {
          musicAudioRef.current.play().catch(() => {});
        }
      } else if (!musicAudioRef.current.paused) {
        musicAudioRef.current.pause();
      }
    }
  }, [
    config.audio.musicEnabled,
    config.audio.musicVolume,
    config.audio.voiceVolume,
    isMuted,
    isPlaying,
    isFullscreen,
    videoRef,
  ]);

  const drawFrame = useCallback(
    (time: number, totalDur: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderLiveVideoOverlay(ctx, time, totalDur, config, theme);
        }
      }
      const mCanvas = modalCanvasRef.current;
      if (mCanvas) {
        const mCtx = mCanvas.getContext('2d');
        if (mCtx) {
          renderLiveVideoOverlay(mCtx, time, totalDur, config, theme);
        }
      }
    },
    [config, theme]
  );

  useEffect(() => {
    setDuration(theme.durationSeconds);
    setIsPlaying(false);
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = 1.6;
      setCurrentTime(1.6);
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 1.6 % BACKGROUND_AUDIO_ASSET.durationSeconds;
    }
  }, [theme, videoRef]);

  useEffect(() => {
    if (!seekRequest) return;
    const vid = videoRef.current;
    const clamped = Math.max(0, Math.min(duration - 0.1, seekRequest.time));
    setCurrentTime(clamped);
    if (vid && vid.readyState >= 1) {
      vid.currentTime = clamped;
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.currentTime = clamped % BACKGROUND_AUDIO_ASSET.durationSeconds;
    }
    drawFrame(clamped, duration);
  }, [seekRequest, duration, videoRef, drawFrame]);

  useEffect(() => {
    const vid = videoRef.current;
    const t = vid ? vid.currentTime : currentTime;
    const d = vid && Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : duration;
    drawFrame(t, d);
  }, [config, theme, fontsReady, currentTime, duration, videoRef, drawFrame]);

  useEffect(() => {
    if (!isPlaying && !isFullscreen) return;
    let rafId = 0;

    const tick = () => {
      const activeVid = isFullscreen ? modalVideoRef.current : videoRef.current;
      if (activeVid) {
        const t = activeVid.currentTime;
        const d =
          Number.isFinite(activeVid.duration) && activeVid.duration > 0
            ? activeVid.duration
            : duration;
        setCurrentTime(t);
        drawFrame(t, d);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isFullscreen, duration, videoRef, drawFrame]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  const togglePlay = async () => {
    const vid = videoRef.current;
    const musicEl = musicAudioRef.current;
    if (!vid) return;
    if (vid.paused) {
      const voiceVol = isMuted ? 0 : config.audio.voiceVolume / 100;
      vid.volume = voiceVol;
      vid.muted = isMuted || voiceVol === 0;
      try {
        await vid.play();
        if (musicEl && config.audio.musicEnabled && !isMuted && config.audio.musicVolume > 0) {
          musicEl.currentTime = vid.currentTime % BACKGROUND_AUDIO_ASSET.durationSeconds;
          musicEl.volume = config.audio.musicVolume / 100;
          musicEl.play().catch(() => {});
        }
        setIsPlaying(true);
      } catch {
        vid.muted = true;
        setIsMuted(true);
        await vid.play();
        setIsPlaying(true);
      }
    } else {
      vid.pause();
      musicEl?.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleScrub = (val: number) => {
    const vid = videoRef.current;
    setCurrentTime(val);
    if (vid) {
      vid.currentTime = val;
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.currentTime = val % BACKGROUND_AUDIO_ASSET.durationSeconds;
    }
    drawFrame(val, duration);
  };

  const jumpToChapter = (targetTime: number) => {
    const clamped = Math.max(0.2, Math.min(duration - 0.5, targetTime));
    handleScrub(clamped);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enable3DStage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setStageTilt({
      rx: (0.5 - py) * 10,
      ry: (px - 0.5) * 12,
    });
  };

  const windows = getTimelineWindows(duration, config.timingMode);
  const openingJump = 1.6;
  const storyJump = Math.min(duration * 0.42, 14);
  const detailsJump = Math.max(0.5, windows.detailsStart + 2.5);

  const activeChapter =
    config.timingMode === 'always'
      ? 'always'
      : currentTime >= windows.detailsStart
        ? 'details'
        : currentTime >= 6.5
          ? 'story'
          : 'opening';

  const progressPct = Math.min(100, Math.max(0, (currentTime / Math.max(1, duration)) * 100));
  const detailsStartPct = Math.min(
    95,
    Math.max(5, (windows.detailsStart / Math.max(1, duration)) * 100)
  );

  return (
    <section id="preview" aria-labelledby="preview-heading">
      <audio ref={musicAudioRef} src={BACKGROUND_AUDIO_ASSET.url} loop preload="auto" />

      <div className="bg-[#11101B] rounded-2xl border border-purple-500/25 p-4 sm:p-5 text-white shadow-[0_20px_55px_-18px_rgba(124,58,237,0.38)] space-y-3">
        {/* Compact Stage Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-purple-500/15">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: theme.palette.accent }}
                aria-hidden="true"
              />
              <h2
                id="preview-heading"
                className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100 truncate"
              >
                {theme.title} · ₹{theme.priceInr}
              </h2>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 tabular-nums truncate">
              {theme.editionLabel} · 1080×1920 · {formatTimecode(duration)}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEnable3DStage((prev) => !prev);
                setStageTilt({ rx: 0, ry: 0 });
              }}
              aria-pressed={enable3DStage}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                enable3DStage
                  ? 'btn-3d-purple bg-purple-600/45 border-purple-400/60 text-purple-100'
                  : 'btn-3d-surface bg-[#191729] border-purple-400/20 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
                  musicAudioRef.current?.pause();
                  setIsPlaying(false);
                }
                setIsFullscreen(true);
              }}
              className="btn-3d-surface inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-100 bg-[#191729] border border-purple-400/25 rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Full
            </button>
          </div>
        </div>

        {/* Large Centered 9:16 Video with Controls Stacked Downside */}
        <div className="flex flex-col items-center gap-3.5">
          <div className="perspective-1200 relative">
            <div
              aria-hidden="true"
              className="absolute -inset-2.5 rounded-3xl bg-gradient-to-tr from-purple-600/25 via-fuchsia-500/15 to-cyan-500/20 blur-md pointer-events-none"
            />
            <div
              onPointerMove={handleStagePointerMove}
              onPointerLeave={() => {
                setStageTilt({ rx: 0, ry: 0 });
                setStagePressed(false);
              }}
              onPointerDown={() => enable3DStage && setStagePressed(true)}
              onPointerUp={() => setStagePressed(false)}
              style={{
                transform: enable3DStage
                  ? `rotateX(${stageTilt.rx}deg) rotateY(${stageTilt.ry}deg) scale(${
                      stagePressed ? 0.975 : 1
                    })`
                  : undefined,
                transition: stagePressed
                  ? 'transform 90ms ease-out'
                  : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow:
                  '0 0 0 1px rgba(168, 85, 247, 0.55), 0 18px 40px -12px rgba(0, 0, 0, 0.92), 0 7px 0 0 rgba(76, 29, 149, 0.55)',
              }}
              className="relative w-[248px] sm:w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-black"
            >
              <video
                ref={videoRef}
                src={theme.videoUrl}
                playsInline
                muted={isMuted}
                preload="auto"
                onLoadedMetadata={(e) => {
                  const vid = e.currentTarget;
                  if (Number.isFinite(vid.duration) && vid.duration > 0) {
                    setDuration(vid.duration);
                  }
                  vid.currentTime = 1.6;
                  setCurrentTime(1.6);
                  drawFrame(1.6, vid.duration || theme.durationSeconds);
                }}
                onSeeked={(e) => {
                  const vid = e.currentTarget;
                  setCurrentTime(vid.currentTime);
                  drawFrame(vid.currentTime, vid.duration || duration);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  musicAudioRef.current?.pause();
                }}
                onClick={togglePlay}
                className="w-full h-full object-cover cursor-pointer"
              />
              <canvas
                ref={canvasRef}
                width={HD_WIDTH}
                height={HD_HEIGHT}
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label="Play invitation preview"
                  className="btn-3d-purple absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-600/95 border border-purple-300/50 flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
                </button>
              )}
            </div>
          </div>

          {/* Downside Transport Bar + 3-Column Scene Jumpers */}
          <div className="w-full space-y-2.5">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#161423] border border-purple-400/20 space-y-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  className="btn-3d-purple w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
                    {config.timingMode !== 'always' && (
                      <div
                        aria-hidden="true"
                        style={{ left: `${detailsStartPct}%` }}
                        className="absolute inset-y-0 right-0 bg-purple-500/25"
                      />
                    )}
                    <div
                      aria-hidden="true"
                      style={{ width: `${progressPct}%` }}
                      className="absolute inset-y-0 left-0 rounded-full bg-purple-500 transition-[width] duration-75"
                    />
                    <input
                      type="range"
                      aria-label="Seek video timeline"
                      min={0}
                      max={duration}
                      step={0.05}
                      value={Math.min(currentTime, duration)}
                      onChange={(e) => handleScrub(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-zinc-400">
                    <span>{formatTimecode(currentTime)}</span>
                    <span>{formatTimecode(duration)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                  className="btn-3d-surface w-9 h-9 rounded-xl bg-[#1E1B30] border border-purple-400/25 flex items-center justify-center text-white shrink-0"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-purple-300" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-purple-500/10">
                <div className="flex items-end gap-1 h-3.5" aria-hidden="true">
                  {EQ_BARS.map((h, i) => (
                    <span
                      key={i}
                      style={{
                        height: isPlaying
                          ? `${Math.max(25, ((h + Math.round(currentTime * 30 + i * 17)) % 90) + 10)}%`
                          : `${Math.round(h * 0.35)}%`,
                      }}
                      className="w-1 rounded-full bg-gradient-to-t from-purple-600 to-cyan-400 transition-all duration-150"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                  {config.audio.musicEnabled
                    ? `Music ${config.audio.musicVolume}% · Voice ${config.audio.voiceVolume}%`
                    : `Voice ${config.audio.voiceVolume}%`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => jumpToChapter(openingJump)}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-xl border text-center transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeChapter === 'opening'
                    ? 'btn-3d-purple bg-purple-600 text-white border-purple-300/50'
                    : 'btn-3d-surface bg-[#191729] text-zinc-200 border-purple-400/20'
                }`}
              >
                <span className="truncate">01. Opening</span>
              </button>
              <button
                type="button"
                onClick={() => jumpToChapter(storyJump)}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-xl border text-center transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeChapter === 'story'
                    ? 'btn-3d-purple bg-purple-600 text-white border-purple-300/50'
                    : 'btn-3d-surface bg-[#191729] text-zinc-200 border-purple-400/20'
                }`}
              >
                <span className="truncate">02. Story</span>
              </button>
              <button
                type="button"
                onClick={() => jumpToChapter(detailsJump)}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-xl border text-center transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  activeChapter === 'details' || activeChapter === 'always'
                    ? 'btn-3d-purple bg-purple-600 text-white border-purple-300/50'
                    : 'btn-3d-surface bg-[#191729] text-zinc-200 border-purple-400/20'
                }`}
              >
                <span className="truncate">03. 3D Notice</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Screening Modal */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen invitation preview"
          className="fixed inset-0 z-50 bg-black/94 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            aria-label="Close fullscreen preview"
            className="btn-3d-surface absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-2xl bg-purple-600/35 border border-purple-400/45 text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            style={{
              boxShadow:
                '0 0 0 1px rgba(168,85,247,0.45), 0 25px 60px rgba(0,0,0,0.9)',
            }}
            className="relative h-[82vh] aspect-[9/16] rounded-2xl overflow-hidden bg-black"
          >
            <video
              ref={modalVideoRef}
              src={theme.videoUrl}
              autoPlay
              playsInline
              muted={isMuted}
              onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = currentTime;
                const voiceVol = isMuted ? 0 : config.audio.voiceVolume / 100;
                e.currentTarget.volume = voiceVol;
              }}
              className="w-full h-full object-cover"
            />
            <canvas
              ref={modalCanvasRef}
              width={HD_WIDTH}
              height={HD_HEIGHT}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Press ESC or click × to return to the studio editor
          </p>
        </div>
      )}
    </section>
  );
}
