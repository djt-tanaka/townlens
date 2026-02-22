-- city_rankings テーブルに子供比率カラムを追加（都道府県ページで表示用）
ALTER TABLE city_rankings ADD COLUMN kids_ratio NUMERIC(4,1);
