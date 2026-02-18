import { describe, it, expect } from "vitest";
import { getPrefectureName } from "@/lib/prefectures";

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
