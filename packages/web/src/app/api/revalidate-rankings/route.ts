/**
 * POST /api/revalidate-rankings
 * ランキングページの ISR キャッシュを強制再生成する。
 * generate-rankings ワークフローの最終ステップから呼び出される。
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/ranking", "layout");

  return NextResponse.json({ revalidated: true });
}
