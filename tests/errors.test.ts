import { describe, it, expect } from "vitest";
import { CliError, formatError } from "../src/errors";

describe("CliError", () => {
  it("メッセージとデフォルト値で生成される", () => {
    const error = new CliError("テストエラー");
    expect(error.message).toBe("テストエラー");
    expect(error.name).toBe("CliError");
    expect(error.hints).toEqual([]);
    expect(error.details).toBeUndefined();
    expect(error.exitCode).toBe(1);
  });

  it("全パラメータを指定して生成される", () => {
    const error = new CliError("エラー", ["ヒント1", "ヒント2"], "詳細情報", 3);
    expect(error.message).toBe("エラー");
    expect(error.hints).toEqual(["ヒント1", "ヒント2"]);
    expect(error.details).toBe("詳細情報");
    expect(error.exitCode).toBe(3);
  });

  it("Error を継承している", () => {
    const error = new CliError("test");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CliError);
  });
});

describe("formatError", () => {
  it("CliError をフォーマットする（ヒントあり）", () => {
    const error = new CliError("接続エラー", ["リトライしてください"]);
    const formatted = formatError(error);
    expect(formatted).toContain("[ERROR] 接続エラー");
    expect(formatted).toContain("次アクション:");
    expect(formatted).toContain("- リトライしてください");
  });

  it("CliError をフォーマットする（詳細あり）", () => {
    const error = new CliError("エラー", [], "追加情報");
    const formatted = formatError(error);
    expect(formatted).toContain("[ERROR] エラー");
    expect(formatted).toContain("詳細: 追加情報");
  });

  it("CliError をフォーマットする（ヒントなし・詳細なし）", () => {
    const error = new CliError("シンプルエラー");
    const formatted = formatError(error);
    expect(formatted).toBe("[ERROR] シンプルエラー");
  });

  it("通常の Error をフォーマットする", () => {
    const error = new Error("通常エラー");
    const formatted = formatError(error);
    expect(formatted).toBe("[ERROR] 通常エラー");
  });

  it("不明なオブジェクトは汎用メッセージを返す", () => {
    expect(formatError("文字列")).toBe("[ERROR] 不明なエラーが発生しました");
    expect(formatError(42)).toBe("[ERROR] 不明なエラーが発生しました");
    expect(formatError(null)).toBe("[ERROR] 不明なエラーが発生しました");
  });
});
