import { describe, it, expect } from "vitest";
import path from "node:path";
import { resolveOutPath } from "../src/utils";

describe("resolveOutPath", () => {
  it("指定パスがある場合はそのパスを解決する", () => {
    const result = resolveOutPath("output/report.pdf");
    expect(result).toBe(path.resolve("output/report.pdf"));
  });

  it("パス未指定の場合はタイムスタンプ付きパスを生成する", () => {
    const result = resolveOutPath();
    expect(result).toContain("out");
    expect(result).toContain("estat_report_");
    expect(result).toContain(".pdf");
  });
});
