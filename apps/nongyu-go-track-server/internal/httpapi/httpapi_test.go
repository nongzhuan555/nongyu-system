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

	jwtv5 "github.com/golang-jwt/jwt/v5"

	"nongyu-go-track-server/internal/aggregate"
	"nongyu-go-track-server/internal/bizday"
	"nongyu-go-track-server/internal/config"
	"nongyu-go-track-server/internal/ingest"
	"nongyu-go-track-server/internal/store/sqlite"
	"nongyu-go-track-server/internal/usersync"
)

func TestHTTP_IngestIdempotentAndAdmin(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "track.db")
	ctx := context.Background()
	store, err := sqlite.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

	node := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":0,"message":"ok","data":null}`))
	}))
	t.Cleanup(node.Close)

	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := &config.Config{
		HTTPAddr:             "127.0.0.1:0",
		DBPath:               dbPath,
		JWTSecret:            "test-secret-key-16",
		InternalToken:        "internal-token-16x",
		NodeInternalBaseURL:  node.URL,
		NodeInternalToken:    "internal-token-16x",
		PresenceOfflineAfter: 10 * time.Minute,
		WriteQueueSize:       128,
		BodyLimitBytes:       1 << 20,
		UserRatePerMin:       1200,
		IPRatePerMin:         3000,
	}
	syncer := usersync.New(cfg.NodeInternalBaseURL, cfg.NodeInternalToken, log)
	t.Cleanup(syncer.Stop)
	writer := ingest.NewWriter(store, syncer, cfg.WriteQueueSize)
	t.Cleanup(writer.Stop)
	jobs := aggregate.New(store, log)

	srv := httptest.NewServer(New(cfg, store, writer, syncer, jobs, log))
	t.Cleanup(srv.Close)

	// health
	resp, err := http.Get(srv.URL + "/health")
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("health %d", resp.StatusCode)
	}
	_ = resp.Body.Close()

	// unauthorized
	resp, err = http.Post(srv.URL+"/v1/track/events", "application/json", bytes.NewBufferString(`{"events":[]}`))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 401 {
		t.Fatalf("want 401 got %d", resp.StatusCode)
	}
	_ = resp.Body.Close()

	token := signApp(t, cfg.JWTSecret, 99)
	payload := map[string]any{
		"events": []map[string]any{{
			"event_id":   "11111111-1111-4111-8111-111111111111",
			"event_type": "app_open",
			"event_name": "cold",
			"platform":   "android",
		}},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/track/events", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("ingest %d %s", resp.StatusCode, raw)
	}

	// duplicate
	req, _ = http.NewRequest(http.MethodPost, srv.URL+"/v1/track/events", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	var envelope struct {
		OK   bool `json:"ok"`
		Data struct {
			Accepted   int `json:"accepted"`
			Duplicated int `json:"duplicated"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.Data.Duplicated != 1 {
		t.Fatalf("dup %+v %s", envelope, raw)
	}

	date := bizday.StatDate(time.Now())
	aggBody, _ := json.Marshal(map[string]string{"stat_date": date})
	req, _ = http.NewRequest(http.MethodPost, srv.URL+"/v1/admin/jobs/aggregate", bytes.NewReader(aggBody))
	req.Header.Set("X-Internal-Token", cfg.InternalToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("agg %d %s", resp.StatusCode, raw)
	}

	req, _ = http.NewRequest(http.MethodGet, srv.URL+"/v1/admin/overview?date="+date, nil)
	req.Header.Set("X-Internal-Token", cfg.InternalToken)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("overview %d %s", resp.StatusCode, raw)
	}
	var ov struct {
		Data struct {
			DAU int64 `json:"dau"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &ov); err != nil {
		t.Fatal(err)
	}
	if ov.Data.DAU != 1 {
		t.Fatalf("dau=%d body=%s", ov.Data.DAU, raw)
	}

	req, _ = http.NewRequest(http.MethodGet, srv.URL+"/v1/admin/overview?date="+date, nil)
	req.Header.Set("X-Internal-Token", "wrong")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 403 {
		t.Fatalf("want 403 got %d", resp.StatusCode)
	}
	_ = resp.Body.Close()
}

func signApp(t *testing.T, secret string, uid int64) string {
	t.Helper()
	tok := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, jwtv5.MapClaims{
		"uid":          float64(uid),
		"typ":          "app",
		"studentNo":    "202300001",
		"tokenVersion": float64(1),
		"exp":          time.Now().Add(time.Hour).Unix(),
	})
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}
