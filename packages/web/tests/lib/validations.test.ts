import { describe, it, expect } from "vitest";
import {
  citySearchSchema,
  createReportSchema,
  reportIdSchema,
  checkoutSchema,
  rankingPresetParamSchema,
} from "@/lib/validations";

describe("citySearchSchema", () => {
  it("2文字以上のクエリを受け入れる", () => {
    const result = citySearchSchema.safeParse({ q: "世田谷" });
    expect(result.success).toBe(true);
  });

  it("1文字のクエリを拒否する", () => {
    const result = citySearchSchema.safeParse({ q: "世" });
    expect(result.success).toBe(false);
  });

  it("空文字列を拒否する", () => {
    const result = citySearchSchema.safeParse({ q: "" });
    expect(result.success).toBe(false);
  });

  it("q パラメータが欠けている場合を拒否する", () => {
    const result = citySearchSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createReportSchema", () => {
  const validInput = {
    cities: ["世田谷区", "渋谷区"],
    preset: "childcare",
  };

  it("有効な入力を受け入れる", () => {
    const result = createReportSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("options フィールドはオプショナル", () => {
    const result = createReportSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("options フィールドのデフォルト値", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      options: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options?.includePrice).toBe(true);
      expect(result.data.options?.includeCrime).toBe(true);
      expect(result.data.options?.includeDisaster).toBe(true);
    }
  });

  it("1都市のみの場合を拒否する", () => {
    const result = createReportSchema.safeParse({
      cities: ["世田谷区"],
      preset: "childcare",
    });
    expect(result.success).toBe(false);
  });

  it("6都市以上の場合を拒否する", () => {
    const result = createReportSchema.safeParse({
      cities: ["a", "b", "c", "d", "e", "f"],
      preset: "childcare",
    });
    expect(result.success).toBe(false);
  });

  it("空の都市名を拒否する", () => {
    const result = createReportSchema.safeParse({
      cities: ["世田谷区", ""],
      preset: "childcare",
    });
    expect(result.success).toBe(false);
  });

  it("無効な preset を拒否する", () => {
    const result = createReportSchema.safeParse({
      cities: ["世田谷区", "渋谷区"],
      preset: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("有効な preset を全て受け入れる", () => {
    for (const preset of ["childcare", "price", "safety"]) {
      const result = createReportSchema.safeParse({
        cities: ["世田谷区", "渋谷区"],
        preset,
      });
      expect(result.success).toBe(true);
    }
  });

  it("5都市ちょうどを受け入れる", () => {
    const result = createReportSchema.safeParse({
      cities: ["a", "b", "c", "d", "e"],
      preset: "childcare",
    });
    expect(result.success).toBe(true);
  });
});

describe("reportIdSchema", () => {
  it("有効な UUID を受け入れる", () => {
    const result = reportIdSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("無効な UUID を拒否する", () => {
    const result = reportIdSchema.safeParse({ id: "invalid-uuid" });
    expect(result.success).toBe(false);
  });

  it("空文字列を拒否する", () => {
    const result = reportIdSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("id フィールドが欠けている場合を拒否する", () => {
    const result = reportIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("有効な priceId を受け入れる", () => {
    const result = checkoutSchema.safeParse({ priceId: "price_abc123" });
    expect(result.success).toBe(true);
  });

  it("空の priceId を拒否する", () => {
    const result = checkoutSchema.safeParse({ priceId: "" });
    expect(result.success).toBe(false);
  });

  it("priceId フィールドが欠けている場合を拒否する", () => {
    const result = checkoutSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("rankingPresetParamSchema", () => {
  it("有効なプリセットを受け入れる", () => {
    for (const preset of ["childcare", "price", "safety"]) {
      const result = rankingPresetParamSchema.safeParse({ preset });
      expect(result.success).toBe(true);
    }
  });

  it("無効なプリセットを拒否する", () => {
    const result = rankingPresetParamSchema.safeParse({ preset: "invalid" });
    expect(result.success).toBe(false);
  });

  it("空文字列を拒否する", () => {
    const result = rankingPresetParamSchema.safeParse({ preset: "" });
    expect(result.success).toBe(false);
  });

  it("preset フィールドが欠けている場合を拒否する", () => {
    const result = rankingPresetParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
