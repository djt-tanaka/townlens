/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CityScoreResult, WeightPreset } from "@townlens/core";
import { CITY_COLORS } from "@townlens/core";

export const runtime = "edge";

/** DB に保存された result_json の最小構造 */
interface StoredReportData {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly preset: WeightPreset;
}

/** Google Fonts から Noto Sans JP (Bold) を取得 */
async function loadNotoSansJP(): Promise<ArrayBuffer> {
  const response = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap",
    {
      headers: {
        // woff2 形式を取得するためにブラウザ User-Agent を指定
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    },
  );
  const css = await response.text();

  // CSS から フォント URL を抽出（woff2 優先、見つからなければ woff/ttf にフォールバック）
  const match =
    css.match(/src:\s*url\(([^)]+\.woff2)\)/) ??
    css.match(/src:\s*url\(([^)]+\.(?:woff|ttf|otf))\)/);
  if (!match?.[1]) {
    throw new Error("Noto Sans JP フォント URL の取得に失敗しました");
  }

  const fontResponse = await fetch(match[1]);
  return fontResponse.arrayBuffer();
}

/** サイト全体用のデフォルト OGP 画像を生成 */
async function generateDefaultImage(fontData: ArrayBuffer) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#faf8f5",
          fontFamily: "Noto Sans JP",
          gap: "32px",
        }}
      >
        {/* ロゴ */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "700",
            color: "#2c2218",
          }}
        >
          TownLens
        </div>

        {/* キャッチコピー */}
        <div
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#2c2218",
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          家族で住む街を、丁寧に選ぼう。
        </div>

        {/* サブコピー */}
        <div
          style={{
            fontSize: "20px",
            color: "#7a6955",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.6,
          }}
        >
          政府統計の数字で子育て・安全・価格・災害リスクを比較
        </div>

        {/* アクセント線 */}
        <div
          style={{
            width: "80px",
            height: "4px",
            backgroundColor: "#b08d57",
            borderRadius: "2px",
          }}
        />

        {/* URL */}
        <div style={{ fontSize: "18px", color: "#a09585" }}>townlens.jp</div>
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
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // id なし → サイト全体用デフォルト画像
    if (!id) {
      const fontData = await loadNotoSansJP();
      const imageResponse = await generateDefaultImage(fontData);
      imageResponse.headers.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      );
      return imageResponse;
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
                  {(result.compositeScore ?? 0).toFixed(1)}
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
