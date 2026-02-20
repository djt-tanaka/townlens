/**
 * Route Handler 共通ユーティリティ。
 */

import { NextResponse } from "next/server";
import { AppError } from "@townlens/core";

/** 成功レスポンスを返す */
export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** エラーレスポンスを返す */
export function errorResponse(
  message: string,
  status: number,
  details?: string,
) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status },
  );
}

/** AppError や一般エラーを統一的にハンドリングする */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return errorResponse(error.message, 400, error.hints?.join("; "));
  }

  const message =
    error instanceof Error ? error.message : "予期しないエラーが発生しました";
  console.error("API エラー:", error);
  return errorResponse(message, 500);
}

/** 現在の月を 'YYYY-MM' 形式で返す */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** プラン別の月間レポート上限 */
export function getReportLimit(
  plan: string,
): number | null {
  switch (plan) {
    case "free":
      return 100;
    case "standard":
    case "premium":
      return null; // 無制限
    default:
      return 100;
  }
}
