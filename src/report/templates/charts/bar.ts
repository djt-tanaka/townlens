/** 水平バーチャート SVG 生成 */

export interface BarChartItem {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

export interface BarChartOptions {
  readonly width?: number;
  readonly barHeight?: number;
  readonly gap?: number;
  readonly showValues?: boolean;
  readonly labelWidth?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_BAR_HEIGHT = 22;
const DEFAULT_GAP = 10;
const DEFAULT_LABEL_WIDTH = 100;

/** 水平バーチャートSVGを生成 */
export function renderHorizontalBarChart(
  items: ReadonlyArray<BarChartItem>,
  options: BarChartOptions = {},
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const barHeight = options.barHeight ?? DEFAULT_BAR_HEIGHT;
  const gap = options.gap ?? DEFAULT_GAP;
  const showValues = options.showValues ?? true;
  const labelWidth = options.labelWidth ?? DEFAULT_LABEL_WIDTH;

  if (items.length === 0) {
    return "";
  }

  const barAreaWidth = width - labelWidth - 60;
  const totalHeight = items.length * (barHeight + gap) + 8;

  const parts: string[] = [];
  parts.push(`<svg viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`);

  // 背景グリッド
  for (const pct of [25, 50, 75, 100]) {
    const x = labelWidth + (barAreaWidth * pct) / 100;
    parts.push(`  <line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${totalHeight}" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>`);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const y = i * (barHeight + gap) + 4;
    const barW = Math.max(0, (barAreaWidth * Math.min(item.value, 100)) / 100);

    // ラベル
    parts.push(`  <text x="${labelWidth - 8}" y="${y + barHeight / 2 + 1}" text-anchor="end" dominant-baseline="central" font-size="12" font-weight="500" fill="#1e293b">${escapeXml(item.label)}</text>`);

    // バー背景
    parts.push(`  <rect x="${labelWidth}" y="${y}" width="${barAreaWidth}" height="${barHeight}" rx="${barHeight / 2}" fill="#f1f5f9"/>`);

    // バー本体
    if (barW > 0) {
      parts.push(`  <rect x="${labelWidth}" y="${y}" width="${barW.toFixed(1)}" height="${barHeight}" rx="${barHeight / 2}" fill="${item.color}" opacity="0.85"/>`);
    }

    // スコア値
    if (showValues) {
      const textX = labelWidth + barW + 8;
      parts.push(`  <text x="${textX.toFixed(1)}" y="${y + barHeight / 2 + 1}" dominant-baseline="central" font-size="12" font-weight="700" fill="${item.color}">${item.value.toFixed(1)}</text>`);
    }
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
