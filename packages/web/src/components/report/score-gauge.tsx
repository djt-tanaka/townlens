interface ScoreGaugeProps {
  readonly score: number;
  readonly size?: number;
  readonly label?: string;
}

/** スコアに応じた色を返す */
export function getScoreColor(score: number): string {
  if (score >= 70) return "#5a9e7a";
  if (score >= 40) return "#c8883a";
  return "#c26050";
}

/** 半円ゲージの SVG パスを計算する */
export function calculateArc(
  score: number,
  radius: number,
): { dashArray: string; dashOffset: number } {
  const halfCircumference = Math.PI * radius;
  const offset = halfCircumference * (1 - Math.min(score, 100) / 100);
  return {
    dashArray: `${halfCircumference} ${halfCircumference}`,
    dashOffset: offset,
  };
}

/** スコアを半円ゲージで表示するSVGコンポーネント */
export function ScoreGauge({ score, size = 120, label }: ScoreGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const color = getScoreColor(score);
  const { dashArray, dashOffset } = calculateArc(score, radius);
  const roundedScore = Math.round(score * 10) / 10;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        role="img"
        aria-label={`スコア ${roundedScore}点`}
      >
        {/* 背景の半円 */}
        <circle
          cx={center}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth={strokeWidth}
          strokeDasharray={`${Math.PI * radius} ${Math.PI * radius}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(180 ${center} ${size / 2})`}
        />
        {/* スコアの半円 */}
        <circle
          cx={center}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(180 ${center} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
        {/* スコア数値 */}
        <text
          x={center}
          y={size / 2 - 4}
          textAnchor="middle"
          className="fill-foreground text-2xl font-bold"
          style={{ fontSize: size * 0.22 }}
        >
          {roundedScore}
        </text>
      </svg>
      {label && (
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
