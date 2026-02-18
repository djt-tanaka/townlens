import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

import fs from "node:fs/promises";
import { FileCacheAdapter } from "../../src/cache/file-cache";

describe("FileCacheAdapter", () => {
  let cache: FileCacheAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new FileCacheAdapter();
  });

  describe("get", () => {
    it("有効なキャッシュデータを返す", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({ data: { foo: "bar" }, expiresAt: Date.now() + 60_000 }),
      );
      const result = await cache.get("estat:meta:test");
      expect(result).toEqual({ foo: "bar" });
    });

    it("期限切れの場合はnullを返す", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({ data: { foo: "bar" }, expiresAt: Date.now() - 1 }),
      );
      const result = await cache.get("estat:meta:test");
      expect(result).toBeNull();
    });

    it("ファイルが存在しない場合はnullを返す", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
      const result = await cache.get("estat:meta:test");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("キャッシュデータを書き込む", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await cache.set("estat:meta:test", { foo: "bar" }, 60_000);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      const envelope = JSON.parse(writtenContent);
      expect(envelope.data).toEqual({ foo: "bar" });
      expect(envelope.expiresAt).toBeGreaterThan(Date.now());
    });
  });
});
