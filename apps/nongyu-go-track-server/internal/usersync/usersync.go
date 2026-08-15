package usersync

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

type task struct {
	UserID       int64
	Online       bool
	LastActiveMs int64
}

type Syncer struct {
	baseURL string
	token   string
	client  *http.Client
	log     *slog.Logger

	mu       sync.Mutex
	pending  []task
	lastSent map[int64]sent
	wake     chan struct{}
	stop     chan struct{}
	wg       sync.WaitGroup
	coalesce time.Duration
}

type sent struct {
	at     time.Time
	online bool
}

func New(baseURL, token string, log *slog.Logger) *Syncer {
	s := &Syncer{
		baseURL:  baseURL,
		token:    token,
		client:   &http.Client{Timeout: 5 * time.Second},
		log:      log,
		lastSent: map[int64]sent{},
		wake:     make(chan struct{}, 1),
		stop:     make(chan struct{}),
		coalesce: 30 * time.Second,
	}
	s.wg.Add(1)
	go s.loop()
	return s
}

func (s *Syncer) Stop() {
	close(s.stop)
	s.wg.Wait()
}

// Notify 入队回写；失败由后台重试。请求取消不得打断回写。
func (s *Syncer) Notify(userID int64, online bool, lastActiveMs int64) {
	s.mu.Lock()
	s.pending = append(s.pending, task{UserID: userID, Online: online, LastActiveMs: lastActiveMs})
	s.mu.Unlock()
	select {
	case s.wake <- struct{}{}:
	default:
	}
}

func (s *Syncer) loop() {
	defer s.wg.Done()
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-s.stop:
			s.flushOnce()
			return
		case <-s.wake:
			s.flushOnce()
		case <-ticker.C:
			s.flushOnce()
		}
	}
}

func (s *Syncer) flushOnce() {
	s.mu.Lock()
	batch := s.pending
	s.pending = nil
	s.mu.Unlock()
	if len(batch) == 0 {
		return
	}

	latest := map[int64]task{}
	for _, t := range batch {
		latest[t.UserID] = t
	}

	var retry []task
	now := time.Now()
	for _, t := range latest {
		if t.Online && s.skipCoalesce(t.UserID, true, now) {
			continue
		}
		if err := s.post(t); err != nil {
			s.log.Warn("usersync failed", "user_id", t.UserID, "err", err)
			retry = append(retry, t)
			continue
		}
		s.mu.Lock()
		s.lastSent[t.UserID] = sent{at: now, online: t.Online}
		s.mu.Unlock()
	}
	if len(retry) > 0 {
		s.mu.Lock()
		s.pending = append(retry, s.pending...)
		s.mu.Unlock()
	}
}

func (s *Syncer) skipCoalesce(userID int64, online bool, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	prev, ok := s.lastSent[userID]
	if !ok {
		return false
	}
	return prev.online == online && now.Sub(prev.at) < s.coalesce
}

func (s *Syncer) post(t task) error {
	body, err := json.Marshal(map[string]any{
		"user_id":           t.UserID,
		"is_online":         boolToInt(t.Online),
		"last_active_at_ms": t.LastActiveMs,
	})
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/api/internal/users/presence", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", s.token)
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		// 用户不存在不重试，避免队列卡死
		return nil
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("node status %d", resp.StatusCode)
	}
	return nil
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}
