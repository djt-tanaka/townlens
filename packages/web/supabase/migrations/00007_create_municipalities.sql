-- 自治体マスターテーブル（全市区町村の基本情報）
-- ランキング生成スクリプトが e-Stat メタ情報から全自治体を取得し upsert する。
CREATE TABLE municipalities (
  area_code TEXT PRIMARY KEY,
  city_name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 都道府県別の都市一覧取得用インデックス
CREATE INDEX idx_municipalities_prefecture
  ON municipalities(prefecture);

-- RLS 有効化
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;

-- 公開データのため SELECT は全許可
CREATE POLICY "municipalities_select_all"
  ON municipalities FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE は admin クライアント（service_role）経由のため、
-- RLS ポリシーは不要（service_role は RLS をバイパスする）
