/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

export const runtime = "edge";

/** フォントデータのキャッシュ（ウォームインスタンス間で再利用） */
let fontCache: Promise<ArrayBuffer> | null = null;

/** Google Fonts から Noto Sans JP (Bold) を取得（キャッシュあり） */
function loadNotoSansJP(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;

  fontCache = fetchNotoSansJP().catch((err) => {
    fontCache = null;
    throw err;
  });

  return fontCache;
}

async function fetchNotoSansJP(): Promise<ArrayBuffer> {
  const response = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    },
  );
  const css = await response.text();

  const match =
    css.match(/src:\s*url\(([^)]+\.woff2)\)/) ??
    css.match(/src:\s*url\(([^)]+\.(?:woff|ttf|otf))\)/);
  if (!match?.[1]) {
    throw new Error("Noto Sans JP フォント URL の取得に失敗しました");
  }

  const fontResponse = await fetch(match[1]);
  return fontResponse.arrayBuffer();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityName = searchParams.get("name");

    if (!cityName) {
      return new Response("name パラメータが必要です", { status: 400 });
    }

    const fontData = await loadNotoSansJP();

    const imageResponse = new ImageResponse(
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
            gap: "24px",
          }}
        >
          {/* ロゴ */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#a09585",
            }}
          >
            TownLens
          </div>

          {/* 都市名 */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: "700",
              color: "#2c2218",
              lineHeight: 1.2,
            }}
          >
            {cityName}
          </div>

          {/* サブタイトル */}
          <div
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#7a6955",
              lineHeight: 1.4,
            }}
          >
            暮らしやすさ分析
          </div>

          {/* カテゴリラベル */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            {["子育て", "住宅価格", "安全性", "災害リスク", "教育"].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    fontSize: "18px",
                    color: "#7a6955",
                    backgroundColor: "#f0ebe4",
                    padding: "8px 20px",
                    borderRadius: "8px",
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>

          {/* アクセント線 */}
          <div
            style={{
              width: "80px",
              height: "4px",
              backgroundColor: "#b08d57",
              borderRadius: "2px",
              marginTop: "8px",
            }}
          />

          {/* フッター */}
          <div style={{ fontSize: "16px", color: "#a09585" }}>
            政府統計データに基づく多角的評価 ─ townlens.jp
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

    imageResponse.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );

    return imageResponse;
  } catch {
    return new Response("OGP 画像の生成に失敗しました", { status: 500 });
  }
}
