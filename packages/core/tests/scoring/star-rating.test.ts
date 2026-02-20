import { describe, it, expect } from "vitest";
import {
  percentileToStars,
  renderStarText,
  renderStarTextFloat,
  starLabel,
  starColor,
  computeCompositeStars,
} from "../../src/scoring/star-rating";

describe("percentileToStars", () => {
  it("80-100 パーセンタイルは5つ星", () => {
    expect(percentileToStars(80)).toBe(5);
    expect(percentileToStars(90)).toBe(5);
    expect(percentileToStars(100)).toBe(5);
  });

  it("60-79 パーセンタイルは4つ星", () => {
    expect(percentileToStars(60)).toBe(4);
    expect(percentileToStars(70)).toBe(4);
    expect(percentileToStars(79)).toBe(4);
  });

  it("40-59 パーセンタイルは3つ星", () => {
    expect(percentileToStars(40)).toBe(3);
    expect(percentileToStars(50)).toBe(3);
    expect(percentileToStars(59)).toBe(3);
  });

  it("20-39 パーセンタイルは2つ星", () => {
    expect(percentileToStars(20)).toBe(2);
    expect(percentileToStars(30)).toBe(2);
    expect(percentileToStars(39)).toBe(2);
  });

  it("0-19 パーセンタイルは1つ星", () => {
    expect(percentileToStars(0)).toBe(1);
    expect(percentileToStars(10)).toBe(1);
    expect(percentileToStars(19)).toBe(1);
  });

  it("範囲外の値はクランプされる", () => {
    expect(percentileToStars(-10)).toBe(1);
    expect(percentileToStars(110)).toBe(5);
  });
});

describe("renderStarText", () => {
  it("5つ星の文字列を生成する", () => {
    expect(renderStarText(5)).toBe("★★★★★");
  });

  it("3つ星の文字列を生成する", () => {
    expect(renderStarText(3)).toBe("★★★☆☆");
  });

  it("1つ星の文字列を生成する", () => {
    expect(renderStarText(1)).toBe("★☆☆☆☆");
  });
});

describe("renderStarTextFloat", () => {
  it("3.7はは4つ星に丸められる", () => {
    expect(renderStarTextFloat(3.7)).toBe("★★★★☆");
  });

  it("範囲外の値はクランプされる", () => {
    expect(renderStarTextFloat(0)).toBe("★☆☆☆☆");
    expect(renderStarTextFloat(6)).toBe("★★★★★");
  });
});

describe("starLabel", () => {
  it("5つ星のラベル", () => {
    expect(starLabel(5)).toBe("とても良い");
  });

  it("3つ星のラベル", () => {
    expect(starLabel(3)).toBe("普通");
  });

  it("1つ星のラベル", () => {
    expect(starLabel(1)).toBe("要注意");
  });
});

describe("starColor", () => {
  it("5つ星は緑系", () => {
    expect(starColor(5)).toBe("#10b981");
  });

  it("4つ星はライトグリーン系", () => {
    expect(starColor(4)).toBe("#22c55e");
  });

  it("3つ星はアンバー系", () => {
    expect(starColor(3)).toBe("#f59e0b");
  });

  it("2つ星はオレンジ系", () => {
    expect(starColor(2)).toBe("#f97316");
  });

  it("1つ星はローズ系", () => {
    expect(starColor(1)).toBe("#f43f5e");
  });
});

describe("computeCompositeStars", () => {
  it("均等な重みで平均を計算する", () => {
    const stars = [
      { indicatorId: "a", stars: 5 as const },
      { indicatorId: "b", stars: 3 as const },
    ];
    const weights = [
      { indicatorId: "a", weight: 1 },
      { indicatorId: "b", weight: 1 },
    ];
    expect(computeCompositeStars(stars, weights)).toBe(4);
  });

  it("重み付き平均を計算する", () => {
    const stars = [
      { indicatorId: "a", stars: 5 as const },
      { indicatorId: "b", stars: 1 as const },
    ];
    const weights = [
      { indicatorId: "a", weight: 3 },
      { indicatorId: "b", weight: 1 },
    ];
    // (5*3 + 1*1) / (3+1) = 16/4 = 4.0
    expect(computeCompositeStars(stars, weights)).toBe(4);
  });

  it("空の場合はデフォルト3を返す", () => {
    expect(computeCompositeStars([], [])).toBe(3);
  });
});
