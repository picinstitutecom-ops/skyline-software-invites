import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Music,
  Palette,
  Sliders,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { DEFAULT_INVITATION_CONFIG, getThemeById, THEME_PRESETS } from './data/themes';
import { BRAND_LOGO_URL, getPricingTier } from './data/pricing';
import {
  isInsideIframe,
  openRazorpayModalCheckout,
  safeFetchJson,
} from './lib/razorpay';
import {
  generateExportOverlayPlates,
  generateStillCardPng,
  getTimelineWindows,
} from './lib/renderOverlay';
import type {
  AudioConfig,
  ExportJobState,
  InvitationConfig,
  PaidPass,
  PricingTierId,
  ThemePreset,
} from './types/invitation';
import { SkylineLogo } from './components/SkylineLogo';
import { ThemeSelector } from './components/ThemeSelector';
import { InvitationForm } from './components/InvitationForm';
import { AudioMixer } from './components/AudioMixer';
import { VideoPreviewStage } from './components/VideoPreviewStage';
import { InteractiveNotice3D } from './components/InteractiveNotice3D';
import { ExportControls } from './components/ExportControls';

const PAID_PASS_STORAGE_KEY = 'skyline_hd_paid_pass_v1';
const PENDING_CHECKOUT_STORAGE_KEY = 'skyline_pending_checkout_v1';

const STUDIO_STEPS = [
  { id: 'themes', label: '1. Theme', icon: Palette },
  { id: 'details', label: '2. Details', icon: UserCheck },
  { id: 'typography', label: '3. Style', icon: Sliders },
  { id: 'audio', label: '4. Audio', icon: Music },
  { id: 'export', label: '5. Pay & Save', icon: Sparkles },
] as const;

