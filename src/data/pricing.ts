import type { PricingTier, PricingTierId } from '../types/invitation';

export const BRAND_LOGO_URL =
  '/assets/aistudio/WhatsApp_Image_2026-11-15_at_6.54.37_PM_81fb7a45.jpeg';

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'tier_299',
    name: 'Classic Story Pack',
    priceInr: 299,
    resolutionLabel: 'Little Racer & Wonderland Bunny · HD MP4',
    quality: '720p',
    badge: '₹299 Themes',
    features: [
      'Includes Little Racer & Wonderland themes',
      'HD vertical MP4 + custom music & voice mix',
      'Instant save to phone gallery & WhatsApp',
    ],
    includesStillCard: false,
  },
  {
    id: 'tier_499',
    name: 'Signature 3D Pack',
    priceInr: 499,
    resolutionLabel: 'Space Explorer & Ocean Mermaid · 1080p',
    quality: '1080p',
    badge: '₹499 Themes',
    features: [
      'Includes Space Explorer & Ocean Mermaid',
      '1080×1920 Full HD + 3D beveled notice',
      'Includes matching 1080p HD Still Card (PNG)',
    ],
    includesStillCard: true,
  },
  {
    id: 'tier_699',
    name: 'Royal Master Pack',
    priceInr: 699,
    resolutionLabel: 'Royal Prince & Palace Princess · Master',
    quality: '1080p_master',
    badge: '₹699 Royal',
    features: [
      'Includes Royal Prince & Palace Princess',
      'Master 1080p CRF 16 + 256kbps AAC audio',
      'Unlocks all themes, unlimited edits & PNG Card',
    ],
    includesStillCard: true,
  },
];

export function getPricingTier(id: PricingTierId): PricingTier {
  return PRICING_TIERS.find((t) => t.id === id) ?? PRICING_TIERS[1];
}
