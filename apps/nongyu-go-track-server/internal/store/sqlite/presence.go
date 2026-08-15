package sqlite

import (
	"context"
	"database/sql"
	"fmt"
)

type Presence struct {
	UserID       int64
	Online       bool
	LastSeenAtMs int64
	Platform     string
	AppVersion   string
	DeviceBrand  string
	UpdatedAtMs  int64
}

func (s *Store) UpsertPresence(ctx context.Context, tx *sql.Tx, p Presence) error {
	online := 0
	if p.Online {
		online = 1
	}
	_, err := tx.ExecContext(ctx, `
INSERT INTO user_presence (user_id, is_online, last_seen_at_ms, platform, app_version, device_brand, updated_at_ms)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(user_id) DO UPDATE SET
  is_online=excluded.is_online,
  last_seen_at_ms=excluded.last_seen_at_ms,
  platform=excluded.platform,
  app_version=excluded.app_version,
  device_brand=excluded.device_brand,
  updated_at_ms=excluded.updated_at_ms`,
		p.UserID, online, p.LastSeenAtMs,
		nullIfEmpty(p.Platform), nullIfEmpty(p.AppVersion), nullIfEmpty(p.DeviceBrand),
		p.UpdatedAtMs,
	)
	if err != nil {
		return fmt.Errorf("upsert presence: %w", err)
	}
	return nil
}

func (s *Store) ListTimedOut(ctx context.Context, cutoffMs int64) ([]int64, error) {
	rows, err := s.write.QueryContext(ctx, `
SELECT user_id FROM user_presence
WHERE is_online=1 AND last_seen_at_ms < ?`, cutoffMs)
	if err != nil {
		return nil, fmt.Errorf("list timed out: %w", err)
	}
	defer rows.Close()
	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (s *Store) CountOnline(ctx context.Context) (int64, error) {
	var n int64
	err := s.read.QueryRowContext(ctx, `SELECT COUNT(*) FROM user_presence WHERE is_online=1`).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count online: %w", err)
	}
	return n, nil
}

func (s *Store) LastHeartbeatMs(ctx context.Context, tx *sql.Tx, userID int64) (int64, bool, error) {
	var ms sql.NullInt64
	err := tx.QueryRowContext(ctx, `
SELECT received_at_ms FROM events
WHERE user_id=? AND event_type='heartbeat'
ORDER BY received_at_ms DESC LIMIT 1`, userID).Scan(&ms)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	if !ms.Valid {
		return 0, false, nil
	}
	return ms.Int64, true, nil
}
