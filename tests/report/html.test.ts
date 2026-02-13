import { describe, it, expect } from "vitest";
import { renderReportHtml, ReportModel } from "../../src/report/html";

const sampleModel: ReportModel = {
  title: "テストレポート",
  generatedAt: "2026-02-13 12:00:00",
  statsDataId: "0003448299",
  timeLabel: "2020000000 (2020年)",
  totalLabel: "総数",
  kidsLabel: "0～14歳",
  classInfo: "cat01: 000(総数) / 001(0～14歳)",
  rows: [
    {
      cityInput: "新宿区",
      cityResolved: "新宿区",
      areaCode: "13104",
      total: 346235,
      kids: 32451,
      ratio: 9.37,
      totalRank: 1,
      ratioRank: 2,
    },
    {
      cityInput: "渋谷区",
      cityResolved: "渋谷区",
      areaCode: "13113",
      total: 227850,
      kids: 22100,
      ratio: 9.7,
      totalRank: 2,
      ratioRank: 1,
    },
  ],
};

describe("renderReportHtml", () => {
  it("有効なHTML文書を生成する", () => {
    const html = renderReportHtml(sampleModel);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<html lang=\"ja\">");
    expect(html).toContain("</html>");
  });

  it("タイトルを含む", () => {
    const html = renderReportHtml(sampleModel);
    expect(html).toContain("テストレポート");
  });

  it("表紙セクションを含む", () => {
    const html = renderReportHtml(sampleModel);
    expect(html).toContain('class="cover"');
    expect(html).toContain("2026-02-13 12:00:00");
    expect(html).toContain("新宿区");
    expect(html).toContain("渋谷区");
  });

  it("データテーブルを含む", () => {
    const html = renderReportHtml(sampleModel);
    expect(html).toContain("<table>");
    expect(html).toContain("13104");
    expect(html).toContain("13113");
  });

  it("数値がフォーマットされている", () => {
    const html = renderReportHtml(sampleModel);
    expect(html).toContain("346,235");
    expect(html).toContain("9.37%");
  });

  it("出典情報を含む", () => {
    const html = renderReportHtml(sampleModel);
    expect(html).toContain("e-Stat API");
    expect(html).toContain("0003448299");
  });

  it("HTMLエスケープが行われる", () => {
    const model: ReportModel = {
      ...sampleModel,
      title: "テスト<script>alert('xss')</script>",
    };
    const html = renderReportHtml(model);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
