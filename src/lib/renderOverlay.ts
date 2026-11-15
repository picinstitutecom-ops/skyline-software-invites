import type {
  InvitationConfig,
  OverlayPlateSpec,
  ThemePreset,
} from '../types/invitation';

export const HD_WIDTH = 1080;
export const HD_HEIGHT = 1920;

interface WrappedTextResult {
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load('700 72px "Playfair Display"'),
      document.fonts.load('italic 700 36px "Playfair Display"'),
      document.fonts.load('600 32px "Plus Jakarta Sans"'),
      document.fonts.load('700 64px "Plus Jakarta Sans"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Proceed gracefully if browser rejects an individual font load check
  }
}

function getFontFaces(style: InvitationConfig['typographyStyle']) {
  if (style === 'storybook') {
    return {
      nameFont: '"Plus Jakarta Sans", sans-serif',
      nameWeight: '700',
      nameUppercase: false,
      milestoneFont: '"Playfair Display", Georgia, serif',
      milestoneStyle: 'italic 700',
      labelFont: '"Plus Jakarta Sans", sans-serif',
      bodyFont: '"Plus Jakarta Sans", sans-serif',
      parentsFont: '"Playfair Display", Georgia, serif',
      parentsStyle: 'italic 700',
    };
  }
  if (style === 'royal') {
    return {
      nameFont: '"Playfair Display", Georgia, serif',
      nameWeight: '700',
      nameUppercase: true,
      milestoneFont: '"Playfair Display", Georgia, serif',
      milestoneStyle: 'italic 700',
      labelFont: '"Plus Jakarta Sans", sans-serif',
      bodyFont: '"Plus Jakarta Sans", sans-serif',
      parentsFont: '"Playfair Display", Georgia, serif',
      parentsStyle: 'italic 700',
    };
  }
  return {
    nameFont: '"Playfair Display", Georgia, serif',
    nameWeight: '700',
    nameUppercase: false,
    milestoneFont: '"Playfair Display", Georgia, serif',
    milestoneStyle: 'italic 700',
    labelFont: '"Plus Jakarta Sans", sans-serif',
    bodyFont: '"Plus Jakarta Sans", sans-serif',
    parentsFont: '"Playfair Display", Georgia, serif',
    parentsStyle: 'italic 700',
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTrackedCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  letterSpacing: number
) {
  if (!text) return;
  if (letterSpacing <= 0) {
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, y);
    return;
  }
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + letterSpacing * Math.max(0, chars.length - 1);
  let cursorX = cx - totalWidth / 2;
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursorX, y);
    cursorX += widths[i] + letterSpacing;
  }
}

function fitAndWrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseFontSize: number,
  minFontSize: number,
  maxLines: number,
  fontTemplate: (size: number) => string,
  lineHeightMultiplier = 1.28
): WrappedTextResult {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) {
    return { lines: [], fontSize: baseFontSize, lineHeight: baseFontSize * lineHeightMultiplier };
  }

  for (let size = baseFontSize; size >= minFontSize; size -= 2) {
    ctx.font = fontTemplate(size);
    const words = clean.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    let exceededWord = false;

    for (const word of words) {
      if (ctx.measureText(word).width > maxWidth) {
        exceededWord = true;
        break;
      }
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    if (!exceededWord && lines.length <= maxLines) {
      if (lines.length === 2 && words.length >= 4) {
        const lastLineWords = lines[1].split(' ');
        if (lastLineWords.length === 1) {
          const line1Words = lines[0].split(' ');
          if (line1Words.length >= 3) {
            const moved = line1Words.pop()!;
            const balanced1 = line1Words.join(' ');
            const balanced2 = `${moved} ${lines[1]}`;
            if (
              ctx.measureText(balanced1).width <= maxWidth &&
              ctx.measureText(balanced2).width <= maxWidth
            ) {
              return {
                lines: [balanced1, balanced2],
                fontSize: size,
                lineHeight: Math.round(size * lineHeightMultiplier),
              };
            }
          }
        }
      }
      return {
        lines,
        fontSize: size,
        lineHeight: Math.round(size * lineHeightMultiplier),
      };
    }
  }

  ctx.font = fontTemplate(minFontSize);
  const words = clean.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
  }
  return {
    lines,
    fontSize: minFontSize,
    lineHeight: Math.round(minFontSize * lineHeightMultiplier),
  };
}

/**
 * Draws a crisp, bespoke vector emblem matched to each of the 6 themes.
 */
