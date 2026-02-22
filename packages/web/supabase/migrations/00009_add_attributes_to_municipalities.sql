-- municipalities テーブルに人口・子供比率カラムを追加
-- city_rankings からの正規化の一環（§14.1）
ALTER TABLE municipalities ADD COLUMN population INTEGER;
ALTER TABLE municipalities ADD COLUMN kids_ratio NUMERIC(4,1);
