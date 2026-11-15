import { BACKGROUND_AUDIO_ASSET } from '../data/themes';
import { generateExportOverlayPlates } from './renderOverlay';
import type { InvitationConfig, ThemePreset } from '../types/invitation';

function loadImageFromDataUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load overlay frame'));
    img.src = src;
  });
}

function pickSupportedRecorderMime(): { mimeType: string; ext: 'mp4' | 'webm' } {
  const candidates: Array<{ mimeType: string; ext: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
  ];
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video recording is not supported in this browser.');
  }
  for (const c of candidates) {
    if (!c.mimeType || MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', ext: 'webm' };
}

function computePlateAlpha(
  currentTime: number,
  startTime: number,
  endTime: number,
  fadeIn: number,
  fadeOut: number
): number {
  if (currentTime < startTime || currentTime > endTime) return 0;
  let alpha = 1;
  if (fadeIn > 0.02 && currentTime - startTime < fadeIn) {
    alpha = Math.min(alpha, Math.max(0, (currentTime - startTime) / fadeIn));
  }
  if (fadeOut > 0.02 && endTime - currentTime < fadeOut) {
    alpha = Math.min(alpha, Math.max(0, (endTime - currentTime) / fadeOut));
  }
  return alpha;
}

export async function exportInvitationVideoInBrowser(options: {
  config: InvitationConfig;
  theme: ThemePreset;
  targetWidth: number;
  targetHeight: number;
  onProgress: (progress: number) => void;
}): Promise<{ downloadUrl: string; filename: string }> {
  const { config, theme, targetWidth, targetHeight, onProgress } = options;
  onProgress(4);

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.preload = 'auto';
  video.src = theme.videoUrl;

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Unable to load theme video for HD export.'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
    video.load();
  });

  const duration =
    Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : theme.durationSeconds;

  onProgress(10);
  const plateSpecs = await generateExportOverlayPlates(
    config,
    theme,
    duration,
    targetWidth,
    targetHeight
  );
  const loadedPlates = await Promise.all(
    plateSpecs.map(async (spec) => ({
      spec,
      img: await loadImageFromDataUrl(spec.dataUrl),
    }))
  );

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize video export canvas.');
  }

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream();
  for (const track of canvasStream.getVideoTracks()) {
    combinedStream.addTrack(track);
  }

  let audioCtx: AudioContext | null = null;
  let bgAudio: HTMLAudioElement | null = null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => undefined);
      }
      const dest = audioCtx.createMediaStreamDestination();

      const voiceSource = audioCtx.createMediaElementSource(video);
      const voiceGain = audioCtx.createGain();
      voiceGain.gain.value = Math.max(0, Math.min(1, config.audio.voiceVolume / 100));
      voiceSource.connect(voiceGain);
      voiceGain.connect(dest);

      if (config.audio.musicEnabled && config.audio.musicVolume > 0) {
        bgAudio = document.createElement('audio');
        bgAudio.crossOrigin = 'anonymous';
        bgAudio.loop = true;
        bgAudio.src = BACKGROUND_AUDIO_ASSET.url;
        const musicSource = audioCtx.createMediaElementSource(bgAudio);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = Math.max(0, Math.min(1, config.audio.musicVolume / 100));
        musicSource.connect(musicGain);
        musicGain.connect(dest);
      }

      for (const track of dest.stream.getAudioTracks()) {
        combinedStream.addTrack(track);
      }
    }
  } catch {
    // Continue with video-only stream if browser restricts Web Audio mixing
  }

  const { mimeType, ext } = pickSupportedRecorderMime();
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(
    combinedStream,
    mimeType
      ? {
          mimeType,
          videoBitsPerSecond: targetWidth >= 1080 ? 6_500_000 : 4_000_000,
        }
      : { videoBitsPerSecond: targetWidth >= 1080 ? 6_500_000 : 4_000_000 }
  );

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  let rafId = 0;
  let stopped = false;

  const drawFrame = () => {
    if (stopped) return;
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const t = video.currentTime || 0;
    for (const plate of loadedPlates) {
      const alpha = computePlateAlpha(
        t,
        plate.spec.startTime,
        plate.spec.endTime,
        plate.spec.fadeIn,
        plate.spec.fadeOut
      );
      if (alpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(plate.img, 0, 0, targetWidth, targetHeight);
        ctx.restore();
      }
    }
    const pct = Math.min(98, Math.max(12, Math.round((t / Math.max(1, duration)) * 86) + 12));
    onProgress(pct);

    if (!video.ended && !video.paused) {
      rafId = requestAnimationFrame(drawFrame);
    }
  };

  try {
    const completionPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType || `video/${ext}` }));
      };
      recorder.onerror = () => {
        reject(new Error('MediaRecorder failed while building your video.'));
      };
      video.onended = () => {
        stopped = true;
        cancelAnimationFrame(rafId);
        drawFrame();
        if (bgAudio) bgAudio.pause();
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };
    });

    video.currentTime = 0;
    recorder.start(500);
    await video.play();
    if (bgAudio) {
      bgAudio.currentTime = 0;
      await bgAudio.play().catch(() => undefined);
    }
    rafId = requestAnimationFrame(drawFrame);

    const finalBlob = await completionPromise;
    onProgress(100);
    const safeName = (config.childName.trim() || theme.defaultChildName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const resTag = targetWidth >= 1080 ? '1080p-hd' : '720p-hd';
    const downloadUrl = URL.createObjectURL(finalBlob);

    return {
      downloadUrl,
      filename: `${safeName || 'birthday'}-birthday-invitation-${resTag}.${ext}`,
    };
  } finally {
    stopped = true;
    cancelAnimationFrame(rafId);
    video.pause();
    video.src = '';
    if (bgAudio) {
      bgAudio.pause();
      bgAudio.src = '';
    }
    if (audioCtx) {
      void audioCtx.close().catch(() => undefined);
    }
  }
}
