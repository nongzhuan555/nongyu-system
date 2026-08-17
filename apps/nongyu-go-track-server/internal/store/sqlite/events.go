package sqlite

import (
	"context"
	"database/sql"
	"fmt"
)

// EventRow 写入 events 表的一行（已校验）。
type EventRow struct {
	EventID      string
	UserID       int64
	StudentNo    string
	EventType    string
	EventName    string
	AppVersion   string
	Platform     string
	DeviceBrand  string
	SessionID    string
	DurationMs   *int64
	PropsJSON    string
	ClientTsMs   *int64
	ReceivedAtMs int64
	StatDate     string
}

// InsertEvent 幂等插入；duplicated=true 表示 UNIQUE(event_id) 命中。
func (s *Store) InsertEvent(ctx context.Context, tx *sql.Tx, row EventRow) (duplicated bool, err error) {
	var userID any
	if row.UserID > 0 {
		userID = row.UserID
	}
	res, err := tx.ExecContext(ctx, `
INSERT OR IGNORE INTO events (
  event_id, user_id, student_no, event_type, event_name, app_version, platform,
  device_brand, session_id, duration_ms, props_json, client_ts_ms, received_at_ms, stat_date
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.EventID,
		userID,
		nullIfEmpty(row.StudentNo),
		row.EventType,
		row.EventName,
		nullIfEmpty(row.AppVersion),
		nullIfEmpty(row.Platform),
		nullIfEmpty(row.DeviceBrand),
		nullIfEmpty(row.SessionID),
		nullInt64(row.DurationMs),
		nullIfEmpty(row.PropsJSON),
		nullInt64(row.ClientTsMs),
		row.ReceivedAtMs,
		row.StatDate,
	)
	if err != nil {
		return false, fmt.Errorf("insert event: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n == 0, nil
}

func (s *Store) WithWriteTx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := s.write.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit()
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullInt64(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}
