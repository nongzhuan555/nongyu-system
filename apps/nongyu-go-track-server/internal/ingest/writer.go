package ingest

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"time"

	"nongyu-go-track-server/internal/bizday"
	"nongyu-go-track-server/internal/store/sqlite"
	"nongyu-go-track-server/internal/usersync"
)

var ErrQueueFull = errors.New("write queue full")

const heartbeatSample = 5 * time.Minute

type BatchIn struct {
	UserID    int64
	StudentNo string
	Events    []RawEvent
	Now       time.Time
}

type BatchOut struct {
	Accepted   int
	Duplicated int
	Rejected   int
	Errors     []ItemError
}

type job struct {
	in  BatchIn
	out chan batchRes
}

type batchRes struct {
	out BatchOut
	err error
}

type Writer struct {
	store  *sqlite.Store
	syncer *usersync.Syncer
	ch     chan job
	stop   chan struct{}
	wg     sync.WaitGroup

	mu            sync.Mutex
	lastHeartbeat map[int64]time.Time
}

func NewWriter(store *sqlite.Store, syncer *usersync.Syncer, queueSize int) *Writer {
	w := &Writer{
		store:         store,
		syncer:        syncer,
		ch:            make(chan job, queueSize),
		stop:          make(chan struct{}),
		lastHeartbeat: map[int64]time.Time{},
	}
	w.wg.Add(1)
	go w.loop()
	return w
}

func (w *Writer) Stop() {
	close(w.stop)
	w.wg.Wait()
}

// Enqueue 入队后由单 writer 落库；队列满返回 ErrQueueFull。
func (w *Writer) Enqueue(ctx context.Context, in BatchIn) (BatchOut, error) {
	resCh := make(chan batchRes, 1)
	j := job{in: in, out: resCh}
	select {
	case w.ch <- j:
	default:
		return BatchOut{}, ErrQueueFull
	}
	select {
	case r := <-resCh:
		return r.out, r.err
	case <-ctx.Done():
		return BatchOut{}, ctx.Err()
	}
}

func (w *Writer) loop() {
	defer w.wg.Done()
	for {
		select {
		case <-w.stop:
			return
		case j := <-w.ch:
			out, err := w.process(j.in)
			j.out <- batchRes{out: out, err: err}
		}
	}
}

func (w *Writer) process(in BatchIn) (BatchOut, error) {
	out := BatchOut{Errors: make([]ItemError, 0)}
	now := in.Now
	if now.IsZero() {
		now = time.Now()
	}
	received := now.UTC().UnixMilli()
	statDate := bizday.StatDate(now)

	type pending struct {
		fields     *EventFields
		skipInsert bool
	}
	okItems := make([]pending, 0, len(in.Events))
	for _, raw := range in.Events {
		fields, ierr := ValidateOne(raw)
		if ierr != nil {
			out.Rejected++
			out.Errors = append(out.Errors, *ierr)
			continue
		}
		skip := false
		if fields.EventType == "heartbeat" && w.shouldSampleSkip(in.UserID, now) {
			skip = true
		}
		okItems = append(okItems, pending{fields: fields, skipInsert: skip})
	}

	writeCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var platform, appVer, brand string
	err := w.store.WithWriteTx(writeCtx, func(tx *sql.Tx) error {
		for _, item := range okItems {
			if item.skipInsert {
				out.Accepted++
				w.markHeartbeat(in.UserID, now)
				continue
			}
			dup, err := w.store.InsertEvent(writeCtx, tx, sqlite.EventRow{
				EventID:      item.fields.EventID,
				UserID:       in.UserID,
				StudentNo:    firstNonEmpty(item.fields.StudentNo, in.StudentNo),
				EventType:    item.fields.EventType,
				EventName:    item.fields.EventName,
				AppVersion:   item.fields.AppVersion,
				Platform:     item.fields.Platform,
				DeviceBrand:  item.fields.DeviceBrand,
				SessionID:    item.fields.SessionID,
				DurationMs:   item.fields.DurationMs,
				PropsJSON:    item.fields.PropsJSON,
				ClientTsMs:   item.fields.ClientTsMs,
				ReceivedAtMs: received,
				StatDate:     statDate,
			})
			if err != nil {
				return err
			}
			if dup {
				out.Duplicated++
			} else {
				out.Accepted++
				if item.fields.EventType == "heartbeat" {
					w.markHeartbeat(in.UserID, now)
				}
			}
			if item.fields.Platform != "" {
				platform = item.fields.Platform
			}
			if item.fields.AppVersion != "" {
				appVer = item.fields.AppVersion
			}
			if item.fields.DeviceBrand != "" {
				brand = item.fields.DeviceBrand
			}
		}
		if len(okItems) == 0 {
			return nil
		}
		return w.store.UpsertPresence(writeCtx, tx, sqlite.Presence{
			UserID:       in.UserID,
			Online:       true,
			LastSeenAtMs: received,
			Platform:     platform,
			AppVersion:   appVer,
			DeviceBrand:  brand,
			UpdatedAtMs:  received,
		})
	})
	if err != nil {
		return BatchOut{}, err
	}
	if len(okItems) > 0 && w.syncer != nil {
		w.syncer.Notify(in.UserID, true, received)
	}
	return out, nil
}

func (w *Writer) shouldSampleSkip(userID int64, now time.Time) bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	last, ok := w.lastHeartbeat[userID]
	if !ok {
		return false
	}
	return now.Sub(last) < heartbeatSample
}

func (w *Writer) markHeartbeat(userID int64, now time.Time) {
	w.mu.Lock()
	w.lastHeartbeat[userID] = now
	w.mu.Unlock()
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}
