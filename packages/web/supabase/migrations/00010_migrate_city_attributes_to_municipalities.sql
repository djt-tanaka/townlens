-- city_rankings の都市属性を municipalities へ移行
-- 同一 area_code で複数プリセットの行があるため、DISTINCT ON で1行だけ取得
UPDATE municipalities m
SET
  population = sub.population,
  kids_ratio = sub.kids_ratio
FROM (
  SELECT DISTINCT ON (area_code) area_code, population, kids_ratio
  FROM city_rankings
  WHERE population IS NOT NULL
  ORDER BY area_code, generated_at DESC
) sub
WHERE m.area_code = sub.area_code;
