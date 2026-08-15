PRAGMA foreign_keys = ON;

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  user_id INTEGER NULL,
  student_no TEXT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  app_version TEXT NULL,
  platform TEXT NULL,
  device_brand TEXT NULL,
  session_id TEXT NULL,
  duration_ms INTEGER NULL,
  props_json TEXT NULL,
  client_ts_ms INTEGER NULL,
  received_at_ms INTEGER NOT NULL,
  stat_date TEXT NOT NULL,
  CHECK (event_type IN ('screen_view','button_click','perf','app_open','heartbeat','crash')),
  CHECK (platform IS NULL OR platform IN ('ios','android'))
);

CREATE UNIQUE INDEX uk_events_event_id ON events(event_id);
CREATE INDEX idx_events_stat_type ON events(stat_date, event_type);
CREATE INDEX idx_events_stat_name ON events(stat_date, event_name);
CREATE INDEX idx_events_user_stat ON events(user_id, stat_date);
CREATE INDEX idx_events_received ON events(received_at_ms);

CREATE TABLE user_presence (
  user_id INTEGER PRIMARY KEY,
  is_online INTEGER NOT NULL DEFAULT 0 CHECK (is_online IN (0,1)),
  last_seen_at_ms INTEGER NOT NULL,
  platform TEXT NULL,
  app_version TEXT NULL,
  device_brand TEXT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_presence_online_seen ON user_presence(is_online, last_seen_at_ms);

CREATE TABLE daily_metrics (
  stat_date TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (stat_date, metric_key)
);

CREATE TABLE daily_dims (
  stat_date TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  dim_key TEXT NOT NULL,
  dim_value TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (stat_date, metric_key, dim_key, dim_value)
);

CREATE TABLE meta_jobs (
  job_name TEXT NOT NULL,
  job_key TEXT NOT NULL,
  status TEXT NOT NULL,
  finished_at_ms INTEGER NOT NULL,
  detail_json TEXT NULL,
  PRIMARY KEY (job_name, job_key)
);
