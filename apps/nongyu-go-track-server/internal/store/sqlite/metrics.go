package sqlite

import (
	"context"
	"database/sql"
	"fmt"
)

type Metric struct {
	StatDate string
	Key      string
	Value    int64
}

type DimRow struct {
	DimKey      string
	DimValue    string
	MetricValue int64
}

type CrashRow struct {
	EventID      string
	UserID       sql.NullInt64
	StudentNo    sql.NullString
	EventName    string
	AppVersion   sql.NullString
	Platform     sql.NullString
	DeviceBrand  sql.NullString
	ClientTsMs   sql.NullInt64
	ReceivedAtMs int64
	StatDate     string
	PropsJSON    sql.NullString
}

func (s *Store) UpsertMetric(ctx context.Context, tx *sql.Tx, date, key string, value, nowMs int64) error {
	_, err := tx.ExecContext(ctx, `
INSERT INTO daily_metrics (stat_date, metric_key, metric_value, updated_at_ms)
VALUES (?, ?, ?, ?)
ON CONFLICT(stat_date, metric_key) DO UPDATE SET
  metric_value=excluded.metric_value,
  updated_at_ms=excluded.updated_at_ms`, date, key, value, nowMs)
	if err != nil {
		return fmt.Errorf("upsert metric %s: %w", key, err)
	}
	return nil
}

func (s *Store) BumpPeak(ctx context.Context, date string, sample, nowMs int64) error {
	return s.WithWriteTx(ctx, func(tx *sql.Tx) error {
		var current sql.NullInt64
		err := tx.QueryRowContext(ctx, `
SELECT metric_value FROM daily_metrics WHERE stat_date=? AND metric_key='online_peak'`, date).Scan(&current)
		if err != nil && err != sql.ErrNoRows {
			return err
		}
		val := sample
		if current.Valid && current.Int64 > val {
			val = current.Int64
		}
		return s.UpsertMetric(ctx, tx, date, "online_peak", val, nowMs)
	})
}

