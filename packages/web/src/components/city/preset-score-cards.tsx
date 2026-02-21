import type { WeightPreset } from "@townlens/core";
import type { SingleCityScore } from "@townlens/core";
import { starLabel, ALL_INDICATORS } from "@townlens/core";
import type { StarRating } from "@townlens/core";

const INDICATOR_LABELS = new Map(
  ALL_INDICATORS.map((d) => [d.id, d.label]),
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreGauge } from "@/components/report/score-gauge";

interface PresetScoreCardsProps {
  readonly presetScores: ReadonlyArray<{
    readonly preset: WeightPreset;
    readonly score: SingleCityScore;
  }>;
}

/** 3プリセット別のスター評価をカードで表示 */
export function PresetScoreCards({ presetScores }: PresetScoreCardsProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">プリセット別評価</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {presetScores.map(({ preset, score }) => (
          <Card key={preset.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{preset.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <ScoreGauge
                score={0}
                starRating={score.starRating}
                label={starLabel(
                  Math.round(score.starRating) as StarRating,
                )}
                size={100}
              />
              <div className="w-full space-y-1">
                {score.indicatorStars.map((is) => (
                  <div
                    key={is.indicatorId}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {INDICATOR_LABELS.get(is.indicatorId) ?? is.indicatorId}
                    </span>
                    <span>
                      {"★".repeat(is.stars)}
                      {"☆".repeat(5 - is.stars)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
