-- 扩展 events.event_type 允许 llm_proxy_fail（SQLite 需重建表以改 CHECK）
CREATE TABLE events_new (
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
  CHECK (event_type IN ('screen_view','button_click','perf','app_open','heartbeat','crash','llm_proxy_fail')),
  CHECK (platform IS NULL OR platform IN ('ios','android'))
);

INSERT INTO events_new (
  id, event_id, user_id, student_no, event_type, event_name, app_version, platform,
  device_brand, session_id, duration_ms, props_json, client_ts_ms, received_at_ms, stat_date
)
SELECT
  id, event_id, user_id, student_no, event_type, event_name, app_version, platform,
  device_brand, session_id, duration_ms, props_json, client_ts_ms, received_at_ms, stat_date
FROM events;

DROP TABLE events;
ALTER TABLE events_new RENAME TO events;

CREATE UNIQUE INDEX uk_events_event_id ON events(event_id);
CREATE INDEX idx_events_stat_type ON events(stat_date, event_type);
CREATE INDEX idx_events_stat_name ON events(stat_date, event_name);
CREATE INDEX idx_events_user_stat ON events(user_id, stat_date);
CREATE INDEX idx_events_received ON events(received_at_ms);
