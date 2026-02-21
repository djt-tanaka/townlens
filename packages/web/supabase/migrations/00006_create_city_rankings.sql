-- 都市ランキングデータ（バッチ生成結果の永続化）
CREATE TABLE city_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset TEXT NOT NULL,
  area_code TEXT NOT NULL,
  city_name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  rank INTEGER NOT NULL,
  star_rating NUMERIC(3,1) NOT NULL,
  indicator_stars JSONB NOT NULL,
  population INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(preset, area_code)
);

-- プリセット×順位の複合インデックス（ランキングページ表示用）
CREATE INDEX idx_city_rankings_preset_rank
  ON city_rankings(preset, rank);

-- 生成日時の降順インデックス（最新データ確認用）
CREATE INDEX idx_city_rankings_generated
  ON city_rankings(generated_at DESC);

-- RLS 有効化
ALTER TABLE city_rankings ENABLE ROW LEVEL SECURITY;

-- 公開データのため SELECT は全許可
CREATE POLICY "rankings_select_all"
  ON city_rankings FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE は admin クライアント（service_role）経由のため、
-- RLS ポリシーは不要（service_role は RLS をバイパスする）
