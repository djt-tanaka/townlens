import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseCacheAdapter } from "@/lib/supabase-cache";

// Supabase admin クライアントのモック
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();

// チェーンビルダー
function createChain(finalFn: ReturnType<typeof vi.fn>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = finalFn;
  chain.delete = vi.fn().mockReturnValue(chain);
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

describe("SupabaseCacheAdapter", () => {
  let adapter: SupabaseCacheAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SupabaseCacheAdapter();
  });

  describe("get", () => {
    it("キャッシュヒット時にデータを返す", async () => {
      const cachedData = { foo: "bar" };
      const futureDate = new Date(Date.now() + 3600_000).toISOString();

      const chain = createChain(
        vi.fn().mockResolvedValue({
          data: { data: cachedData, expires_at: futureDate },
          error: null,
        }),
      );
      mockFrom.mockReturnValue(chain);

      const result = await adapter.get<{ foo: string }>("test-key");
      expect(result).toEqual(cachedData);
      expect(mockFrom).toHaveBeenCalledWith("api_cache");
    });

    it("キャッシュミス時に null を返す", async () => {
      const chain = createChain(
        vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      );
      mockFrom.mockReturnValue(chain);

      const result = await adapter.get("missing-key");
      expect(result).toBeNull();
    });

    it("期限切れデータに対して null を返す", async () => {
      const pastDate = new Date(Date.now() - 3600_000).toISOString();

      const deleteChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      let callCount = 0;
      const chain = createChain(
        vi.fn().mockResolvedValue({
          data: { data: { old: "data" }, expires_at: pastDate },
          error: null,
        }),
      );
      // delete チェーンを返す
      chain.delete = vi.fn().mockReturnValue(deleteChain);

      mockFrom.mockReturnValue(chain);

      const result = await adapter.get("expired-key");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("データを upsert で保存する", async () => {
      const upsertResult = { error: null };
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue(upsertResult),
      });

      await adapter.set("test-key", { hello: "world" }, 3600_000);
      expect(mockFrom).toHaveBeenCalledWith("api_cache");
    });

    it("upsert エラー時にログのみ出力する（例外を投げない）", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          error: { message: "upsert failed" },
        }),
      });

      await expect(
        adapter.set("test-key", { hello: "world" }, 3600_000),
      ).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
