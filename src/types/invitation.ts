export type TimingMode = 'chapters' | 'always' | 'finale';

export type TypographyStyle = 'editorial' | 'storybook' | 'royal';

export type CardSurface = 'dark' | 'ivory';

export type PricingTierId = 'tier_299' | 'tier_499' | 'tier_699';

export type ExportQuality = '720p' | '1080p' | '1080p_master';

export interface PricingTier {
  id: PricingTierId;
  name: string;
  priceInr: number;
  resolutionLabel: string;
  quality: ExportQuality;
  badge?: string;
  features: string[];
  includesStillCard: boolean;
}

export interface PaidPass {
  downloadToken: string;
  tierId: PricingTierId;
  paymentId: string;
  orderId: string;
  priceInr: number;
}

export interface ThemePalette {
  accent: string;
  accentBright: string;
  accentSoft: string;
  darkSurface: string;
  darkSurfaceTop: string;
  darkBorder: string;
  ivoryAccent: string;
  ivoryBorder: string;
  swatch: string;
  stageGlow: string;
}

export interface ThemeWording {
  openingKicker: string;
  detailsKicker: string;
  crestBadge: string;
}

export interface ThemePreset {
  id: string;
  title: string;
  subtitle: string;
  priceInr: 299 | 499 | 699;
  tierId: PricingTierId;
  editionLabel: string;
  videoUrl: string;
  videoFilename: string;
  durationSeconds: number;
  defaultChildName: string;
  defaultMilestone: string;
  palette: ThemePalette;
  wording: ThemeWording;
}

export interface AudioConfig {
  musicEnabled: boolean;
  musicVolume: number;
  voiceVolume: number;
}

export interface InvitationConfig {
  themeId: string;
  childName: string;
  milestone: string;
  dateText: string;
  timeText: string;
  venue: string;
  parentsName: string;
  hostPrefix: string;
  timingMode: TimingMode;
  typographyStyle: TypographyStyle;
  cardSurface: CardSurface;
  audio: AudioConfig;
}

export interface OverlayPlateSpec {
  id: string;
  startTime: number;
  endTime: number;
  fadeIn: number;
  fadeOut: number;
  dataUrl: string;
}

export interface ExportJobState {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  downloadUrl?: string;
  filename?: string;
}
