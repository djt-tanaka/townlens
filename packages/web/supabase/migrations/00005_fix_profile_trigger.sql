-- handle_new_user() のセキュリティ修正
-- search_path を空に設定し、完全修飾テーブル名を使用することで
-- auth スキーマコンテキストからの実行時にも profiles テーブルを正しく解決する
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
