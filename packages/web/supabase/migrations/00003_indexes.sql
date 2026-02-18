CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_usage_user_month ON usage_records(user_id, month);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);