function drawThemeEmblem(
  ctx: CanvasRenderingContext2D,
  themeId: string,
  cx: number,
  cy: number,
  scale: number,
  color: string,
  highlightColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (themeId === 'royal-prince') {
    // 3-point Royal Crown
    ctx.beginPath();
    ctx.moveTo(-22, 10);
    ctx.lineTo(-26, -10);
    ctx.lineTo(-10, 0);
    ctx.lineTo(0, -16);
    ctx.lineTo(10, 0);
    ctx.lineTo(26, -10);
    ctx.lineTo(22, 10);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-22, 15);
    ctx.lineTo(22, 15);
    ctx.stroke();

    ctx.fillStyle = highlightColor;
    for (const [jx, jy] of [
      [-26, -13],
      [0, -19],
      [26, -13],
    ]) {
      ctx.beginPath();
      ctx.arc(jx, jy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (themeId === 'palace-princess') {
    // Arched Princess Tiara
    ctx.beginPath();
    ctx.moveTo(-26, 12);
    ctx.quadraticCurveTo(-18, -4, -10, 4);
    ctx.quadraticCurveTo(-5, -14, 0, -17);
    ctx.quadraticCurveTo(5, -14, 10, 4);
    ctx.quadraticCurveTo(18, -4, 26, 12);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(4.5, -3);
    ctx.lineTo(0, 4);
    ctx.lineTo(-4.5, -3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -21, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (themeId === 'grand-prix-racer') {
    // Racing Trophy & Checkered Accent
    ctx.beginPath();
    ctx.moveTo(-14, -13);
    ctx.lineTo(14, -13);
    ctx.lineTo(11, 2);
    ctx.quadraticCurveTo(0, 11, 0, 11);
    ctx.quadraticCurveTo(0, 11, -11, 2);
    ctx.closePath();
    ctx.stroke();

    // Handles
    ctx.beginPath();
    ctx.moveTo(-14, -9);
    ctx.quadraticCurveTo(-23, -8, -19, 0);
    ctx.quadraticCurveTo(-15, 3, -11, 1);
    ctx.moveTo(14, -9);
    ctx.quadraticCurveTo(23, -8, 19, 0);
    ctx.quadraticCurveTo(15, 3, 11, 1);
    ctx.stroke();

    // Stem & Base
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.lineTo(0, 17);
    ctx.moveTo(-10, 17);
    ctx.lineTo(10, 17);
    ctx.stroke();

    // Center star
    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(0, -5, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (themeId === 'cosmic-astronaut') {
    // Ringed Planet + Four-Point Stars
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(-0.35);
    ctx.strokeStyle = highlightColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Small 4-point star top right
    const drawStar = (sx: number, sy: number, r: number) => {
      ctx.fillStyle = highlightColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.lineTo(sx + r * 0.3, sy - r * 0.3);
      ctx.lineTo(sx + r, sy);
      ctx.lineTo(sx + r * 0.3, sy + r * 0.3);
      ctx.lineTo(sx, sy + r);
      ctx.lineTo(sx - r * 0.3, sy + r * 0.3);
      ctx.lineTo(sx - r, sy);
      ctx.lineTo(sx - r * 0.3, sy - r * 0.3);
      ctx.closePath();
      ctx.fill();
    };
    drawStar(22, -14, 6);
    drawStar(-23, 12, 4.5);
  } else if (themeId === 'ocean-mermaid') {
    // Scallop Seashell with Luminous Pearl
    ctx.beginPath();
    ctx.arc(0, 5, 19, Math.PI, 0, false);
    ctx.lineTo(9, 14);
    ctx.lineTo(-9, 14);
    ctx.closePath();
    ctx.stroke();

    for (const angle of [-0.55, 0, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(Math.sin(angle) * 18, 5 - Math.cos(angle) * 17);
      ctx.stroke();
    }

    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(0, 1, 4.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Wonderland Bunny Ears & Storybook Sparkle
    ctx.beginPath();
    ctx.ellipse(-8, -4, 5.5, 15, -0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(8, -4, 5.5, 15, 0.18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(0, 14, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws a custom theme-matched ornamental divider rule.
 */
function drawThemeDivider(
  ctx: CanvasRenderingContext2D,
  themeId: string,
  cx: number,
  y: number,
  halfWidth: number,
  lineColor: string,
  accentColor: string,
  brightColor: string
) {
  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.fillStyle = accentColor;
  ctx.lineWidth = 1.6;

  if (themeId === 'grand-prix-racer') {
    // Sleek speed rules + centered micro checkered flag motif
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, y);
    ctx.lineTo(cx - 44, y);
    ctx.moveTo(cx + 44, y);
    ctx.lineTo(cx + halfWidth, y);
    ctx.stroke();

    const sq = 6;
    const startX = cx - 30;
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 2; row++) {
        ctx.fillStyle = (col + row) % 2 === 0 ? accentColor : brightColor;
        ctx.globalAlpha *= 0.92;
        ctx.fillRect(startX + col * sq, y - sq + row * sq, sq, sq);
      }
    }
  } else if (themeId === 'ocean-mermaid') {
    // Flowing gentle ocean wave + pearl center
    ctx.beginPath();
    for (let dx = -halfWidth; dx <= -18; dx += 4) {
      const wy = y + Math.sin(dx * 0.08) * 3.2;
      if (dx === -halfWidth) ctx.moveTo(cx + dx, wy);
      else ctx.lineTo(cx + dx, wy);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let dx = 18; dx <= halfWidth; dx += 4) {
      const wy = y + Math.sin(dx * 0.08) * 3.2;
      if (dx === 18) ctx.moveTo(cx + dx, wy);
      else ctx.lineTo(cx + dx, wy);
    }
    ctx.stroke();

    ctx.fillStyle = brightColor;
    ctx.beginPath();
    ctx.arc(cx, y, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (themeId === 'cosmic-astronaut') {
    // Constellation line + 4-point starlight center
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, y);
    ctx.lineTo(cx - 18, y);
    ctx.moveTo(cx + 18, y);
    ctx.lineTo(cx + halfWidth, y);
    ctx.stroke();

    ctx.fillStyle = brightColor;
    ctx.beginPath();
    ctx.moveTo(cx, y - 9);
    ctx.lineTo(cx + 3, y - 3);
    ctx.lineTo(cx + 9, y);
    ctx.lineTo(cx + 3, y + 3);
    ctx.lineTo(cx, y + 9);
    ctx.lineTo(cx - 3, y + 3);
    ctx.lineTo(cx - 9, y);
    ctx.lineTo(cx - 3, y - 3);
    ctx.closePath();
    ctx.fill();

    for (const dx of [-halfWidth, halfWidth]) {
      ctx.beginPath();
      ctx.arc(cx + dx, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Royal / Princess / Wonderland diamond filigree divider
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, y);
    ctx.lineTo(cx - 18, y);
    ctx.moveTo(cx + 18, y);
    ctx.lineTo(cx + halfWidth, y);
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(cx, y - 7);
    ctx.lineTo(cx + 7, y);
    ctx.lineTo(cx, y + 7);
    ctx.lineTo(cx - 7, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = brightColor;
    for (const dx of [-14, 14]) {
      ctx.beginPath();
      ctx.arc(cx + dx, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Theme-tailored architectural corner ornaments & ambient texture inside cards.
 */
function drawThemeAmbientMotifs(
  ctx: CanvasRenderingContext2D,
  themeId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  accentColor: string,
  brightColor: string,
  isIvory: boolean
) {
  ctx.save();
  const baseAlpha = isIvory ? 0.24 : 0.34;

  if (themeId === 'cosmic-astronaut') {
    const stars = [
      [x + 76, y + 72, 7],
      [x + w - 76, y + 78, 6],
      [x + 115, y + 135, 3.5],
      [x + w - 122, y + 128, 3.5],
      [x + 84, y + h - 78, 5],
      [x + w - 84, y + h - 74, 6],
    ];
    ctx.fillStyle = brightColor;
    for (const [sx, sy, r] of stars) {
      ctx.globalAlpha = baseAlpha + 0.15;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.lineTo(sx + r * 0.28, sy - r * 0.28);
      ctx.lineTo(sx + r, sy);
      ctx.lineTo(sx + r * 0.28, sy + r * 0.28);
      ctx.lineTo(sx, sy + r);
      ctx.lineTo(sx - r * 0.28, sy + r * 0.28);
      ctx.lineTo(sx - r, sy);
      ctx.lineTo(sx - r * 0.28, sy - r * 0.28);
      ctx.closePath();
      ctx.fill();
    }
  } else if (themeId === 'ocean-mermaid') {
    const bubbles = [
      [x + 70, y + 85, 10],
      [x + 98, y + 60, 5],
      [x + w - 74, y + 88, 9],
      [x + w - 104, y + 64, 5],
      [x + 74, y + h - 72, 8],
      [x + w - 76, y + h - 76, 9],
    ];
    ctx.strokeStyle = brightColor;
    ctx.lineWidth = 1.6;
    for (const [bx, by, br] of bubbles) {
      ctx.globalAlpha = baseAlpha;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (themeId === 'grand-prix-racer') {
    // Micro racing checkered corner blocks
    ctx.globalAlpha = baseAlpha + 0.1;
    const sq = 7;
    for (const startX of [x + 42, x + w - 42 - sq * 4]) {
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 2; r++) {
          ctx.fillStyle = (c + r) % 2 === 0 ? accentColor : brightColor;
          ctx.fillRect(startX + c * sq, y + 36 + r * sq, sq, sq);
        }
      }
    }
  } else {
    // Wonderland / Royal / Princess delicate sparkles
    const dots = [
      [x + 74, y + 74, 3.2],
      [x + w - 74, y + 74, 3.2],
      [x + 74, y + h - 74, 3.2],
      [x + w - 74, y + h - 74, 3.2],
    ];
    ctx.fillStyle = brightColor;
    for (const [dx, dy, dr] of dots) {
      ctx.globalAlpha = baseAlpha + 0.14;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCardCorners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  const inset = 28;
  const arm = 26;

  const corners = [
    { cx: x + inset, cy: y + inset, sx: 1, sy: 1 },
    { cx: x + w - inset, cy: y + inset, sx: -1, sy: 1 },
    { cx: x + inset, cy: y + h - inset, sx: 1, sy: -1 },
    { cx: x + w - inset, cy: y + h - inset, sx: -1, sy: -1 },
  ];

  for (const c of corners) {
    ctx.beginPath();
    ctx.moveTo(c.cx, c.cy + c.sy * arm);
    ctx.lineTo(c.cx, c.cy);
    ctx.lineTo(c.cx + c.sx * arm, c.cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(c.cx + c.sx * 8, c.cy + c.sy * 8, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawIntroPlate(
  ctx: CanvasRenderingContext2D,
  config: InvitationConfig,
  theme: ThemePreset,
  alpha = 1
) {
  if (alpha <= 0.005) return;
  const fonts = getFontFaces(config.typographyStyle);
  const childName = config.childName.trim() || theme.defaultChildName;
  const milestone = config.milestone.trim() || theme.defaultMilestone;
  const displayName = fonts.nameUppercase ? childName.toUpperCase() : childName;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Measured top gradient scrim for effortless legibility over bright sky/palace
  const topGrad = ctx.createLinearGradient(0, 0, 0, 460);
  topGrad.addColorStop(0, 'rgba(6, 8, 18, 0.92)');
  topGrad.addColorStop(0.58, 'rgba(6, 8, 18, 0.62)');
  topGrad.addColorStop(1, 'rgba(6, 8, 18, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, HD_WIDTH, 460);

  // Subtle luminous theme halo behind opening emblem
  const halo = ctx.createRadialGradient(HD_WIDTH / 2, 138, 12, HD_WIDTH / 2, 138, 360);
  halo.addColorStop(0, theme.palette.accentSoft);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(120, 0, 840, 340);

  // Theme Emblem at top
  drawThemeEmblem(
    ctx,
    theme.id,
    HD_WIDTH / 2,
    72,
    1.0,
    theme.palette.accent,
    theme.palette.accentBright
  );

  // Theme-specific Opening Kicker
  ctx.fillStyle = theme.palette.accentBright;
  ctx.font = `700 22px ${fonts.labelFont}`;
  ctx.textBaseline = 'alphabetic';
  drawTrackedCenteredText(ctx, theme.wording.openingKicker, HD_WIDTH / 2, 128, 4.8);

  // Highlighted Bold Child Name with crisp dark halo + luminous 3-stop theme gradient
  const fittedName = fitAndWrapText(
    ctx,
    displayName,
    880,
    88,
    50,
    1,
    (size) => `${fonts.nameWeight} ${size}px ${fonts.nameFont}`,
    1.15
  );

  ctx.font = `${fonts.nameWeight} ${fittedName.fontSize}px ${fonts.nameFont}`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(5, 7, 16, 0.82)';
  ctx.lineWidth = 7.5;
  if (fonts.nameUppercase) {
    const text = fittedName.lines[0] ?? '';
    const chars = Array.from(text);
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalW = widths.reduce((s, w) => s + w, 0) + 6 * Math.max(0, chars.length - 1);
    let cx = HD_WIDTH / 2 - totalW / 2;
    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      ctx.strokeText(chars[i], cx, 212);
      cx += widths[i] + 6;
    }
  } else {
    ctx.textAlign = 'center';
    ctx.strokeText(fittedName.lines[0] ?? '', HD_WIDTH / 2, 212);
  }

  ctx.shadowColor = theme.palette.accentSoft;
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 4;

  const nameGrad = ctx.createLinearGradient(0, 145, 0, 226);
  nameGrad.addColorStop(0, '#FFFFFF');
  nameGrad.addColorStop(0.5, theme.palette.accentBright);
  nameGrad.addColorStop(1, theme.palette.accent);
  ctx.fillStyle = nameGrad;
  if (fonts.nameUppercase) {
    drawTrackedCenteredText(ctx, fittedName.lines[0] ?? '', HD_WIDTH / 2, 212, 6);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(fittedName.lines[0] ?? '', HD_WIDTH / 2, 212);
  }

  // Bold Milestone subtitle with dark outline & bright theme color
  const fittedMilestone = fitAndWrapText(
    ctx,
    milestone,
    820,
    38,
    25,
    1,
    (size) => `${fonts.milestoneStyle} ${size}px ${fonts.milestoneFont}`
  );
  ctx.font = `${fonts.milestoneStyle} ${fittedMilestone.fontSize}px ${fonts.milestoneFont}`;
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(5, 7, 16, 0.72)';
  ctx.lineWidth = 4.5;
  ctx.strokeText(fittedMilestone.lines[0] ?? '', HD_WIDTH / 2, 265);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = theme.palette.accentBright;
  ctx.fillText(fittedMilestone.lines[0] ?? '', HD_WIDTH / 2, 265);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  drawThemeDivider(
    ctx,
    theme.id,
    HD_WIDTH / 2,
    298,
    195,
    theme.palette.accentSoft,
    theme.palette.accent,
    theme.palette.accentBright
  );

  ctx.restore();
}

export function drawCrestPlate(
  ctx: CanvasRenderingContext2D,
  config: InvitationConfig,
  theme: ThemePreset,
  alpha = 1
) {
  if (alpha <= 0.005) return;
  const fonts = getFontFaces(config.typographyStyle);
  const childName = (config.childName.trim() || theme.defaultChildName).toUpperCase();
  const milestone = (config.milestone.trim() || theme.defaultMilestone).toUpperCase();

  ctx.save();
  ctx.globalAlpha = alpha;

  const topGrad = ctx.createLinearGradient(0, 0, 0, 235);
  topGrad.addColorStop(0, 'rgba(7, 9, 18, 0.80)');
  topGrad.addColorStop(0.55, 'rgba(7, 9, 18, 0.36)');
  topGrad.addColorStop(1, 'rgba(7, 9, 18, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, HD_WIDTH, 235);

  // Refined translucent theme crest plaque
  const pillW = 680;
  const pillH = 92;
  const pillX = (HD_WIDTH - pillW) / 2;
  const pillY = 34;

  ctx.save();
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 24);
  ctx.fillStyle = theme.palette.darkSurface;
  ctx.fill();
  ctx.strokeStyle = theme.palette.accent;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = theme.palette.accent;
  ctx.font = `700 16px ${fonts.labelFont}`;
  drawTrackedCenteredText(ctx, theme.wording.crestBadge, HD_WIDTH / 2, 68, 4.4);

  const label = `${childName}  ·  ${milestone}`;
  const fitted = fitAndWrapText(
    ctx,
    label,
    pillW - 60,
    26,
    18,
    1,
    (size) => `700 ${size}px ${fonts.labelFont}`
  );

  ctx.fillStyle = theme.palette.accentBright;
  ctx.font = `700 ${fitted.fontSize}px ${fonts.labelFont}`;
  drawTrackedCenteredText(ctx, fitted.lines[0] ?? '', HD_WIDTH / 2, 106, 4.2);

  ctx.restore();
}

export function drawDetailsCardPlate(
  ctx: CanvasRenderingContext2D,
  config: InvitationConfig,
  theme: ThemePreset,
  alpha = 1,
  compactMode = false
) {
  if (alpha <= 0.005) return;
  const fonts = getFontFaces(config.typographyStyle);
  const isIvory = config.cardSurface === 'ivory';

  const outerBorder = isIvory ? theme.palette.ivoryBorder : theme.palette.accent;
  const innerBorder = isIvory ? 'rgba(24, 24, 27, 0.12)' : theme.palette.darkBorder;
  const accentColor = isIvory ? theme.palette.ivoryAccent : theme.palette.accent;
  const highlightColor = isIvory ? theme.palette.ivoryAccent : theme.palette.accentBright;
  const primaryText = isIvory ? '#18181B' : '#FFFFFF';
  const secondaryText = isIvory ? '#27272A' : '#FFFFFF';
  const labelText = isIvory ? theme.palette.ivoryAccent : theme.palette.accent;
  const dividerColor = isIvory ? 'rgba(24, 24, 27, 0.16)' : theme.palette.accentSoft;

  const childName = config.childName.trim() || theme.defaultChildName;
  const milestone = config.milestone.trim() || theme.defaultMilestone;
  const dateLine = [config.dateText.trim(), config.timeText.trim()]
    .filter(Boolean)
    .join('  ·  ');
  const venue = config.venue.trim() || 'Venue to be announced';
  const parents = config.parentsName.trim() || 'Family & Loved Ones';
  const hostPrefix = (config.hostPrefix.trim() || 'Hosted with love by').toUpperCase();

  ctx.save();
  ctx.globalAlpha = alpha;

  const cardX = 64;
  const cardW = HD_WIDTH - 128; // 952px
  const cardY = compactMode ? 1336 : 1140;
  const cardH = compactMode ? 520 : 716;
  const innerMaxW = cardW - 128; // 824px safe text width
  const cx = HD_WIDTH / 2;

  // Measured bottom ambient scrim
  const bottomScrim = ctx.createLinearGradient(0, cardY - 140, 0, HD_HEIGHT);
  bottomScrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomScrim.addColorStop(1, 'rgba(0, 0, 0, 0.56)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, cardY - 140, HD_WIDTH, HD_HEIGHT - (cardY - 140));

  // 3D Extruded Bottom Lip / Bevel Shadow for physical 3D plaque depth
  ctx.save();
  drawRoundedRect(ctx, cardX, cardY + 10, cardW, cardH, 32);
  ctx.fillStyle = isIvory ? 'rgba(120, 113, 108, 0.55)' : 'rgba(5, 4, 12, 0.92)';
  ctx.fill();
  ctx.restore();

  // Luminous 3D card backdrop
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.62)';
  ctx.shadowBlur = 54;
  ctx.shadowOffsetY = 20;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);

  if (isIvory) {
    const ivoryGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    ivoryGrad.addColorStop(0, 'rgba(255, 253, 249, 0.98)');
    ivoryGrad.addColorStop(1, 'rgba(245, 239, 228, 0.96)');
    ctx.fillStyle = ivoryGrad;
  } else {
    const darkGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    darkGrad.addColorStop(0, theme.palette.darkSurfaceTop);
    darkGrad.addColorStop(1, theme.palette.darkSurface);
    ctx.fillStyle = darkGrad;
  }
  ctx.fill();
  ctx.restore();

  // Subtle top theme highlight glow + 3D top specular sheen inside card
  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.clip();
  const innerGlow = ctx.createRadialGradient(cx, cardY + 60, 10, cx, cardY + 60, 440);
  innerGlow.addColorStop(0, isIvory ? 'rgba(0,0,0,0.03)' : theme.palette.accentSoft);
  innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = innerGlow;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Top 3D bevel highlight edge
  const topSheen = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  topSheen.addColorStop(0, 'rgba(255,255,255,0)');
  topSheen.addColorStop(0.5, isIvory ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.42)');
  topSheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topSheen;
  ctx.fillRect(cardX + 32, cardY + 1, cardW - 64, 3);
  ctx.restore();

  // Outer & inset hairline borders + theme corners + ambient theme motifs
  ctx.strokeStyle = outerBorder;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.stroke();

  ctx.strokeStyle = innerBorder;
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, cardX + 14, cardY + 14, cardW - 28, cardH - 28, 22);
  ctx.stroke();

  drawCardCorners(ctx, cardX, cardY, cardW, cardH, accentColor);
  drawThemeAmbientMotifs(
    ctx,
    theme.id,
    cardX,
    cardY,
    cardW,
    cardH,
    accentColor,
    highlightColor,
    isIvory
  );

  ctx.textBaseline = 'alphabetic';

  // Pre-measure wrapped lines so the entire block is mathematically centered inside the card!
  const displayName = fonts.nameUppercase ? childName.toUpperCase() : childName;
  const fittedName = fitAndWrapText(
    ctx,
    displayName,
    innerMaxW,
    68,
    42,
    1,
    (size) => `${fonts.nameWeight} ${size}px ${fonts.nameFont}`
  );
  const fittedMilestone = fitAndWrapText(
    ctx,
    milestone,
    innerMaxW,
    33,
    23,
    1,
    (size) => `${fonts.milestoneStyle} ${size}px ${fonts.milestoneFont}`
  );
  const fittedDate = fitAndWrapText(
    ctx,
    dateLine || 'Date to be announced',
    innerMaxW,
    32,
    22,
    1,
    (size) => `700 ${size}px ${fonts.bodyFont}`
  );
  const fittedVenue = fitAndWrapText(
    ctx,
    venue,
    innerMaxW,
    29,
    21,
    2,
    (size) => `700 ${size}px ${fonts.bodyFont}`,
    1.3
  );
  const fittedParents = fitAndWrapText(
    ctx,
    parents,
    innerMaxW,
    35,
    23,
    2,
    (size) => `${fonts.parentsStyle} ${size}px ${fonts.parentsFont}`,
    1.26
  );

  const venueLinesCount = Math.max(1, fittedVenue.lines.length);
  const parentsLinesCount = Math.max(1, fittedParents.lines.length);

  if (!compactMode) {
    const hEmblem = 34;
    const hKicker = 22;
    const hName = fittedName.fontSize * 0.9;
    const hMilestone = fittedMilestone.fontSize * 0.9;
    const hDivider = 16;
    const hDateBlock = 18 + 34;
    const hVenueBlock = 18 + venueLinesCount * fittedVenue.lineHeight;
    const hRule = 10;
    const hParentsBlock = 18 + parentsLinesCount * fittedParents.lineHeight;

    const gaps = 26 + 56 + 40 + 26 + 42 + 44 + 34 + 34;
    const totalContentHeight =
      hEmblem +
      hKicker +
      hName +
      hMilestone +
      hDivider +
      hDateBlock +
      hVenueBlock +
      hRule +
      hParentsBlock +
      gaps -
      140;

    let cursorY = cardY + Math.max(58, Math.round((cardH - totalContentHeight) / 2)) - 42;

    // 1. Theme Emblem
    drawThemeEmblem(ctx, theme.id, cx, cursorY, 0.88, accentColor, highlightColor);
    cursorY += 44;

    // 2. Theme-Specific Kicker
    ctx.fillStyle = highlightColor;
    ctx.font = `700 19px ${fonts.labelFont}`;
    drawTrackedCenteredText(ctx, theme.wording.detailsKicker, cx, cursorY, 4.4);
    cursorY += 64;

    // 3. Bold Highlighted Child Name in Theme Gradient
    if (isIvory) {
      ctx.fillStyle = theme.palette.ivoryAccent;
    } else {
      const nameGrad = ctx.createLinearGradient(0, cursorY - 52, 0, cursorY + 10);
      nameGrad.addColorStop(0, '#FFFFFF');
      nameGrad.addColorStop(0.6, highlightColor);
      nameGrad.addColorStop(1, accentColor);
      ctx.fillStyle = nameGrad;
    }
    ctx.font = `${fonts.nameWeight} ${fittedName.fontSize}px ${fonts.nameFont}`;
    if (fonts.nameUppercase) {
      drawTrackedCenteredText(ctx, fittedName.lines[0] ?? '', cx, cursorY, 5);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(fittedName.lines[0] ?? '', cx, cursorY);
    }
    cursorY += 44;

    // 4. Bold Milestone in Theme Color
    ctx.fillStyle = highlightColor;
    ctx.font = `${fonts.milestoneStyle} ${fittedMilestone.fontSize}px ${fonts.milestoneFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(fittedMilestone.lines[0] ?? '', cx, cursorY);
    cursorY += 28;

    // 5. Theme Divider
    drawThemeDivider(
      ctx,
      theme.id,
      cx,
      cursorY,
      175,
      dividerColor,
      accentColor,
      highlightColor
    );
    cursorY += 44;

    // 6. Date & Time inside bold theme-colored highlight plaque
    ctx.fillStyle = labelText;
    ctx.font = `700 17px ${fonts.labelFont}`;
    drawTrackedCenteredText(ctx, 'DATE & TIME', cx, cursorY, 4);
    cursorY += 36;

    ctx.font = `700 ${fittedDate.fontSize}px ${fonts.bodyFont}`;
    const dateTextStr = fittedDate.lines[0] ?? '';
    const dateChipW = Math.min(innerMaxW, Math.max(380, ctx.measureText(dateTextStr).width + 68));
    ctx.save();
    drawRoundedRect(ctx, cx - dateChipW / 2, cursorY - 35, dateChipW, 50, 16);
    ctx.fillStyle = isIvory ? 'rgba(24, 24, 27, 0.06)' : theme.palette.accentSoft;
    ctx.fill();
    ctx.strokeStyle = outerBorder;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = primaryText;
    ctx.textAlign = 'center';
    ctx.fillText(dateTextStr, cx, cursorY);
    cursorY += 50;

    // 7. Venue
    ctx.fillStyle = labelText;
    ctx.font = `700 17px ${fonts.labelFont}`;
    drawTrackedCenteredText(ctx, 'VENUE', cx, cursorY, 4);
    cursorY += 34;

    ctx.fillStyle = secondaryText;
    ctx.font = `700 ${fittedVenue.fontSize}px ${fonts.bodyFont}`;
    ctx.textAlign = 'center';
    fittedVenue.lines.forEach((line, idx) => {
      ctx.fillText(line, cx, cursorY + idx * fittedVenue.lineHeight);
    });
    cursorY += venueLinesCount * fittedVenue.lineHeight + 12;

    // 8. Subtle Theme Hairline before Parents
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 190, cursorY);
    ctx.lineTo(cx + 190, cursorY);
    ctx.stroke();
    cursorY += 36;

    // 9. Parents' Names in radiant theme color
    ctx.fillStyle = labelText;
    ctx.font = `700 16px ${fonts.labelFont}`;
    drawTrackedCenteredText(ctx, hostPrefix, cx, cursorY, 3.8);
    cursorY += 38;

    ctx.fillStyle = highlightColor;
    ctx.font = `${fonts.parentsStyle} ${fittedParents.fontSize}px ${fonts.parentsFont}`;
    ctx.textAlign = 'center';
    fittedParents.lines.forEach((line, idx) => {
      ctx.fillText(line, cx, cursorY + idx * fittedParents.lineHeight);
    });
  } else {
    // COMPACT ALWAYS-VISIBLE LOWER CARD (y = 1336 to 1856)
    const contentH =
      34 +
      36 +
      46 +
      34 +
      venueLinesCount * fittedVenue.lineHeight +
      16 +
      36 +
      38 +
      (parentsLinesCount - 1) * fittedParents.lineHeight;
    let cursorY = cardY + Math.max(54, Math.round((cardH - contentH) / 2)) + 12;

    ctx.fillStyle = labelText;
    ctx.font = `700 17px ${fonts.labelFont}`;
    drawTrackedCenteredText(ctx, 'DATE & TIME', cx, cursorY, 4);
    cursorY += 36;

    ctx.font = `700 ${fittedDate.fontSize}px ${fonts.bodyFont}`;
    const dateTextStr = fittedDate.lines[0] ?? '';
    const dateChipW = Math.min(innerMaxW, Math.max(380, ctx.measureText(dateTextStr).width + 64));
    ctx.save();
    drawRoundedRect(ctx, cx - dateChipW / 2, cursorY - 34, dateChipW, 48, 16);
    ctx.fillStyle = isIvory ? 'rgba(24, 24, 27, 0.06)' : theme.palette.accentSoft;
    ctx.fill();
    ctx.strokeStyle = outerBorder;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = primaryText;
    ctx.textAlign = 'center';
    ctx.fillText(dateTextStr, cx, cursorY);
    cursorY += 48;

    ctx.fillStyle = labelText;
    ctx.font = `700 17px ${fonts.labelFont}`;
    drawTrackedCenteredText(ctx, 'VENUE', cx, cursorY, 4);
    cursorY += 34;

    ctx.fillStyle = secondaryText;
    ctx.font = `700 ${fittedVenue.fontSize}px ${fonts.bodyFont}`;
    ctx.textAlign = 'center';
    fittedVenue.lines.forEach((line, idx) => {
      ctx.fillText(line, cx, cursorY + idx * fittedVenue.lineHeight);
    });
    cursorY += venueLinesCount * fittedVenue.lineHeight + 14;

    drawThemeDivider(
      ctx,
      theme.id,
      cx,
      cursorY,
      140,
      dividerColor,
      accentColor,
      highlightColor
    );
    cursorY += 38;

    ctx.fillStyle = labelText;
    ctx.font = `700 16px ${fonts.labelFont}`;
    drawTrackedCenteredText(ctx, hostPrefix, cx, cursorY, 3.8);
    cursorY += 38;

    ctx.fillStyle = highlightColor;
    ctx.font = `${fonts.parentsStyle} ${fittedParents.fontSize}px ${fonts.parentsFont}`;
    ctx.textAlign = 'center';
    fittedParents.lines.forEach((line, idx) => {
      ctx.fillText(line, cx, cursorY + idx * fittedParents.lineHeight);
    });
  }

  ctx.restore();
}

export function drawTopHeaderForAlwaysMode(
  ctx: CanvasRenderingContext2D,
  config: InvitationConfig,
  theme: ThemePreset,
  alpha = 1
) {
  if (alpha <= 0.005) return;
  const fonts = getFontFaces(config.typographyStyle);
  const childName = config.childName.trim() || theme.defaultChildName;
  const milestone = config.milestone.trim() || theme.defaultMilestone;
  const displayName = fonts.nameUppercase ? childName.toUpperCase() : childName;

  ctx.save();
  ctx.globalAlpha = alpha;

  const topGrad = ctx.createLinearGradient(0, 0, 0, 340);
  topGrad.addColorStop(0, 'rgba(7, 9, 18, 0.88)');
  topGrad.addColorStop(0.58, 'rgba(7, 9, 18, 0.5)');
  topGrad.addColorStop(1, 'rgba(7, 9, 18, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, HD_WIDTH, 340);

  drawThemeEmblem(
    ctx,
    theme.id,
    HD_WIDTH / 2,
    60,
    0.78,
    theme.palette.accent,
    theme.palette.accentBright
  );

  ctx.fillStyle = theme.palette.accentBright;
  ctx.font = `600 18px ${fonts.labelFont}`;
  drawTrackedCenteredText(ctx, theme.wording.crestBadge, HD_WIDTH / 2, 104, 4.6);

  const fittedName = fitAndWrapText(
    ctx,
    displayName,
    880,
    70,
    42,
    1,
    (size) => `${fonts.nameWeight} ${size}px ${fonts.nameFont}`
  );
  ctx.font = `${fonts.nameWeight} ${fittedName.fontSize}px ${fonts.nameFont}`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(5, 7, 16, 0.8)';
  ctx.lineWidth = 6;
  if (fonts.nameUppercase) {
    const text = fittedName.lines[0] ?? '';
    const chars = Array.from(text);
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalW = widths.reduce((s, w) => s + w, 0) + 5 * Math.max(0, chars.length - 1);
    let cx = HD_WIDTH / 2 - totalW / 2;
    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      ctx.strokeText(chars[i], cx, 172);
      cx += widths[i] + 5;
    }
  } else {
    ctx.textAlign = 'center';
    ctx.strokeText(fittedName.lines[0] ?? '', HD_WIDTH / 2, 172);
  }

  ctx.shadowColor = theme.palette.accentSoft;
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 4;

  const nameGrad = ctx.createLinearGradient(0, 120, 0, 188);
  nameGrad.addColorStop(0, '#FFFFFF');
  nameGrad.addColorStop(0.55, theme.palette.accentBright);
  nameGrad.addColorStop(1, theme.palette.accent);
  ctx.fillStyle = nameGrad;
  if (fonts.nameUppercase) {
    drawTrackedCenteredText(ctx, fittedName.lines[0] ?? '', HD_WIDTH / 2, 172, 5);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(fittedName.lines[0] ?? '', HD_WIDTH / 2, 172);
  }

  ctx.shadowBlur = 10;
  ctx.fillStyle = theme.palette.accentBright;
  const fittedMilestone = fitAndWrapText(
    ctx,
    milestone,
    820,
    31,
    22,
    1,
    (size) => `${fonts.milestoneStyle} ${size}px ${fonts.milestoneFont}`
  );
  ctx.font = `${fonts.milestoneStyle} ${fittedMilestone.fontSize}px ${fonts.milestoneFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(fittedMilestone.lines[0] ?? '', HD_WIDTH / 2, 220);

  ctx.shadowBlur = 0;
  drawThemeDivider(
    ctx,
    theme.id,
    HD_WIDTH / 2,
    248,
    140,
    theme.palette.accentSoft,
    theme.palette.accent,
    theme.palette.accentBright
  );

  ctx.restore();
}

function computeFadeAlpha(
  time: number,
  start: number,
  end: number,
  fadeIn: number,
  fadeOut: number
): number {
  if (time < start || time > end) return 0;
  let alpha = 1;
  if (fadeIn > 0 && time - start < fadeIn) {
    alpha = Math.min(alpha, (time - start) / fadeIn);
  }
  if (fadeOut > 0 && end - time < fadeOut) {
    alpha = Math.min(alpha, (end - time) / fadeOut);
  }
  return Math.max(0, Math.min(1, alpha));
}

export function getTimelineWindows(duration: number, timingMode: InvitationConfig['timingMode']) {
  const safeDuration = Math.max(20, duration);
  const detailsDuration = Math.min(14, safeDuration * 0.35);
  const detailsStart = Number((safeDuration - detailsDuration).toFixed(2));

  if (timingMode === 'always') {
    return {
      mode: 'always' as const,
      fullStart: 0.25,
      fullEnd: safeDuration,
      detailsStart,
    };
  }

  if (timingMode === 'finale') {
    return {
      mode: 'finale' as const,
      detailsStart: Number((safeDuration - 13).toFixed(2)),
      detailsEnd: safeDuration,
    };
  }

  return {
    mode: 'chapters' as const,
    introStart: 0.35,
    introEnd: 6.4,
    crestStart: 6.7,
    crestEnd: Number((detailsStart - 0.3).toFixed(2)),
    detailsStart,
    detailsEnd: safeDuration,
  };
}

export function renderLiveVideoOverlay(
  ctx: CanvasRenderingContext2D,
  currentTime: number,
  duration: number,
  config: InvitationConfig,
  theme: ThemePreset
) {
  ctx.clearRect(0, 0, HD_WIDTH, HD_HEIGHT);
  const windows = getTimelineWindows(duration, config.timingMode);

  if (windows.mode === 'always') {
    const a = computeFadeAlpha(currentTime, windows.fullStart, windows.fullEnd, 0.5, 0);
    drawTopHeaderForAlwaysMode(ctx, config, theme, a);
    drawDetailsCardPlate(ctx, config, theme, a, true);
    return;
  }

  if (windows.mode === 'finale') {
    const a = computeFadeAlpha(currentTime, windows.detailsStart, windows.detailsEnd, 0.7, 0);
    drawDetailsCardPlate(ctx, config, theme, a, false);
    return;
  }

  const introAlpha = computeFadeAlpha(currentTime, windows.introStart, windows.introEnd, 0.55, 0.55);
  const crestAlpha = computeFadeAlpha(currentTime, windows.crestStart, windows.crestEnd, 0.5, 0.5);
  const detailsAlpha = computeFadeAlpha(currentTime, windows.detailsStart, windows.detailsEnd, 0.65, 0);

  if (introAlpha > 0) drawIntroPlate(ctx, config, theme, introAlpha);
  if (crestAlpha > 0) drawCrestPlate(ctx, config, theme, crestAlpha);
  if (detailsAlpha > 0) drawDetailsCardPlate(ctx, config, theme, detailsAlpha, false);
}

export async function generateExportOverlayPlates(
  config: InvitationConfig,
  theme: ThemePreset,
  duration: number,
  targetWidth = HD_WIDTH,
  targetHeight = HD_HEIGHT
): Promise<OverlayPlateSpec[]> {
  await ensureFontsLoaded();

  const makePlateDataUrl = (drawFn: (ctx: CanvasRenderingContext2D) => void): string => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize 2D canvas context');
    ctx.scale(targetWidth / HD_WIDTH, targetHeight / HD_HEIGHT);
    drawFn(ctx);
    return canvas.toDataURL('image/png');
  };

  const windows = getTimelineWindows(duration, config.timingMode);

  if (windows.mode === 'always') {
    return [
      {
        id: 'full',
        startTime: windows.fullStart,
        endTime: windows.fullEnd,
        fadeIn: 0.5,
        fadeOut: 0,
        dataUrl: makePlateDataUrl((ctx) => {
          drawTopHeaderForAlwaysMode(ctx, config, theme, 1);
          drawDetailsCardPlate(ctx, config, theme, 1, true);
        }),
      },
    ];
  }

  if (windows.mode === 'finale') {
    return [
      {
        id: 'details',
        startTime: windows.detailsStart,
        endTime: windows.detailsEnd,
        fadeIn: 0.7,
        fadeOut: 0,
        dataUrl: makePlateDataUrl((ctx) => {
          drawDetailsCardPlate(ctx, config, theme, 1, false);
        }),
      },
    ];
  }

  return [
    {
      id: 'intro',
      startTime: windows.introStart,
      endTime: windows.introEnd,
      fadeIn: 0.55,
      fadeOut: 0.55,
      dataUrl: makePlateDataUrl((ctx) => drawIntroPlate(ctx, config, theme, 1)),
    },
    {
      id: 'crest',
      startTime: windows.crestStart,
      endTime: windows.crestEnd,
      fadeIn: 0.5,
      fadeOut: 0.5,
      dataUrl: makePlateDataUrl((ctx) => drawCrestPlate(ctx, config, theme, 1)),
    },
    {
      id: 'details',
      startTime: windows.detailsStart,
      endTime: windows.detailsEnd,
      fadeIn: 0.65,
      fadeOut: 0,
      dataUrl: makePlateDataUrl((ctx) => drawDetailsCardPlate(ctx, config, theme, 1, false)),
    },
  ];
}

export async function generateStillCardPng(
  videoEl: HTMLVideoElement | null,
  config: InvitationConfig,
  theme: ThemePreset
): Promise<string> {
  await ensureFontsLoaded();
  const canvas = document.createElement('canvas');
  canvas.width = HD_WIDTH;
  canvas.height = HD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, HD_WIDTH, HD_HEIGHT);

  if (videoEl && videoEl.readyState >= 2) {
    ctx.drawImage(videoEl, 0, 0, HD_WIDTH, HD_HEIGHT);
  }

  drawTopHeaderForAlwaysMode(ctx, config, theme, 1);
  drawDetailsCardPlate(ctx, config, theme, 1, false);

  return canvas.toDataURL('image/png');
}
