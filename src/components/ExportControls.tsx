import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileImage,
  Loader2,
  Lock,
  Share2,
  Smartphone,
} from 'lucide-react';
import { PRICING_TIERS } from '../data/pricing';
import type {
  ExportJobState,
  PaidPass,
  PricingTierId,
  ThemePreset,
} from '../types/invitation';

interface ActivePaymentLink {
  linkId: string;
  shortUrl: string;
  priceInr: number;
}

interface ExportControlsProps {
  theme: ThemePreset;
  selectedTierId: PricingTierId;
  onSelectTier: (id: PricingTierId) => void;
  paidPass: PaidPass | null;
  activePaymentLink?: ActivePaymentLink | null;
  exportJob: ExportJobState | null;
  isProcessingPayment: boolean;
  isExporting: boolean;
  paymentError: string | null;
  onPayAndExport: () => void;
  onCheckPaymentLink?: () => void;
  onRenderWithPass: () => void;
  onDownloadStillCard: () => void;
}

export function ExportControls({
  theme,
  selectedTierId,
  onSelectTier,
  paidPass,
  activePaymentLink,
  exportJob,
  isProcessingPayment,
  isExporting,
  paymentError,
  onPayAndExport,
  onCheckPaymentLink,
  onRenderWithPass,
  onDownloadStillCard,
}: ExportControlsProps) {
  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const activeTier =
    PRICING_TIERS.find((t) => t.id === selectedTierId) ?? PRICING_TIERS[1];
  const progress = exportJob?.progress ?? 0;

  const isPaidForSelectedTheme =
    paidPass !== null && paidPass.priceInr >= theme.priceInr;

  const handlePhoneGallerySave = async () => {
    if (!exportJob?.downloadUrl || !exportJob?.filename) return;
    setIsSavingToGallery(true);
    try {
      const res = await fetch(exportJob.downloadUrl);
      if (!res.ok) throw new Error('Download unavailable');
      const blob = await res.blob();
      const mimeType =
        blob.type ||
        (exportJob.filename.endsWith('.webm') ? 'video/webm' : 'video/mp4');
      const mp4File = new File([blob], exportJob.filename, {
        type: mimeType,
      });

      if (
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [mp4File] })
      ) {
        await navigator.share({
          files: [mp4File],
          title: 'HD Birthday Invitation Video',
        });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = exportJob.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
    } catch {
      const a = document.createElement('a');
      a.href = exportJob.downloadUrl;
      a.download = exportJob.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsSavingToGallery(false);
    }
  };

  return (
    <section
      id="export"
      aria-labelledby="export-heading"
      className="bg-[#11101B] rounded-2xl border border-purple-500/20 p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-purple-500/15">
        <div>
          <h2
            id="export-heading"
            className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100"
          >
            05. {theme.title} · ₹{theme.priceInr} HD Checkout
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            Pay securely via Razorpay (@coursekit), then save HD MP4 to phone gallery.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 whitespace-nowrap shrink-0">
          <Lock className="w-3 h-3" />
          @coursekit
        </span>
      </div>

      {/* Compact 3-Column Theme Edition Price Switcher (fits mobile & desktop equally) */}
      <div className="grid grid-cols-3 gap-2">
        {PRICING_TIERS.map((tier) => {
          const isSelected = tier.id === selectedTierId;
          const isUnlocked = paidPass !== null && paidPass.priceInr >= tier.priceInr;
          return (
            <button
              key={tier.id}
              type="button"
              disabled={isProcessingPayment || isExporting}
              onClick={() => onSelectTier(tier.id)}
              aria-pressed={isSelected}
              style={
                isSelected
                  ? {
                      boxShadow:
                        '0 5px 0 0 #4c1d95, 0 10px 20px -8px rgba(139, 92, 246, 0.5)',
                    }
                  : { boxShadow: '0 4px 0 0 #191729' }
              }
              className={`text-left rounded-2xl p-2.5 transition-all active:translate-y-[3px] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                isSelected
                  ? 'bg-[#1D1836] ring-2 ring-purple-500'
                  : 'bg-[#151322] ring-1 ring-purple-400/20 hover:ring-purple-400/45'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-display text-lg sm:text-xl font-bold text-white tabular-nums">
                  ₹{tier.priceInr}
                </span>
                {isUnlocked && (
                  <span className="text-[10px] font-semibold text-emerald-400">
                    Paid
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-purple-200 truncate mt-0.5">
                {tier.name.replace(' Pack', '')}
              </div>
              <div className="text-[10px] text-zinc-400 leading-tight mt-0.5 line-clamp-2">
                {tier.priceInr === 299
                  ? 'Racer & Bunny'
                  : tier.priceInr === 499
                    ? 'Space & Ocean'
                    : 'Royal & Princess'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Tier Perks Summary Box */}
      <div className="p-3 rounded-xl bg-[#161425] border border-purple-400/15 space-y-1.5">
        <div className="text-[11px] font-semibold text-purple-200">
          Included in {activeTier.name} (₹{activeTier.priceInr}):
        </div>
        <ul className="space-y-1">
          {activeTier.features.map((feat) => (
            <li
              key={feat}
              className="flex items-center gap-1.5 text-[11px] text-zinc-300 leading-tight"
            >
              <Check className="w-3 h-3 text-purple-400 shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Verified Paid Pass Banner */}
      {isPaidForSelectedTheme && paidPass && (
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/35 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-200 truncate">
                Verified ₹{paidPass.priceInr} Pass
              </div>
              <div className="text-[10px] font-mono text-emerald-300/80 truncate">
                {paidPass.paymentId}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-300 shrink-0">
            Ready
          </span>
        </div>
      )}

      {/* Hosted Razorpay Link Option (for UPI / external tab redirect) */}
      {!isPaidForSelectedTheme && activePaymentLink && activePaymentLink.priceInr >= theme.priceInr && (
        <div className="p-2.5 rounded-xl bg-[#161329] border border-purple-400/30 flex items-center justify-between gap-2">
          <a
            href={activePaymentLink.shortUrl}
            target="_top"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-purple-200 hover:text-white inline-flex items-center gap-1.5 underline underline-offset-2 truncate"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-purple-400" />
            Open Hosted Razorpay Link (₹{activePaymentLink.priceInr})
          </a>
          {onCheckPaymentLink && (
            <button
              type="button"
              onClick={onCheckPaymentLink}
              className="btn-3d-surface px-2.5 py-1 rounded-lg bg-[#221d3d] border border-purple-400/25 text-[11px] font-semibold text-zinc-100 whitespace-nowrap shrink-0"
            >
              Verify Paid
            </button>
          )}
        </div>
      )}

      {/* Payment Error Alert */}
      {paymentError && (
        <div
          role="alert"
          className="p-2.5 rounded-xl bg-red-950/45 border border-red-500/40 text-xs text-red-200"
        >
          {paymentError}
        </div>
      )}

      {/* Render & Phone Gallery Download Progress */}
      {exportJob && (
        <div
          aria-live="polite"
          className="p-3 rounded-xl bg-[#181626] border border-purple-400/25 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-xs font-medium">
            <span className="text-zinc-100 truncate">
              {exportJob.status === 'completed'
                ? 'HD MP4 ready — save to phone gallery'
                : exportJob.status === 'failed'
                  ? exportJob.error || 'Export failed. Please try again.'
                  : 'Building HD MP4 video & mixed audio...'}
            </span>
            <span className="font-mono tabular-nums text-purple-300 shrink-0">
              {progress}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                exportJob.status === 'failed'
                  ? 'bg-red-500'
                  : exportJob.status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-purple-500'
              }`}
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>

          {exportJob.status === 'completed' && exportJob.downloadUrl && (
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSavingToGallery}
                onClick={handlePhoneGallerySave}
                className="btn-3d-emerald flex-1 h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {isSavingToGallery ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5" />
                    Save to Gallery
                  </>
                )}
              </button>

              <a
                href={exportJob.downloadUrl}
                download={exportJob.filename}
                className="btn-3d-surface h-9 px-3 rounded-xl border border-purple-400/30 bg-[#191729] text-zinc-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-purple-300" />
                MP4
              </a>

              <button
                type="button"
                disabled={isSavingToGallery}
                onClick={handlePhoneGallerySave}
                title="Share to WhatsApp or Photos"
                className="btn-3d-surface h-9 px-3 rounded-xl border border-purple-400/30 bg-[#191729] text-zinc-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 sm:hidden"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cute 3D Primary Action Buttons */}
      <div className="flex items-center gap-2">
        {isPaidForSelectedTheme ? (
          <button
            type="button"
            disabled={isExporting}
            onClick={onRenderWithPass}
            className="btn-3d-purple flex-1 h-10 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/60 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rendering ({progress}%)
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {exportJob?.status === 'completed'
                  ? 'Re-render HD MP4'
                  : `Download ${theme.title} MP4`}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={isProcessingPayment || isExporting}
            onClick={onPayAndExport}
            className="btn-3d-purple flex-1 h-10 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/60 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting...
              </>
            ) : isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rendering ({progress}%)
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Pay ₹{theme.priceInr} &amp; Download HD
              </>
            )}
          </button>
        )}

        {isPaidForSelectedTheme && activeTier.includesStillCard && (
          <button
            type="button"
            onClick={onDownloadStillCard}
            className="btn-3d-surface h-10 px-3.5 rounded-2xl border border-purple-400/25 bg-[#191729] text-zinc-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <FileImage className="w-3.5 h-3.5 text-purple-300" />
            PNG
          </button>
        )}
      </div>
    </section>
  );
}
