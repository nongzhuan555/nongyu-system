package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"nongyu-go-track-server/internal/ingest"
	"nongyu-go-track-server/internal/presence"
)

type eventsBody struct {
	Events []ingest.RawEvent `json:"events"`
}

func (a *API) handleIngest(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(ctxUserID).(int64)
	studentNo, _ := r.Context().Value(ctxStudentNo).(string)

	var body eventsBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		if isMaxBytes(err) {
			writeFail(w, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", "body too large")
			return
		}
		writeFail(w, http.StatusBadRequest, "BAD_REQUEST", "invalid json")
		return
	}
	if len(body.Events) < 1 || len(body.Events) > 100 {
		writeFail(w, http.StatusBadRequest, "BAD_REQUEST", "events length must be 1-100")
		return
	}

	out, err := a.writer.Enqueue(r.Context(), ingest.BatchIn{
		UserID:    uid,
		StudentNo: studentNo,
		Events:    body.Events,
		Now:       a.now(),
	})
	if errors.Is(err, ingest.ErrQueueFull) {
		writeFail(w, http.StatusServiceUnavailable, "QUEUE_FULL", "write queue full")
		return
	}
	if err != nil {
		writeFail(w, http.StatusInternalServerError, "INTERNAL", "ingest failed")
		return
	}
	writeOK(w, http.StatusOK, map[string]any{
		"accepted":   out.Accepted,
		"duplicated": out.Duplicated,
		"rejected":   out.Rejected,
		"errors":     out.Errors,
	})
}

func (a *API) handleOffline(w http.ResponseWriter, r *http.Request) {
	uid, _ := r.Context().Value(ctxUserID).(int64)
	defer func() { _, _ = io.Copy(io.Discard, r.Body) }()
	if err := presence.SetOffline(r.Context(), a.store, a.syncer, uid, a.now()); err != nil {
		writeFail(w, http.StatusInternalServerError, "INTERNAL", "offline failed")
		return
	}
	writeOK(w, http.StatusOK, map[string]any{
		"user_id":   uid,
		"is_online": 0,
	})
}

func (a *API) handleHealth(w http.ResponseWriter, r *http.Request) {
	if err := a.store.Ping(r.Context()); err != nil {
		writeFail(w, http.StatusServiceUnavailable, "INTERNAL", "db not ok")
		return
	}
	writeOK(w, http.StatusOK, map[string]string{"status": "up", "db": "ok"})
}
