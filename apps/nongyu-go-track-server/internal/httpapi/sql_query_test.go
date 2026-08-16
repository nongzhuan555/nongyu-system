package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"nongyu-go-track-server/internal/aggregate"
	"nongyu-go-track-server/internal/config"
	"nongyu-go-track-server/internal/ingest"
	"nongyu-go-track-server/internal/store/sqlite"
)

func TestHTTP_SQLQuery(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "track-sql.db")
	ctx := context.Background()
	store, err := sqlite.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

	_, err = store.WriteDB().ExecContext(
		ctx,
		`INSERT INTO daily_metrics(stat_date, metric_key, metric_value, updated_at_ms)
VALUES ('2026-08-16', 'dau', 42, 1)`,
	)
	if err != nil {
		t.Fatal(err)
	}

	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := &config.Config{
		HTTPAddr:             "127.0.0.1:0",
		DBPath:               dbPath,
		JWTSecret:            "test-secret-key-16",
		InternalToken:        "internal-token-16x",
		PresenceOfflineAfter: 10 * time.Minute,
		WriteQueueSize:       128,
		BodyLimitBytes:       1 << 20,
		UserRatePerMin:       1200,
		IPRatePerMin:         3000,
	}
	writer := ingest.NewWriter(store, nil, cfg.WriteQueueSize)
	t.Cleanup(writer.Stop)
	jobs := aggregate.New(store, log)
	srv := httptest.NewServer(New(cfg, store, writer, nil, jobs, log))
	t.Cleanup(srv.Close)

	post := func(sqlText, token string) (int, []byte) {
		t.Helper()
		body, _ := json.Marshal(map[string]string{"sql": sqlText})
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/admin/sql/query", bytes.NewReader(body))
		req.Header.Set("X-Internal-Token", token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		return resp.StatusCode, raw
	}

	status, raw := post("SELECT metric_key, metric_value FROM daily_metrics", cfg.InternalToken)
	if status != 200 {
		t.Fatalf("ok query %d %s", status, raw)
	}
	var envelope struct {
		OK   bool `json:"ok"`
		Data struct {
			Columns   []string         `json:"columns"`
			Rows      []map[string]any `json:"rows"`
			Truncated bool             `json:"truncated"`
			RowCount  int              `json:"row_count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatal(err)
	}
	if !envelope.OK || envelope.Data.RowCount != 1 || envelope.Data.Truncated {
		t.Fatalf("envelope %+v %s", envelope, raw)
	}

	status, raw = post("DELETE FROM daily_metrics", cfg.InternalToken)
	if status != 400 {
		t.Fatalf("delete want 400 got %d %s", status, raw)
	}
	var fail struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &fail); err != nil {
		t.Fatal(err)
	}
	if fail.Error.Code != "INVALID_SQL" {
		t.Fatalf("code %s %s", fail.Error.Code, raw)
	}

	status, raw = post("SELECT * FROM meta_jobs", cfg.InternalToken)
	if status != 400 {
		t.Fatalf("meta_jobs want 400 got %d %s", status, raw)
	}

	status, _ = post("SELECT 1 FROM daily_metrics", "wrong")
	if status != 403 {
		t.Fatalf("want 403 got %d", status)
	}
}
