/**
 * コマンド間で共有するユーティリティ関数。
 * 環境変数の必須チェックを一元管理する。
 */

import { AppError } from "@townlens/core";

/** 環境変数 ESTAT_APP_ID を取得し、未設定の場合はエラーを投げる */
export function requireAppId(): string {
  const appId = process.env.ESTAT_APP_ID;
  if (!appId) {
    throw new AppError(
      "環境変数 ESTAT_APP_ID が未設定です",
      [
        "e-Stat の appId を取得して ESTAT_APP_ID に設定してください。",
        ".env を使う場合は ESTAT_APP_ID=<YOUR_APP_ID> を記述してください。"
      ],
      undefined,
      2
    );
  }
  return appId;
}

/** 環境変数 REINFOLIB_API_KEY を取得し、未設定の場合はエラーを投げる */
export function requireReinfoApiKey(): string {
  const key = process.env.REINFOLIB_API_KEY;
  if (!key) {
    throw new AppError(
      "環境変数 REINFOLIB_API_KEY が未設定です",
      [
        "不動産情報ライブラリのAPIキーを取得して設定してください。",
        "APIキー申請: https://www.reinfolib.mlit.go.jp/api/request/",
        "価格データなしで実行する場合は --no-price を指定してください。",
      ],
      undefined,
      2
    );
  }
  return key;
}
