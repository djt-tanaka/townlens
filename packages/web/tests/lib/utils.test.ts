import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("単一クラスをそのまま返す", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("複数クラスを結合する", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("重複するTailwindクラスを後者で上書きする", () => {
    const result = cn("px-4 py-2", "px-8");
    expect(result).toBe("py-2 px-8");
  });

  it("条件付きクラスを処理する", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("falsy 値を無視する", () => {
    const result = cn("base", false, null, undefined, "extra");
    expect(result).toBe("base extra");
  });

  it("空の入力で空文字列を返す", () => {
    expect(cn()).toBe("");
  });
});
