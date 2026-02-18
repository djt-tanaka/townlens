-- Row Level Security を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- profiles: 自分のデータのみ参照・更新可
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- usage_records: 自分の利用量のみ参照可
CREATE POLICY "usage_select_own"
  ON usage_records FOR SELECT USING (auth.uid() = user_id);

-- reports: 自分のレポートは作成可、全レポートは参照可（共有用）
CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_select_all"
  ON reports FOR SELECT USING (true);

-- api_cache: RLS はデフォルトで全拒否。
-- Route Handlers は supabase admin クライアント（service_role）を使用するためポリシー不要。
