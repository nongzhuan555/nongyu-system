package aggregate

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"time"

	"nongyu-go-track-server/internal/bizday"
	"nongyu-go-track-server/internal/store/sqlite"
)

type Jobs struct {
	store *sqlite.Store
	log   *slog.Logger
	now   func() time.Time
	stop  chan struct{}
	done  chan struct{}

	lastAggMin   int
	lastPurgeMin int
}

func New(store *sqlite.Store, log *slog.Logger) *Jobs {
	return &Jobs{
		store:        store,
		log:          log,
		now:          time.Now,
		stop:         make(chan struct{}),
		done:         make(chan struct{}),
		lastAggMin:   -1,
		lastPurgeMin: -1,
	}
}

func (j *Jobs) Start() {
	go j.loop()
}

func (j *Jobs) Stop() {
	close(j.stop)
	<-j.done
}

func (j *Jobs) loop() {
	defer close(j.done)
	j.startupBackfill()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-j.stop:
			return
		case <-ticker.C:
			j.tick()
		}
	}
}

func (j *Jobs) startupBackfill() {
	yesterday := bizday.Yesterday(j.now())
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	st, ok, err := j.store.JobStatus(ctx, "aggregate_daily", "stat_date="+yesterday)
	if err != nil {
		j.log.Error("check aggregate job", "err", err)
		return
	}
	if ok && st == "success" {
		return
	}
	if _, err := j.RunAggregate(ctx, yesterday); err != nil {
		j.log.Error("startup aggregate failed", "date", yesterday, "err", err)
	}
}

func (j *Jobs) tick() {
	now := j.now().In(bizday.Location())
	minute := now.Hour()*60 + now.Minute()
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	if now.Hour() == 0 && now.Minute() == 10 && j.lastAggMin != minute {
		j.lastAggMin = minute
		date := bizday.Yesterday(now)
		if _, err := j.RunAggregate(ctx, date); err != nil {
			j.log.Error("scheduled aggregate failed", "date", date, "err", err)
		}
	}
	if now.Hour() == 3 && now.Minute() == 0 && j.lastPurgeMin != minute {
		j.lastPurgeMin = minute
		if _, err := j.RunPurge(ctx); err != nil {
			j.log.Error("scheduled purge failed", "err", err)
		}
	}

	n, err := j.store.CountOnline(ctx)
	if err != nil {
		j.log.Warn("online sample failed", "err", err)
		return
	}
	if err := j.store.BumpPeak(ctx, bizday.StatDate(now), n, now.UTC().UnixMilli()); err != nil {
		j.log.Warn("online peak bump failed", "err", err)
	}
}

func (j *Jobs) RunAggregate(ctx context.Context, date string) (string, error) {
	key := "stat_date=" + date
	nowMs := j.now().UTC().UnixMilli()
	err := j.store.WithWriteTx(ctx, func(tx *sql.Tx) error {
		dau, err := j.store.CountDistinctDAU(ctx, tx, date)
		if err != nil {
			return err
		}
		appOpen, err := j.store.CountByType(ctx, tx, date, "app_open")
		if err != nil {
			return err
		}
		screens, err := j.store.CountByType(ctx, tx, date, "screen_view")
		if err != nil {
			return err
		}
		clicks, err := j.store.CountByType(ctx, tx, date, "button_click")
		if err != nil {
			return err
		}
		crashes, err := j.store.CountByType(ctx, tx, date, "crash")
		if err != nil {
			return err
		}
		if err := j.store.UpsertMetric(ctx, tx, date, "dau", dau, nowMs); err != nil {
			return err
		}
		if err := j.store.UpsertMetric(ctx, tx, date, "app_open_count", appOpen, nowMs); err != nil {
			return err
		}
		if err := j.store.UpsertMetric(ctx, tx, date, "screen_view_count", screens, nowMs); err != nil {
			return err
		}
		if err := j.store.UpsertMetric(ctx, tx, date, "button_click_count", clicks, nowMs); err != nil {
			return err
		}
		if err := j.store.UpsertMetric(ctx, tx, date, "crash_count", crashes, nowMs); err != nil {
			return err
		}

		screenDims, err := j.store.CountByName(ctx, tx, date, "screen_view")
		if err != nil {
			return err
		}
		if err := j.store.ReplaceDims(ctx, tx, date, "screen_views", nowMs, screenDims); err != nil {
			return err
		}
		clickDims, err := j.store.CountByName(ctx, tx, date, "button_click")
		if err != nil {
			return err
		}
		if err := j.store.ReplaceDims(ctx, tx, date, "button_clicks", nowMs, clickDims); err != nil {
			return err
		}

		perf, err := j.store.PerfDurations(ctx, tx, date)
		if err != nil {
			return err
		}
		p50 := make([]sqlite.DimRow, 0)
		p95 := make([]sqlite.DimRow, 0)
		for name, vals := range perf {
			sort.Slice(vals, func(i, k int) bool { return vals[i] < vals[k] })
			p50 = append(p50, sqlite.DimRow{DimKey: "name", DimValue: name, MetricValue: sqlite.Percentile(vals, 50)})
			p95 = append(p95, sqlite.DimRow{DimKey: "name", DimValue: name, MetricValue: sqlite.Percentile(vals, 95)})
		}
		if err := j.store.ReplaceDims(ctx, tx, date, "perf_p50", nowMs, p50); err != nil {
			return err
		}
		return j.store.ReplaceDims(ctx, tx, date, "perf_p95", nowMs, p95)
	})
	status := "success"
	detail := ""
	if err != nil {
		status = "failed"
		b, _ := json.Marshal(map[string]string{"error": err.Error()})
		detail = string(b)
		_ = j.store.RecordJob(ctx, "aggregate_daily", key, status, nowMs, detail)
		return status, err
	}
	if recErr := j.store.RecordJob(ctx, "aggregate_daily", key, status, nowMs, detail); recErr != nil {
		return status, recErr
	}
	return status, nil
}

func (j *Jobs) RunPurge(ctx context.Context) (int64, error) {
	cutoff := j.now().UTC().Add(-30 * 24 * time.Hour).UnixMilli()
	n, err := j.store.PurgeEvents(ctx, cutoff)
	nowMs := j.now().UTC().UnixMilli()
	key := fmt.Sprintf("at=%d", nowMs)
	status := "success"
	detail := ""
	if err != nil {
		status = "failed"
		b, _ := json.Marshal(map[string]string{"error": err.Error()})
		detail = string(b)
		_ = j.store.RecordJob(ctx, "purge_events", key, status, nowMs, detail)
		return 0, err
	}
	b, _ := json.Marshal(map[string]int64{"deleted": n})
	detail = string(b)
	if recErr := j.store.RecordJob(ctx, "purge_events", key, status, nowMs, detail); recErr != nil {
		return n, recErr
	}
	return n, nil
}
