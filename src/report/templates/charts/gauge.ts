/** 半円スコアゲージ SVG 生成 */

export interface GaugeData {
  readonly score: number;
  readonly label?: string;
  readonly rank?: number;
  readonly totalCities?: number;
}

export interface GaugeOptions {
  readonly width?: number;
  readonly height?: number;
  readonly strokeWidth?: number;
}

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 130;
const DEFAULT_STROKE_WIDTH = 16;

/** スコアに応じたグラデーション色を取得 */
function scoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#f43f5e";
}

/** 半円ゲージSVGを生成 */
export function renderScoreGauge(
  data: GaugeData,
  options: GaugeOptions = {},
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const strokeW = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const score = Math.max(0, Math.min(100, data.score));

  const cx = width / 2;
  const cy = height - 20;
  const radius = Math.min(cx, cy) - strokeW / 2 - 4;

  // 半円アーク（左端180度 → 右端0度）
  const circumference = Math.PI * radius;
  const filledLength = (circumference * score) / 100;
  const color = scoreColor(score);

  // アークパス（半円）
  const startX = cx - radius;
  const startY = cy;
  const endX = cx + radius;
  const endY = cy;

  const parts: string[] = [];
  parts.push(`<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`);

  // 背景グラデーション定義
  parts.push(`  <defs>`);
  parts.push(`    <linearGradient id="gauge-bg" x1="0" y1="0" x2="1" y2="0">`);
  parts.push(`      <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.15"/>`);
  parts.push(`      <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.15"/>`);
  parts.push(`      <stop offset="100%" stop-color="#10b981" stop-opacity="0.15"/>`);
  parts.push(`    </linearGradient>`);
  parts.push(`  </defs>`);

  // 背景アーク
  parts.push(`  <path d="M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}" fill="none" stroke="url(#gauge-bg)" stroke-width="${strokeW}" stroke-linecap="round"/>`);

  // スコアアーク
  parts.push(`  <path d="M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${(circumference - filledLength).toFixed(1)}"/>`);

  // スコア数値
  parts.push(`  <text x="${cx}" y="${cy - 16}" text-anchor="middle" dominant-baseline="auto" font-size="36" font-weight="800" fill="${color}">${score.toFixed(1)}</text>`);

  // ラベル
  if (data.label) {
    parts.push(`  <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="11" fill="#64748b">${escapeXml(data.label)}</text>`);
  }

  // 順位
  if (data.rank != null && data.totalCities != null) {
    parts.push(`  <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b">${data.rank}\u4f4d / ${data.totalCities}\u5e02\u533a\u753a\u6751</text>`);
  }

  parts.push("</svg>");
  return parts.join("\n");
}

/** SVG用XMLエスケープ */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
