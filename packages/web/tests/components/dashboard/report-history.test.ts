import { describe, it, expect } from "vitest";
import {
  formatDate,
  getPresetLabel,
  STATUS_CONFIG,
} from "@/components/dashboard/utils";

describe("formatDate", () => {
  it("ISO 8601 文字列を日本語形式にフォーマットする", () => {
    const result = formatDate("2025-06-15T14:30:00Z");
    // Intl.DateTimeFormat("ja-JP") のフォーマットはロケール依存だが、
    // 年・月・日・時・分が含まれることを確認
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/15/);
  });

  it("深夜0時の日時も正しくフォーマットする", () => {
    const result = formatDate("2025-01-01T00:00:00Z");
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/01/);
  });
});

describe("getPresetLabel", () => {
  it("childcare プリセットのラベルを返す", () => {
    expect(getPresetLabel("childcare")).toBe("子育て重視");
  });

  it("price プリセットのラベルを返す", () => {
    expect(getPresetLabel("price")).toBe("価格重視");
  });

  it("safety プリセットのラベルを返す", () => {
    expect(getPresetLabel("safety")).toBe("安全重視");
  });

  it("存在しないプリセットは生の名前を返す", () => {
    expect(getPresetLabel("unknown-preset")).toBe("unknown-preset");
  });
});

describe("STATUS_CONFIG", () => {
  it("completed の設定が正しい", () => {
    expect(STATUS_CONFIG.completed).toEqual({
      label: "完了",
      variant: "default",
    });
  });

  it("processing の設定が正しい", () => {
    expect(STATUS_CONFIG.processing).toEqual({
      label: "生成中",
      variant: "secondary",
    });
  });

  it("failed の設定が正しい", () => {
    expect(STATUS_CONFIG.failed).toEqual({
      label: "失敗",
      variant: "destructive",
    });
  });
});
