const STROKE_LOW = { r: 34, g: 197, b: 94 }; // green-500
const STROKE_MID = { r: 234, g: 179, b: 8 }; // yellow-500
const STROKE_HIGH = { r: 239, g: 68, b: 68 }; // red-500

const FILL_LOW = { r: 187, g: 247, b: 208 }; // green-200
const FILL_MID = { r: 254, g: 240, b: 138 }; // yellow-200
const FILL_HIGH = { r: 254, g: 202, b: 202 }; // red-200

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  t: number,
): string {
  return rgbToHex({
    r: lerp(from.r, to.r, t),
    g: lerp(from.g, to.g, t),
    b: lerp(from.b, to.b, t),
  });
}

export function scoreToNormalized(
  score: number,
  minScore: number,
  maxScore: number,
): number {
  const range = maxScore - minScore;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(1, (score - minScore) / range));
}

/** 녹(낮음) → 노랑 → 빨강(높음) 테두리 색 */
export function bedShortageIndexToColor(
  score: number,
  minScore = 0,
  maxScore = 100,
): string {
  const t = scoreToNormalized(score, minScore, maxScore);
  if (t < 0.5) return lerpRgb(STROKE_LOW, STROKE_MID, t * 2);
  return lerpRgb(STROKE_MID, STROKE_HIGH, (t - 0.5) * 2);
}

/** Choropleth 채움색 — 범례와 동일한 녹→노→빨 스케일 (밝은 톤) */
export function bedShortageIndexToFillColor(
  score: number,
  minScore = 0,
  maxScore = 100,
): string {
  const t = scoreToNormalized(score, minScore, maxScore);
  if (t < 0.5) return lerpRgb(FILL_LOW, FILL_MID, t * 2);
  return lerpRgb(FILL_MID, FILL_HIGH, (t - 0.5) * 2);
}

/** @deprecated bedShortageIndexToColor 사용 */
export function exclusionScoreToColor(
  score: number,
  minScore = 1,
  maxScore = 100,
): string {
  return bedShortageIndexToColor(score, minScore, maxScore);
}

export function getScoreRange(scores: number[]): { min: number; max: number } {
  if (scores.length === 0) return { min: 1, max: 100 };
  return { min: Math.min(...scores), max: Math.max(...scores) };
}
