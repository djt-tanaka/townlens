import { describe, it, expect } from "vitest";
import {
  getPrefectureName,
  getPrefectureCode,
  getAllPrefectureNames,
  PREFECTURE_MAP,
} from "@/lib/prefectures";

describe("getPrefectureName", () => {
  it("東京都のコードを解決する", () => {
    expect(getPrefectureName("13112")).toBe("東京都");
  });

  it("北海道のコードを解決する", () => {
    expect(getPrefectureName("01100")).toBe("北海道");
  });

  it("大阪府のコードを解決する", () => {
    expect(getPrefectureName("27100")).toBe("大阪府");
  });

  it("沖縄県のコードを解決する", () => {
    expect(getPrefectureName("47201")).toBe("沖縄県");
  });

  it("不明なコードに対して「不明」を返す", () => {
    expect(getPrefectureName("99999")).toBe("不明");
  });

  it("空文字列に対して「不明」を返す", () => {
    expect(getPrefectureName("")).toBe("不明");
  });
});

describe("getPrefectureCode", () => {
  it("都道府県名からコードを逆引きする", () => {
    expect(getPrefectureCode("東京都")).toBe("13");
  });

  it("北海道のコードを逆引きする", () => {
    expect(getPrefectureCode("北海道")).toBe("01");
  });

  it("沖縄県のコードを逆引きする", () => {
    expect(getPrefectureCode("沖縄県")).toBe("47");
  });

  it("存在しない都道府県名に対して null を返す", () => {
    expect(getPrefectureCode("架空県")).toBeNull();
  });

  it("空文字列に対して null を返す", () => {
    expect(getPrefectureCode("")).toBeNull();
  });
});

describe("getAllPrefectureNames", () => {
  it("47都道府県名をすべて返す", () => {
    const names = getAllPrefectureNames();
    expect(names).toHaveLength(47);
  });

  it("北海道を含む", () => {
    expect(getAllPrefectureNames()).toContain("北海道");
  });

  it("沖縄県を含む", () => {
    expect(getAllPrefectureNames()).toContain("沖縄県");
  });

  it("PREFECTURE_MAP の値と一致する", () => {
    const names = getAllPrefectureNames();
    const mapValues = [...PREFECTURE_MAP.values()];
    expect(names).toEqual(mapValues);
  });
});
