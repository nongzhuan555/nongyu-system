package httpapi

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	appjwt "nongyu-go-track-server/internal/auth/jwt"
)

type ctxKey int

const (
	ctxUserID ctxKey = iota
	ctxStudentNo
	ctxRequestID
)

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimSpace(r.Header.Get("X-Request-Id"))
		if id == "" {
			id = time.Now().UTC().Format("20060102T150405.000000000")
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxRequestID, id)))
	})
}

func slogMiddleware(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &statusWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(rw, r)
			rid, _ := r.Context().Value(ctxRequestID).(string)
			uid, _ := r.Context().Value(ctxUserID).(int64)
			log.Info("http",
				"request_id", rid,
				"method", r.Method,
				"path", r.URL.Path,
				"status", rw.status,
				"ms", time.Since(start).Milliseconds(),
				"user_id", uid,
			)
		})
	}
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func maxBytes(limit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}

func recoverMiddleware(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					log.Error("panic", "err", rec)
					writeFail(w, http.StatusInternalServerError, "INTERNAL", "internal error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func appJWT(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := bearer(r)
			if raw == "" {
				writeFail(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing bearer token")
				return
			}
			claims, err := appjwt.ParseAppToken(raw, secret)
			if err != nil {
				writeFail(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token")
				return
			}
			ctx := context.WithValue(r.Context(), ctxUserID, claims.UID)
			ctx = context.WithValue(ctx, ctxStudentNo, claims.StudentNo)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func internalToken(expected string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			got := r.Header.Get("X-Internal-Token")
			if !tokenEqual(got, expected) {
				writeFail(w, http.StatusForbidden, "FORBIDDEN", "invalid internal token")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func tokenEqual(a, b string) bool {
	ha := sha256.Sum256([]byte(a))
	hb := sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(ha[:], hb[:]) == 1 && a != "" && b != ""
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return ""
	}
	return strings.TrimSpace(h[7:])
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

type limiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    float64
	burst   float64
}

type bucket struct {
	tokens float64
	last   time.Time
}

func newLimiter(perMin int) *limiter {
	return &limiter{
		buckets: map[string]*bucket{},
		rate:    float64(perMin) / 60,
		burst:   float64(perMin) / 6,
	}
}

func (l *limiter) allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	b := l.buckets[key]
	if b == nil {
		b = &bucket{tokens: l.burst, last: now}
		l.buckets[key] = b
	}
	elapsed := now.Sub(b.last).Seconds()
	b.tokens += elapsed * l.rate
	if b.tokens > l.burst {
		b.tokens = l.burst
	}
	b.last = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

func rateByIP(l *limiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !l.allow("ip:" + clientIP(r)) {
				writeFail(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func rateByUser(l *limiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid, _ := r.Context().Value(ctxUserID).(int64)
			if uid > 0 && !l.allow("u:"+strconv.FormatInt(uid, 10)) {
				writeFail(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func isMaxBytes(err error) bool {
	var maxErr *http.MaxBytesError
	return errors.As(err, &maxErr)
}
