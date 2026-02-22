-- city_rankings テーブルから冗長な都市属性カラムを削除し、
-- municipalities への FK を追加する（§14.1 DB正規化）

-- FK 追加前に municipalities に存在しない area_code のレコードを削除
-- （都道府県コード XX000 等、アプリ側で既に除外済みのデータ）
DELETE FROM city_rankings
WHERE area_code NOT IN (SELECT area_code FROM municipalities);

-- FK 制約を追加（area_code → municipalities.area_code）
ALTER TABLE city_rankings
  ADD CONSTRAINT city_rankings_area_code_fkey
  FOREIGN KEY (area_code) REFERENCES municipalities(area_code)
  ON DELETE CASCADE;

-- 冗長カラムの削除
ALTER TABLE city_rankings DROP COLUMN city_name;
ALTER TABLE city_rankings DROP COLUMN prefecture;
ALTER TABLE city_rankings DROP COLUMN population;
ALTER TABLE city_rankings DROP COLUMN kids_ratio;