export default function App() {
  const [config, setConfig] = useState<InvitationConfig>(() => {
    try {
      const saved = localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { config?: InvitationConfig };
        if (parsed?.config) return parsed.config;
      }
    } catch {
      // Ignore invalid storage
    }
    return DEFAULT_INVITATION_CONFIG;
  });

  const [paidPass, setPaidPass] = useState<PaidPass | null>(() => {
    try {
      const saved = localStorage.getItem(PAID_PASS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as PaidPass) : null;
    } catch {
      return null;
    }
  });

  const [exportJob, setExportJob] = useState<ExportJobState | null>(null);
  const [activePaymentLink, setActivePaymentLink] = useState<{
    linkId: string;
    shortUrl: string;
    priceInr: number;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const deckScrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const redirectHandledRef = useRef(false);

  const selectedTheme = getThemeById(config.themeId);
  const selectedTierId = selectedTheme.tierId;
  const activeTier = getPricingTier(selectedTierId);

  const scrollToStep = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(STUDIO_STEPS.length - 1, index));
    setActiveStepIdx(clamped);
    const card = cardRefs.current[clamped];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const updateConfig = useCallback((patch: Partial<InvitationConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateAudio = useCallback((audio: AudioConfig) => {
    setConfig((prev) => ({ ...prev, audio }));
  }, []);

  const handleSelectTheme = useCallback((nextTheme: ThemePreset) => {
    setConfig((prev) => {
      const prevTheme = getThemeById(prev.themeId);
      const shouldSwapDefaultName =
        !prev.childName.trim() || prev.childName === prevTheme.defaultChildName;
      return {
        ...prev,
        themeId: nextTheme.id,
        childName: shouldSwapDefaultName ? nextTheme.defaultChildName : prev.childName,
      };
    });
    setPaymentError(null);
    setExportJob(null);
  }, []);

  const handleSelectTierFromExport = useCallback(
    (tierId: PricingTierId) => {
      if (selectedTheme.tierId === tierId) return;
      const matchingTheme = THEME_PRESETS.find((t) => t.tierId === tierId);
      if (matchingTheme) {
        handleSelectTheme(matchingTheme);
      }
    },
    [handleSelectTheme, selectedTheme.tierId]
  );

  const handleReset = useCallback(() => {
    const theme = getThemeById(config.themeId);
    setConfig({
      ...DEFAULT_INVITATION_CONFIG,
      themeId: theme.id,
      childName: theme.defaultChildName,
    });
  }, [config.themeId]);

  const handleFocusNameField = useCallback(() => {
    if (config.timingMode === 'chapters') {
      setSeekRequest({ time: 1.6, nonce: Date.now() });
    }
  }, [config.timingMode]);

  const handleFocusDetailsField = useCallback(() => {
    if (config.timingMode === 'chapters' || config.timingMode === 'finale') {
      const windows = getTimelineWindows(selectedTheme.durationSeconds, config.timingMode);
      setSeekRequest({ time: windows.detailsStart + 2.5, nonce: Date.now() });
    }
  }, [config.timingMode, selectedTheme.durationSeconds]);

  const handleJumpToVideoNotice = useCallback(() => {
    const windows = getTimelineWindows(selectedTheme.durationSeconds, config.timingMode);
    setSeekRequest({ time: windows.detailsStart + 2.5, nonce: Date.now() });
    document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [config.timingMode, selectedTheme.durationSeconds]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runExportWithPass = useCallback(
    async (passToUse: PaidPass, configOverride?: InvitationConfig) => {
      if (isExporting) return;

      const activeConfig = configOverride ?? config;
      const activeTheme = getThemeById(activeConfig.themeId);

      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      setPaymentError(null);
      setIsExporting(true);
      setExportJob({
        jobId: 'preparing',
        status: 'queued',
        progress: 2,
      });

      try {
        const tierSpec = getPricingTier(activeTheme.tierId);
        const targetWidth = tierSpec.quality === '720p' ? 720 : 1080;
        const targetHeight = tierSpec.quality === '720p' ? 1280 : 1920;
        const actualDuration =
          videoRef.current &&
          Number.isFinite(videoRef.current.duration) &&
          videoRef.current.duration > 0
            ? videoRef.current.duration
            : activeTheme.durationSeconds;

        const plates = await generateExportOverlayPlates(
          activeConfig,
          activeTheme,
          actualDuration,
          targetWidth,
          targetHeight
        );

        let initData: ExportJobState;
        try {
          initData = await safeFetchJson<ExportJobState>('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              themeId: activeTheme.id,
              childName: activeConfig.childName || activeTheme.defaultChildName,
              audio: activeConfig.audio,
              downloadToken: passToUse.downloadToken,
              plates,
            }),
          });
        } catch (apiErr) {
          const msg = apiErr instanceof Error ? apiErr.message : 'Could not start video rendering.';
          if (msg.toLowerCase().includes('unlock') || msg.toLowerCase().includes('render limit')) {
            localStorage.removeItem(PAID_PASS_STORAGE_KEY);
            setPaidPass(null);
          }
          throw new Error(msg);
        }

        setExportJob(initData);

        pollTimerRef.current = window.setInterval(async () => {
          try {
            const jobState = await safeFetchJson<ExportJobState>(
              `/api/export/${encodeURIComponent(initData.jobId)}/status`
            );
            setExportJob(jobState);

            if (jobState.status === 'completed') {
              if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              setIsExporting(false);
              if (jobState.downloadUrl && jobState.filename) {
                triggerDownload(jobState.downloadUrl, jobState.filename);
              }
            } else if (jobState.status === 'failed') {
              if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              setIsExporting(false);
            }
          } catch (pollErr) {
            if (pollTimerRef.current !== null) {
              window.clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            setIsExporting(false);
            setExportJob({
              jobId: initData.jobId,
              status: 'failed',
              progress: 0,
              error:
                pollErr instanceof Error ? pollErr.message : 'Lost connection while rendering.',
            });
          }
        }, 900);
      } catch (err) {
        setIsExporting(false);
        setExportJob({
          jobId: 'error',
          status: 'failed',
          progress: 0,
          error: err instanceof Error ? err.message : 'Video export failed.',
        });
      }
    },
    [config, isExporting]
  );

  // Handle Razorpay Redirect Callback Return (?payment_token=... or ?payment_error=...)
  useEffect(() => {
    if (redirectHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const paymentToken = params.get('payment_token');
    const urlError = params.get('payment_error');

    if (!paymentToken && !urlError) return;
    redirectHandledRef.current = true;

    let restoredConfig: InvitationConfig | undefined;
    try {
      const saved = localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          config?: InvitationConfig;
        };
        if (parsed?.config) {
          restoredConfig = parsed.config;
          setConfig(parsed.config);
        }
      }
    } catch {
      // Ignore storage read failure
    }

    window.history.replaceState({}, '', '/');

    window.setTimeout(() => {
      scrollToStep(4);
      document.getElementById('studio-deck')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    if (urlError) {
      setPaymentError(urlError);
      return;
    }

    if (paymentToken) {
      (async () => {
        try {
          const data = await safeFetchJson<
            Partial<PaidPass> & {
              verified?: boolean;
              error?: string;
            }
          >(`/api/payments/pass/${encodeURIComponent(paymentToken)}`);
          if (!data.verified || !data.downloadToken) {
            throw new Error(data.error || 'Could not confirm your payment pass.');
          }

          const verifiedPass: PaidPass = {
            downloadToken: data.downloadToken,
            tierId: (data.tierId as PricingTierId) ?? 'tier_499',
            paymentId: data.paymentId ?? '',
            orderId: data.orderId ?? '',
            priceInr:
              data.priceInr ??
              getPricingTier((data.tierId as PricingTierId) ?? 'tier_499').priceInr,
          };

          setPaidPass(verifiedPass);
          setActivePaymentLink(null);
          try {
            localStorage.setItem(PAID_PASS_STORAGE_KEY, JSON.stringify(verifiedPass));
            localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
          } catch {
            // Non-fatal storage error
          }

          await runExportWithPass(verifiedPass, restoredConfig);
        } catch (err) {
          setPaymentError(
            err instanceof Error ? err.message : 'Unable to verify payment after redirect.'
          );
        }
      })();
    }
  }, [runExportWithPass, scrollToStep]);

  const handleCheckPaymentLink = useCallback(async () => {
    if (!activePaymentLink?.linkId || isProcessingPayment || isExporting) return;
    setPaymentError(null);
    setIsProcessingPayment(true);
    try {
      const statusData = await safeFetchJson<{
        paid?: boolean;
        verified?: boolean;
        downloadToken?: string;
        tierId?: PricingTierId;
        paymentId?: string;
        orderId?: string;
        priceInr?: number;
      }>(`/api/payments/link-status/${encodeURIComponent(activePaymentLink.linkId)}`);

      if (!statusData.paid || !statusData.downloadToken) {
        setPaymentError('Payment not received yet on Razorpay. Complete payment and tap Verify Paid.');
        setIsProcessingPayment(false);
        return;
      }

      const verifiedPass: PaidPass = {
        downloadToken: statusData.downloadToken,
        tierId: statusData.tierId ?? selectedTierId,
        paymentId: statusData.paymentId ?? '',
        orderId: statusData.orderId ?? activePaymentLink.linkId,
        priceInr: statusData.priceInr ?? selectedTheme.priceInr,
      };
      setPaidPass(verifiedPass);
      setActivePaymentLink(null);
      try {
        localStorage.setItem(PAID_PASS_STORAGE_KEY, JSON.stringify(verifiedPass));
        localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      } catch {
        // Non-fatal storage error
      }
      setIsProcessingPayment(false);
      await runExportWithPass(verifiedPass);
    } catch (err) {
      setIsProcessingPayment(false);
      setPaymentError(
        err instanceof Error ? err.message : 'Unable to verify Razorpay payment status.'
      );
    }
  }, [
    activePaymentLink,
    isExporting,
    isProcessingPayment,
    runExportWithPass,
    selectedTheme.priceInr,
    selectedTierId,
  ]);

  const handlePayAndExport = useCallback(async () => {
    if (isProcessingPayment || isExporting) return;
    setPaymentError(null);

    if (paidPass && paidPass.priceInr >= selectedTheme.priceInr) {
      await runExportWithPass(paidPass);
      return;
    }

    setIsProcessingPayment(true);
    try {
      try {
        localStorage.setItem(
          PENDING_CHECKOUT_STORAGE_KEY,
          JSON.stringify({ config, selectedTierId })
        );
      } catch {
        // Non-fatal storage error
      }

      const orderData = await safeFetchJson<{
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        paymentLinkId?: string;
        shortUrl?: string;
        error?: string;
      }>('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: selectedTierId,
          childName: config.childName || selectedTheme.defaultChildName,
          themeId: selectedTheme.id,
          themeTitle: selectedTheme.title,
          callbackOrigin: window.location.origin,
        }),
      });

      if (!orderData.orderId || !orderData.keyId || !orderData.amount) {
        throw new Error(orderData.error || 'Could not initialize Razorpay order.');
      }

      if (orderData.paymentLinkId && orderData.shortUrl) {
        setActivePaymentLink({
          linkId: orderData.paymentLinkId,
          shortUrl: orderData.shortUrl,
          priceInr: selectedTheme.priceInr,
        });
      }

      // On standalone browsers & phones, redirect directly to Razorpay's hosted Payment Link
      if (!isInsideIframe() && orderData.shortUrl) {
        window.location.assign(orderData.shortUrl);
        return;
      }

      // Inside iframe preview: launch non-redirect modal checkout (no callback_url/redirect: true)
      const rzpResponse = await openRazorpayModalCheckout({
        keyId: orderData.keyId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        title: 'Skyline Software',
        description: `${selectedTheme.title} (${selectedTheme.editionLabel})`,
        logoUrl: BRAND_LOGO_URL,
        prefillName: config.parentsName || config.childName,
      });

      const verifyData = await safeFetchJson<
        Partial<PaidPass> & { verified?: boolean; error?: string }
      >('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: rzpResponse.razorpay_order_id,
          razorpay_payment_id: rzpResponse.razorpay_payment_id,
          razorpay_signature: rzpResponse.razorpay_signature,
          tierId: selectedTierId,
        }),
      });

      if (!verifyData.verified || !verifyData.downloadToken) {
        throw new Error(verifyData.error || 'Payment verification failed.');
      }

      const verifiedPass: PaidPass = {
        downloadToken: verifyData.downloadToken,
        tierId: (verifyData.tierId as PricingTierId) ?? selectedTierId,
        paymentId: verifyData.paymentId ?? rzpResponse.razorpay_payment_id,
        orderId: verifyData.orderId ?? rzpResponse.razorpay_order_id,
        priceInr: verifyData.priceInr ?? selectedTheme.priceInr,
      };

      setPaidPass(verifiedPass);
      setActivePaymentLink(null);
      try {
        localStorage.setItem(PAID_PASS_STORAGE_KEY, JSON.stringify(verifiedPass));
        localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      } catch {
        // Non-fatal storage error
      }

      setIsProcessingPayment(false);
      await runExportWithPass(verifiedPass);
    } catch (err) {
      setIsProcessingPayment(false);
      setPaymentError(
        err instanceof Error ? err.message : 'Unable to complete Razorpay checkout.'
      );
    }
  }, [
    config,
    isExporting,
    isProcessingPayment,
    paidPass,
    runExportWithPass,
    selectedTheme.defaultChildName,
    selectedTheme.editionLabel,
    selectedTheme.id,
    selectedTheme.priceInr,
    selectedTheme.title,
    selectedTierId,
  ]);

  const handleDownloadStillCard = useCallback(async () => {
    const dataUrl = await generateStillCardPng(videoRef.current, config, selectedTheme);
    const safeName = (config.childName.trim() || selectedTheme.defaultChildName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    triggerDownload(dataUrl, `${safeName}-birthday-card-hd.png`);
  }, [config, selectedTheme]);

  const handleDeckScroll = () => {
    const container = deckScrollRef.current;
    if (!container) return;
    const center = container.scrollLeft + container.clientWidth / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    cardRefs.current.forEach((card, idx) => {
      if (!card) return;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(center - cardCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setActiveStepIdx(closestIdx);
  };

  return (
    <div
      style={{
        backgroundImage:
          'radial-gradient(ellipse 90% 45% at 50% -8%, rgba(139, 92, 246, 0.24), transparent 70%)',
      }}
      className="min-h-screen flex flex-col bg-[#07070B] text-zinc-100"
    >
      {/* 3-Zone Top Bar with Custom Vector Skyline Software Logo */}
      <header className="border-b border-purple-500/15 bg-[#07070B]/92 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-6">
          <a
            href="#top"
            className="inline-flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl"
          >
            <SkylineLogo compact />
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-zinc-400"
          >
            <a
              href="#preview"
              className="hover:text-purple-300 transition-colors whitespace-nowrap shrink-0"
            >
              Preview
            </a>
            <button
              type="button"
              onClick={() => scrollToStep(0)}
              className="hover:text-purple-300 transition-colors whitespace-nowrap shrink-0"
            >
              Themes
            </button>
            <button
              type="button"
              onClick={() => scrollToStep(1)}
              className="hover:text-purple-300 transition-colors whitespace-nowrap shrink-0"
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => scrollToStep(3)}
              className="hover:text-purple-300 transition-colors whitespace-nowrap shrink-0"
            >
              Audio
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                scrollToStep(4);
                document
                  .getElementById('studio-deck')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="btn-3d-purple inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-purple-600 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Get {selectedTheme.title} ·</span>
              <span className="sm:hidden">HD ·</span> ₹{selectedTheme.priceInr}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Big Clean Hero Heading */}
        <h1
          className="font-display text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white leading-[1.12]"
          style={{ textWrap: 'balance' }}
        >
          Magical 3D{' '}
          <span className="bg-gradient-to-r from-purple-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">
            Birthday Video Invitations
          </span>
        </h1>

        {/* TOP STAGE: Live Video Preview + 3D Interactive Notice */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          <div className="lg:col-span-6">
            <VideoPreviewStage
              theme={selectedTheme}
              config={config}
              seekRequest={seekRequest}
              videoRef={videoRef}
            />
          </div>

          <div className="lg:col-span-6">
            <InteractiveNotice3D
              config={config}
              theme={selectedTheme}
              onJumpToVideoNotice={handleJumpToVideoNotice}
            />
          </div>
        </div>

        {/* BOTTOM STAGE: Cute 3D Step Buttons + Sideways Scrolling Details Deck */}
        <div id="studio-deck" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
              {STUDIO_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const active = activeStepIdx === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => scrollToStep(idx)}
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl text-[11px] sm:text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'btn-3d-purple bg-purple-600 text-white border-purple-300/50'
                        : 'btn-3d-surface bg-[#151324] text-zinc-300 border-purple-400/20 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {step.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label="Scroll details left"
                onClick={() => scrollToStep(activeStepIdx - 1)}
                disabled={activeStepIdx === 0}
                className="btn-3d-surface w-9 h-9 rounded-2xl bg-[#181629] border border-purple-400/25 flex items-center justify-center text-zinc-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Scroll details right"
                onClick={() => scrollToStep(activeStepIdx + 1)}
                disabled={activeStepIdx === STUDIO_STEPS.length - 1}
                className="btn-3d-surface w-9 h-9 rounded-2xl bg-[#181629] border border-purple-400/25 flex items-center justify-center text-zinc-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Sideways Scrolling Container (items-start prevents uneven tall gaps) */}
          <div
            ref={deckScrollRef}
            onScroll={handleDeckScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 sm:gap-4 sideways-scroll pb-3 scroll-smooth items-start"
          >
            {/* Card 1: Themes */}
            <div
              ref={(el) => {
                cardRefs.current[0] = el;
              }}
              className="snap-center shrink-0 w-[calc(100vw-1.75rem)] sm:w-[440px] lg:w-[455px]"
            >
              <ThemeSelector
                themes={THEME_PRESETS}
                selectedThemeId={config.themeId}
                onSelectTheme={handleSelectTheme}
              />
            </div>

            {/* Card 2: Details */}
            <div
              ref={(el) => {
                cardRefs.current[1] = el;
              }}
              className="snap-center shrink-0 w-[calc(100vw-1.75rem)] sm:w-[440px] lg:w-[455px]"
            >
              <InvitationForm
                section="details"
                config={config}
                theme={selectedTheme}
                onChange={updateConfig}
                onReset={handleReset}
                onFocusNameField={handleFocusNameField}
                onFocusDetailsField={handleFocusDetailsField}
              />
            </div>

            {/* Card 3: Theme Text & Typography */}
            <div
              ref={(el) => {
                cardRefs.current[2] = el;
              }}
              className="snap-center shrink-0 w-[calc(100vw-1.75rem)] sm:w-[440px] lg:w-[455px]"
            >
              <InvitationForm
                section="style"
                config={config}
                theme={selectedTheme}
                onChange={updateConfig}
                onReset={handleReset}
                onFocusNameField={handleFocusNameField}
                onFocusDetailsField={handleFocusDetailsField}
              />
            </div>

            {/* Card 4: Audio Mixer */}
            <div
              ref={(el) => {
                cardRefs.current[3] = el;
              }}
              className="snap-center shrink-0 w-[calc(100vw-1.75rem)] sm:w-[440px] lg:w-[455px]"
            >
              <AudioMixer audio={config.audio} onChange={updateAudio} />
            </div>

            {/* Card 5: Razorpay Payment & HD Phone Download */}
            <div
              ref={(el) => {
                cardRefs.current[4] = el;
              }}
              className="snap-center shrink-0 w-[calc(100vw-1.75rem)] sm:w-[470px] lg:w-[500px]"
            >
              <ExportControls
                theme={selectedTheme}
                selectedTierId={selectedTierId}
                onSelectTier={handleSelectTierFromExport}
                paidPass={paidPass}
                activePaymentLink={activePaymentLink}
                exportJob={exportJob}
                isProcessingPayment={isProcessingPayment}
                isExporting={isExporting}
                paymentError={paymentError}
                onPayAndExport={handlePayAndExport}
                onCheckPaymentLink={handleCheckPaymentLink}
                onRenderWithPass={() => {
                  if (paidPass) void runExportWithPass(paidPass);
                }}
                onDownloadStillCard={handleDownloadStillCard}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-purple-500/15 py-3.5">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <SkylineLogo compact />
            <span>HD Birthday Invitation Studio · Phone Gallery Ready</span>
          </div>
          <span>Themes ₹299 · ₹499 · ₹699 · Secured by Razorpay</span>
        </div>
      </footer>
    </div>
  );
}