func (s *Store) ReplaceDims(ctx context.Context, tx *sql.Tx, date, metricKey string, nowMs int64, rows []DimRow) error {
	if _, err := tx.ExecContext(ctx, `
DELETE FROM daily_dims WHERE stat_date=? AND metric_key=?`, date, metricKey); err != nil {
		return err
	}
	for _, row := range rows {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO daily_dims (stat_date, metric_key, dim_key, dim_value, metric_value, updated_at_ms)
VALUES (?, ?, ?, ?, ?, ?)`, date, metricKey, row.DimKey, row.DimValue, row.MetricValue, nowMs); err != nil {
			return fmt.Errorf("insert dim: %w", err)
		}
	}
	return nil
}

func (s *Store) GetMetricMap(ctx context.Context, date string) (map[string]int64, error) {
	rows, err := s.read.QueryContext(ctx, `
SELECT metric_key, metric_value FROM daily_metrics WHERE stat_date=?`, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int64{}
	for rows.Next() {
		var k string
		var v int64
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}

func (s *Store) Trend(ctx context.Context, metric, from, to string) ([]Metric, error) {
	rows, err := s.read.QueryContext(ctx, `
SELECT stat_date, metric_key, metric_value FROM daily_metrics
WHERE metric_key=? AND stat_date>=? AND stat_date<=?
ORDER BY stat_date ASC`, metric, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Metric, 0)
	for rows.Next() {
		var m Metric
		if err := rows.Scan(&m.StatDate, &m.Key, &m.Value); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) Dims(ctx context.Context, metric, date string, limit int) ([]DimRow, error) {
	rows, err := s.read.QueryContext(ctx, `
SELECT dim_key, dim_value, metric_value FROM daily_dims
WHERE stat_date=? AND metric_key=?
ORDER BY metric_value DESC, dim_value ASC
LIMIT ?`, date, metric, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]DimRow, 0)
	for rows.Next() {
		var d DimRow
		if err := rows.Scan(&d.DimKey, &d.DimValue, &d.MetricValue); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) ListCrashes(ctx context.Context, from, to string, offset, limit int) ([]CrashRow, int, error) {
	var total int
	if err := s.read.QueryRowContext(ctx, `
SELECT COUNT(*) FROM events WHERE event_type='crash' AND stat_date>=? AND stat_date<=?`, from, to).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.read.QueryContext(ctx, `
SELECT event_id, user_id, student_no, event_name, app_version, platform, device_brand,
       client_ts_ms, received_at_ms, stat_date, props_json
FROM events
WHERE event_type='crash' AND stat_date>=? AND stat_date<=?
ORDER BY received_at_ms DESC
LIMIT ? OFFSET ?`, from, to, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]CrashRow, 0)
	for rows.Next() {
		var c CrashRow
		if err := rows.Scan(
			&c.EventID, &c.UserID, &c.StudentNo, &c.EventName, &c.AppVersion, &c.Platform,
			&c.DeviceBrand, &c.ClientTsMs, &c.ReceivedAtMs, &c.StatDate, &c.PropsJSON,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, c)
	}
	return out, total, rows.Err()
}

func (s *Store) CountDistinctDAU(ctx context.Context, q dbQuerier, date string) (int64, error) {
	var n int64
	err := q.QueryRowContext(ctx, `
SELECT COUNT(DISTINCT user_id) FROM events
WHERE stat_date=? AND event_type='app_open' AND user_id IS NOT NULL`, date).Scan(&n)
	return n, err
}

func (s *Store) CountByType(ctx context.Context, q dbQuerier, date, eventType string) (int64, error) {
	var n int64
	err := q.QueryRowContext(ctx, `
SELECT COUNT(*) FROM events WHERE stat_date=? AND event_type=?`, date, eventType).Scan(&n)
	return n, err
}

func (s *Store) CountByName(ctx context.Context, q dbQuerier, date, eventType string) ([]DimRow, error) {
	rows, err := q.QueryContext(ctx, `
SELECT event_name, COUNT(*) FROM events
WHERE stat_date=? AND event_type=?
GROUP BY event_name`, date, eventType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]DimRow, 0)
	for rows.Next() {
		var d DimRow
		d.DimKey = "name"
		if err := rows.Scan(&d.DimValue, &d.MetricValue); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) PerfDurations(ctx context.Context, q dbQuerier, date string) (map[string][]int64, error) {
	rows, err := q.QueryContext(ctx, `
SELECT event_name, duration_ms FROM events
WHERE stat_date=? AND event_type='perf' AND duration_ms IS NOT NULL`, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string][]int64{}
	for rows.Next() {
		var name string
		var ms int64
		if err := rows.Scan(&name, &ms); err != nil {
			return nil, err
		}
		out[name] = append(out[name], ms)
	}
	return out, rows.Err()
}

func (s *Store) PurgeEvents(ctx context.Context, cutoffMs int64) (int64, error) {
	var deleted int64
	err := s.WithWriteTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `DELETE FROM events WHERE received_at_ms < ?`, cutoffMs)
		if err != nil {
			return err
		}
		deleted, err = res.RowsAffected()
		return err
	})
	if err != nil {
		return 0, err
	}
	_, _ = s.write.ExecContext(ctx, "PRAGMA optimize")
	return deleted, nil
}

func (s *Store) RecordJob(ctx context.Context, name, key, status string, nowMs int64, detail string) error {
	_, err := s.write.ExecContext(ctx, `
INSERT INTO meta_jobs (job_name, job_key, status, finished_at_ms, detail_json)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(job_name, job_key) DO UPDATE SET
  status=excluded.status,
  finished_at_ms=excluded.finished_at_ms,
  detail_json=excluded.detail_json`, name, key, status, nowMs, nullIfEmpty(detail))
	return err
}

func (s *Store) JobStatus(ctx context.Context, name, key string) (string, bool, error) {
	var status string
	err := s.read.QueryRowContext(ctx, `
SELECT status FROM meta_jobs WHERE job_name=? AND job_key=?`, name, key).Scan(&status)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return status, true, nil
}

type dbQuerier interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}
