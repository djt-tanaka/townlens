interface NarrativeBlockProps {
  readonly narrative: string;
  readonly variant?: "comparison" | "city";
}

/** ナラティブ（分析テキスト）を整形表示するコンポーネント */
export function NarrativeBlock({
  narrative,
  variant = "comparison",
}: NarrativeBlockProps) {
  const bgClass =
    variant === "comparison"
      ? "border-l-4 border-primary/30 bg-primary/5"
      : "border-l-4 border-muted-foreground/20 bg-muted/50";

  return (
    <blockquote className={`rounded-r-lg p-4 ${bgClass}`}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
        {narrative}
      </p>
    </blockquote>
  );
}
