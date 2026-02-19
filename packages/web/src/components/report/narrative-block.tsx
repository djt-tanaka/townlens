interface NarrativeBlockProps {
  readonly narrative: string;
  readonly variant?: "comparison" | "city";
}

/** ナラティブ（分析テキスト）を整形表示するコンポーネント。PDF同様のグリーンアクセント */
export function NarrativeBlock({
  narrative,
  variant = "comparison",
}: NarrativeBlockProps) {
  const isComparison = variant === "comparison";

  return (
    <blockquote
      className={`rounded-r-xl border-l-4 p-4 ${isComparison ? "border-emerald-500 bg-emerald-50" : "border-emerald-400 bg-emerald-50/50"}`}
    >
      <h3 className="mb-2 text-sm font-semibold text-emerald-700">
        {isComparison ? "総合評価" : "評価コメント"}
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
        {narrative}
      </p>
    </blockquote>
  );
}
