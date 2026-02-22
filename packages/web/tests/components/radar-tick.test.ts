import { describe, it, expect } from "vitest";
import { splitLabel } from "@/components/charts/radar-tick";

describe("splitLabel", () => {
  it("短いラベルはそのまま返す", () => {
    expect(splitLabel("総人口", 7)).toEqual(["総人口"]);
    expect(splitLabel("0-14歳比率", 10)).toEqual(["0-14歳比率"]);
  });

  it("全角括弧「（」で分割する", () => {
    expect(splitLabel("小学校数（人口1万人あたり）")).toEqual([
      "小学校数",
      "（人口1万人あたり）",
    ]);
    expect(splitLabel("一般病院数（人口10万人あたり）")).toEqual([
      "一般病院数",
      "（人口10万人あたり）",
    ]);
    expect(splitLabel("中古マンション価格（中央値）")).toEqual([
      "中古マンション価格",
      "（中央値）",
    ]);
  });

  it("中黒「・」で分割する", () => {
    expect(splitLabel("洪水・土砂災害リスク")).toEqual([
      "洪水・",
      "土砂災害リスク",
    ]);
  });

  it("括弧も中黒もない長いラベルは中間で分割する", () => {
    expect(splitLabel("ターミナル駅距離", 7)).toEqual([
      "ターミナル",
      "駅距離",
    ]);
    expect(splitLabel("1人あたり公園面積", 7)).toEqual([
      "1人あたり",
      "公園面積",
    ]);
  });

  it("maxLen でしきい値を変更できる", () => {
    // maxLen=10 なら「ターミナル駅距離」(8文字) は分割不要
    expect(splitLabel("ターミナル駅距離", 10)).toEqual(["ターミナル駅距離"]);
    // maxLen=4 なら短いラベルも分割される
    expect(splitLabel("年少人口割合", 4)).toEqual(["年少人", "口割合"]);
  });

  it("括弧が先頭にある場合は中間分割にフォールバックする", () => {
    // parenIdx === 0 なので括弧分割は適用されない
    const result = splitLabel("（テスト）データ", 5);
    expect(result).toHaveLength(2);
    expect(result.join("")).toBe("（テスト）データ");
  });
});
