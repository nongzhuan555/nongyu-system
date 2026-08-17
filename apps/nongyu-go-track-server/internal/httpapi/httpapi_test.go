package httpapi

import (
	"bytes"
	"context"
	"database/sql"
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

func TestHTTP_InternalLlmProxyFail(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "track-internal.db")
	ctx := context.Background()
	store, err := sqlite.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

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

	payload := map[string]any{
		"user_id":    42,
		"student_no": "202399910",
		"events": []map[string]any{{
			"event_id":     "22222222-2222-4222-8222-222222222222",
			"event_type":   "llm_proxy_fail",
			"event_name":   "50210",
			"client_ts_ms": time.Now().UnixMilli(),
			"props": map[string]any{
				"error_code":    50210,
				"error_message": "平台模型调用失败",
				"model":         "glm-4.7-flash",
				"stream":        true,
			},
		}},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/internal/events", bytes.NewReader(body))
	req.Header.Set("X-Internal-Token", cfg.InternalToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("internal ingest %d %s", resp.StatusCode, raw)
	}
	var envelope struct {
		OK   bool `json:"ok"`
		Data struct {
			Accepted int `json:"accepted"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatal(err)
	}
	if !envelope.OK || envelope.Data.Accepted != 1 {
		t.Fatalf("envelope %+v %s", envelope, raw)
	}

	// bad token
	req, _ = http.NewRequest(http.MethodPost, srv.URL+"/v1/internal/events", bytes.NewReader(body))
	req.Header.Set("X-Internal-Token", "wrong")
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 403 {
		t.Fatalf("want 403 got %d", resp.StatusCode)
	}
	_ = resp.Body.Close()
}

func TestHTTP_OverviewTodayIgnoresStaleMetrics(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "track-live.db")
	ctx := context.Background()
	store, err := sqlite.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

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

	token := signApp(t, cfg.JWTSecret, 7)
	payload := map[string]any{
		"events": []map[string]any{{
			"event_id":   "22222222-2222-4222-8222-222222222222",
			"event_type": "app_open",
			"event_name": "cold",
			"platform":   "android",
		}},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/track/events", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("ingest %d %s", resp.StatusCode, raw)
	}

	date := bizday.StatDate(time.Now())
	nowMs := time.Now().UTC().UnixMilli()
	// 写入「脏」当日指标：dau=0 但 app_open_count>0（旧逻辑会因此跳过 live）
	err = store.WithWriteTx(ctx, func(tx *sql.Tx) error {
		if err := store.UpsertMetric(ctx, tx, date, "dau", 0, nowMs); err != nil {
			return err
		}
		return store.UpsertMetric(ctx, tx, date, "app_open_count", 99, nowMs)
	})
	if err != nil {
		t.Fatal(err)
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
			DAU          int64 `json:"dau"`
			AppOpenCount int64 `json:"app_open_count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &ov); err != nil {
		t.Fatal(err)
	}
	if ov.Data.DAU != 1 {
		t.Fatalf("want live dau=1 got %d body=%s", ov.Data.DAU, raw)
	}
	if ov.Data.AppOpenCount != 1 {
		t.Fatalf("want live app_open_count=1 got %d body=%s", ov.Data.AppOpenCount, raw)
	}
}

func TestHTTP_DimsTodayLiveFromEvents(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "track-dims.db")
	ctx := context.Background()
	store, err := sqlite.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

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

	token := signApp(t, cfg.JWTSecret, 8)
	payload := map[string]any{
		"events": []map[string]any{
			{
				"event_id":   "33333333-3333-4333-8333-333333333333",
				"event_type": "screen_view",
				"event_name": "/home",
				"platform":   "android",
			},
			{
				"event_id":    "44444444-4444-4444-8444-444444444444",
				"event_type":  "perf",
				"event_name":  "home_render",
				"duration_ms": 120,
				"platform":    "android",
			},
		},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/track/events", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("ingest %d %s", resp.StatusCode, raw)
	}

	date := bizday.StatDate(time.Now())
	req, _ = http.NewRequest(
		http.MethodGet,
		srv.URL+"/v1/admin/metrics/dims?metric=screen_views&date="+date+"&limit=20",
		nil,
	)
	req.Header.Set("X-Internal-Token", cfg.InternalToken)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("dims screens %d %s", resp.StatusCode, raw)
	}
	var screens struct {
		Data struct {
			Items []struct {
				DimValue    string `json:"dim_value"`
				MetricValue int64  `json:"metric_value"`
			} `json:"items"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &screens); err != nil {
		t.Fatal(err)
	}
	if len(screens.Data.Items) != 1 || screens.Data.Items[0].DimValue != "/home" || screens.Data.Items[0].MetricValue != 1 {
		t.Fatalf("screen dims unexpected: %s", raw)
	}

	req, _ = http.NewRequest(
		http.MethodGet,
		srv.URL+"/v1/admin/metrics/dims?metric=perf_p50&date="+date+"&limit=20",
		nil,
	)
	req.Header.Set("X-Internal-Token", cfg.InternalToken)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("dims perf %d %s", resp.StatusCode, raw)
	}
	var perf struct {
		Data struct {
			Items []struct {
				DimValue    string `json:"dim_value"`
				MetricValue int64  `json:"metric_value"`
			} `json:"items"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &perf); err != nil {
		t.Fatal(err)
	}
	if len(perf.Data.Items) != 1 || perf.Data.Items[0].DimValue != "home_render" || perf.Data.Items[0].MetricValue != 120 {
		t.Fatalf("perf dims unexpected: %s", raw)
	}
}

func TestHTTP_TrendTodayLiveFromEvents(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "track-trend.db")
	ctx := context.Background()
	store, err := sqlite.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

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

	token := signApp(t, cfg.JWTSecret, 11)
	payload := map[string]any{
		"events": []map[string]any{{
			"event_id":   "33333333-3333-4333-8333-333333333333",
			"event_type": "app_open",
			"event_name": "cold",
			"platform":   "android",
		}},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/track/events", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("ingest %d", resp.StatusCode)
	}

	today := bizday.StatDate(time.Now())
	req, _ = http.NewRequest(
		http.MethodGet,
		srv.URL+"/v1/admin/metrics/trend?metric=dau&from="+today+"&to="+today,
		nil,
	)
	req.Header.Set("X-Internal-Token", cfg.InternalToken)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("trend %d %s", resp.StatusCode, raw)
	}
	var tr struct {
		Data []struct {
			Date  string `json:"date"`
			Value int64  `json:"value"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &tr); err != nil {
		t.Fatal(err)
	}
	if len(tr.Data) != 1 || tr.Data[0].Date != today || tr.Data[0].Value != 1 {
		t.Fatalf("want today dau=1 got %s", raw)
	}
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
