/** レーダーチャート SVG 生成 */

export interface RadarDataset {
  readonly name: string;
  readonly values: ReadonlyArray<number>;
  readonly color: string;
}

export interface RadarChartData {
  readonly labels: ReadonlyArray<string>;
  readonly datasets: ReadonlyArray<RadarDataset>;
  readonly categoryColors?: ReadonlyArray<string>;
}

export interface RadarChartOptions {
  readonly size?: number;
  readonly levels?: number;
  readonly showLabels?: boolean;
  readonly showLegend?: boolean;
}

const DEFAULT_SIZE = 360;
const DEFAULT_LEVELS = 5;

/** 角度計算（上向き開始、時計回り） */
function angle(index: number, total: number): number {
  return (Math.PI * 2 * index) / total - Math.PI / 2;
}

/** 極座標→直交座標 */
function polarToXY(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number,
): { readonly x: number; readonly y: number } {
  const a = angle(index, total);
  return {
    x: cx + radius * Math.cos(a),
    y: cy + radius * Math.sin(a),
  };
}

/** 多角形のポイント文字列を生成 */
function polygonPoints(
  cx: number,
  cy: number,
  radius: number,
  count: number,
): string {
  return Array.from({ length: count })
    .map((_, i) => {
      const p = polarToXY(cx, cy, radius, i, count);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

/** レーダーチャートSVGを生成 */
export function renderRadarChart(
  data: RadarChartData,
  options: RadarChartOptions = {},
): string {
  const size = options.size ?? DEFAULT_SIZE;
  const levels = options.levels ?? DEFAULT_LEVELS;
  const showLabels = options.showLabels ?? true;
  const showLegend = options.showLegend ?? true;
  const count = data.labels.length;

  if (count < 3) {
    return "";
  }

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;
  const legendHeight = showLegend ? 30 : 0;
  const totalHeight = size + legendHeight;

  const parts: string[] = [];

  parts.push(`<svg viewBox="0 0 ${size} ${totalHeight}" width="${size}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`);

  // 同心多角形グリッド
  for (let lv = 1; lv <= levels; lv++) {
    const r = (maxR * lv) / levels;
    const pts = polygonPoints(cx, cy, r, count);
    const opacity = lv === levels ? 0.3 : 0.15;
    parts.push(`  <polygon points="${pts}" fill="none" stroke="#94a3b8" stroke-width="0.8" opacity="${opacity}"/>`);
  }

  // 軸線
  for (let i = 0; i < count; i++) {
    const p = polarToXY(cx, cy, maxR, i, count);
    parts.push(`  <line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#cbd5e1" stroke-width="0.6"/>`);
  }

  // データポリゴン
  for (const ds of data.datasets) {
    const pts = ds.values
      .map((v, i) => {
        const r = (maxR * Math.min(v, 100)) / 100;
        const p = polarToXY(cx, cy, r, i, count);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");
    parts.push(`  <polygon points="${pts}" fill="${ds.color}" fill-opacity="0.15" stroke="${ds.color}" stroke-width="2.5"/>`);

    // データドット
    for (let i = 0; i < ds.values.length; i++) {
      const r = (maxR * Math.min(ds.values[i], 100)) / 100;
      const p = polarToXY(cx, cy, r, i, count);
      parts.push(`  <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${ds.color}"/>`);
    }
  }

  // 軸ラベル
  if (showLabels) {
    const labelR = maxR + 24;
    for (let i = 0; i < count; i++) {
      const p = polarToXY(cx, cy, labelR, i, count);
      const a = angle(i, count);
      const anchor =
        Math.abs(Math.cos(a)) < 0.1 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
      const catColor = data.categoryColors?.[i] ?? "#1e293b";
      parts.push(`  <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="central" font-size="12" font-weight="600" fill="${catColor}">${escapeXml(data.labels[i])}</text>`);
    }
  }

  // 凡例
  if (showLegend && data.datasets.length > 0) {
    const legendY = size + 8;
    const totalWidth = data.datasets.reduce(
      (sum, ds) => sum + ds.name.length * 13 + 28,
      0,
    );
    let legendX = Math.max(8, (size - totalWidth) / 2);

    for (const ds of data.datasets) {
      parts.push(`  <rect x="${legendX}" y="${legendY}" width="14" height="14" rx="3" fill="${ds.color}"/>`);
      parts.push(`  <text x="${legendX + 18}" y="${legendY + 11}" font-size="12" fill="#1e293b">${escapeXml(ds.name)}</text>`);
      legendX += ds.name.length * 13 + 28;
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
