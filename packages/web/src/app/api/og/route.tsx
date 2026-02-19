/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CityScoreResult, WeightPreset } from "@townlens/core";
import { CITY_COLORS } from "@townlens/core";

/** DB に保存された result_json の最小構造 */
interface StoredReportData {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly preset: WeightPreset;
}

/** Google Fonts から Noto Sans JP (Bold) を取得 */
async function loadNotoSansJP(): Promise<ArrayBuffer> {
  const response = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap",
  );
  const css = await response.text();

  // CSS から woff2 URL を抽出
  const match = css.match(/src:\s*url\(([^)]+\.woff2)\)/);
  if (!match?.[1]) {
    throw new Error("Noto Sans JP フォント URL の取得に失敗しました");
  }

  const fontResponse = await fetch(match[1]);
  return fontResponse.arrayBuffer();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("id パラメータが必要です", { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: report, error } = await supabase
      .from("reports")
      .select("cities, result_json, preset")
      .eq("id", id)
      .single();

    if (error || !report) {
      return new Response("レポートが見つかりません", { status: 404 });
    }

    const stored = report.result_json as unknown as StoredReportData | null;
    const cityNames = (report.cities ?? []) as ReadonlyArray<string>;
    const presetLabel = stored?.preset?.label ?? String(report.preset);
    const results = stored?.results ?? [];

    const sortedResults = [...results].sort((a, b) => a.rank - b.rank);
    const fontData = await loadNotoSansJP();

    const medals = ["🥇", "🥈", "🥉"];

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#faf8f5",
            padding: "48px 56px",
            fontFamily: "Noto Sans JP",
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#2c2218",
              }}
            >
              TownLens
            </div>
            <div
              style={{
                fontSize: "20px",
                color: "#7a6955",
                backgroundColor: "#f0ebe4",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              {presetLabel}
            </div>
          </div>

          {/* タイトル */}
          <div
            style={{
              fontSize: "48px",
              fontWeight: "700",
              color: "#2c2218",
              marginBottom: "40px",
              lineHeight: 1.2,
            }}
          >
            {cityNames.join(" vs ")}
          </div>

          {/* ランキングカード */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              flex: 1,
            }}
          >
            {sortedResults.slice(0, 5).map((result, index) => (
              <div
                key={result.cityName}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px 32px",
                  border: "2px solid #e8e2da",
                  flex: 1,
                }}
              >
                <div style={{ fontSize: "36px" }}>
                  {medals[index] ?? `${index + 1}位`}
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#2c2218",
                  }}
                >
                  {result.cityName}
                </div>
                <div
                  style={{
                    fontSize: "40px",
                    fontWeight: "700",
                    color: CITY_COLORS[index % CITY_COLORS.length],
                  }}
                >
                  {result.compositeScore.toFixed(1)}
                </div>
                <div style={{ fontSize: "16px", color: "#7a6955" }}>点</div>
              </div>
            ))}
          </div>

          {/* フッター */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px",
              fontSize: "16px",
              color: "#7a6955",
            }}
          >
            <div>政府統計ベースの街えらび比較ツール</div>
            <div>townlens.jp</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Noto Sans JP",
            data: fontData,
            weight: 700,
            style: "normal",
          },
        ],
      },
    );

    // CDN キャッシュで高速化（1時間 + 1日 s-maxage + 7日 stale-while-revalidate）
    imageResponse.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );

    return imageResponse;
  } catch {
    return new Response("OGP 画像の生成に失敗しました", { status: 500 });
  }
}
