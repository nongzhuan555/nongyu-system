package presence

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"nongyu-go-track-server/internal/store/sqlite"
	"nongyu-go-track-server/internal/usersync"
)

type Scanner struct {
	store   *sqlite.Store
	syncer  *usersync.Syncer
	offline time.Duration
	log     *slog.Logger
	now     func() time.Time
	stop    chan struct{}
	done    chan struct{}
}

func NewScanner(store *sqlite.Store, syncer *usersync.Syncer, offlineAfter time.Duration, log *slog.Logger) *Scanner {
	return &Scanner{
		store:   store,
		syncer:  syncer,
		offline: offlineAfter,
		log:     log,
		now:     time.Now,
		stop:    make(chan struct{}),
		done:    make(chan struct{}),
	}
}

func (s *Scanner) Start() {
	go s.loop()
}

func (s *Scanner) Stop() {
	close(s.stop)
	<-s.done
}

func (s *Scanner) loop() {
	defer close(s.done)
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	s.ScanOnce()
	for {
		select {
		case <-s.stop:
			return
		case <-ticker.C:
			s.ScanOnce()
		}
	}
}

// ScanOnce 将超时用户置离线并回写 Node。
func (s *Scanner) ScanOnce() {
	now := s.now()
	cutoff := now.UTC().UnixMilli() - s.offline.Milliseconds()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	ids, err := s.store.ListTimedOut(ctx, cutoff)
	if err != nil {
		s.log.Error("presence scan failed", "err", err)
		return
	}
	if len(ids) == 0 {
		return
	}
	ms := now.UTC().UnixMilli()
	err = s.store.WithWriteTx(ctx, func(tx *sql.Tx) error {
		for _, id := range ids {
			if err := s.store.UpsertPresence(ctx, tx, sqlite.Presence{
				UserID:       id,
				Online:       false,
				LastSeenAtMs: cutoff,
				UpdatedAtMs:  ms,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		s.log.Error("presence offline write failed", "err", err)
		return
	}
	for _, id := range ids {
		s.syncer.Notify(id, false, ms)
	}
}

func SetOffline(ctx context.Context, store *sqlite.Store, syncer *usersync.Syncer, userID int64, now time.Time) error {
	ms := now.UTC().UnixMilli()
	err := store.WithWriteTx(ctx, func(tx *sql.Tx) error {
		return store.UpsertPresence(ctx, tx, sqlite.Presence{
			UserID:       userID,
			Online:       false,
			LastSeenAtMs: ms,
			UpdatedAtMs:  ms,
		})
	})
	if err != nil {
		return err
	}
	syncer.Notify(userID, false, ms)
	return nil
}
