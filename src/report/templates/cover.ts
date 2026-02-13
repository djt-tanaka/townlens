import { escapeHtml } from "../../utils";

export interface CoverModel {
  readonly title: string;
  readonly generatedAt: string;
  readonly cities: ReadonlyArray<string>;
  readonly statsDataId: string;
  readonly timeLabel: string;
  readonly presetLabel: string;
}

export function renderCover(model: CoverModel): string {
  const citiesList = model.cities.map((c) => escapeHtml(c)).join("、");

  return `
    <section class="page" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <h1 style="font-size:28px;margin-bottom:24px;">${escapeHtml(model.title)}</h1>
      <div class="meta" style="line-height:2.2;">
        生成日時: ${escapeHtml(model.generatedAt)}<br>
        対象市区町村: ${citiesList}<br>
        プリセット: ${escapeHtml(model.presetLabel)}<br>
        データソース: e-Stat API (${escapeHtml(model.statsDataId)})<br>
        時点: ${escapeHtml(model.timeLabel)}
      </div>
    </section>`;
}
