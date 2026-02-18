import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-cache", () => ({
  SupabaseCacheAdapter: class {},
}));

// new で呼ばれるためクラスとしてモックする
vi.mock("@townlens/core", () => ({
  EstatApiClient: class {
    constructor(public appId: string, public opts?: { cache?: unknown }) {}
  },
  ReinfoApiClient: class {
    constructor(public apiKey: string, public opts?: { cache?: unknown }) {}
  },
}));

describe("createEstatClient", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("ESTAT_APP_ID が設定されている場合にクライアントを返す", async () => {
    vi.stubEnv("ESTAT_APP_ID", "test-app-id");
    const { createEstatClient } = await import("@/lib/api-clients");
    const client = createEstatClient();
    expect(client).toBeDefined();
  });

  it("ESTAT_APP_ID が未設定の場合にエラーを投げる", async () => {
    vi.stubEnv("ESTAT_APP_ID", "");
    const { createEstatClient } = await import("@/lib/api-clients");
    expect(() => createEstatClient()).toThrow("ESTAT_APP_ID");
  });
});

describe("createReinfoClient", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("REINFOLIB_API_KEY が設定されている場合にクライアントを返す", async () => {
    vi.stubEnv("REINFOLIB_API_KEY", "test-api-key");
    const { createReinfoClient } = await import("@/lib/api-clients");
    const client = createReinfoClient();
    expect(client).toBeDefined();
  });

  it("REINFOLIB_API_KEY が未設定の場合にエラーを投げる", async () => {
    vi.stubEnv("REINFOLIB_API_KEY", "");
    const { createReinfoClient } = await import("@/lib/api-clients");
    expect(() => createReinfoClient()).toThrow("REINFOLIB_API_KEY");
  });
});
