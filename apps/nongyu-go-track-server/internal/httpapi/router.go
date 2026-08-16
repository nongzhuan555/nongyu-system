package httpapi

import (
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"nongyu-go-track-server/internal/aggregate"
	"nongyu-go-track-server/internal/config"
	"nongyu-go-track-server/internal/ingest"
	"nongyu-go-track-server/internal/store/sqlite"
	"nongyu-go-track-server/internal/usersync"
)

type API struct {
	cfg    *config.Config
	store  *sqlite.Store
	writer *ingest.Writer
	syncer *usersync.Syncer
	jobs   *aggregate.Jobs
	log    *slog.Logger
	now    func() time.Time
	live   struct {
		mu    sync.Mutex
		date  string
		at    time.Time
		value map[string]any
	}
}

func New(cfg *config.Config, store *sqlite.Store, writer *ingest.Writer, syncer *usersync.Syncer, jobs *aggregate.Jobs, log *slog.Logger) http.Handler {
	api := &API{
		cfg:    cfg,
		store:  store,
		writer: writer,
		syncer: syncer,
		jobs:   jobs,
		log:    log,
		now:    time.Now,
	}
	ipLim := newLimiter(cfg.IPRatePerMin)
	userLim := newLimiter(cfg.UserRatePerMin)

	r := chi.NewRouter()
	r.Use(recoverMiddleware(log))
	r.Use(requestIDMiddleware)
	r.Use(slogMiddleware(log))
	r.Use(maxBytes(cfg.BodyLimitBytes))
	r.Use(rateByIP(ipLim))

	r.Get("/health", api.handleHealth)

	r.Route("/v1/track", func(r chi.Router) {
		r.Use(appJWT(cfg.JWTSecret))
		r.Use(rateByUser(userLim))
		r.Post("/events", api.handleIngest)
		r.Post("/presence/offline", api.handleOffline)
	})

	r.Route("/v1/internal", func(r chi.Router) {
		r.Use(internalToken(cfg.InternalToken))
		r.Post("/events", api.handleInternalIngest)
	})

	r.Route("/v1/admin", func(r chi.Router) {
		r.Use(internalToken(cfg.InternalToken))
		r.Get("/overview", api.handleOverview)
		r.Get("/metrics/trend", api.handleTrend)
		r.Get("/metrics/dims", api.handleDims)
		r.Get("/crashes", api.handleCrashes)
		r.Get("/llm-proxy-fails", api.handleLlmProxyFails)
		r.Post("/jobs/aggregate", api.handleAggregate)
		r.Post("/jobs/purge", api.handlePurge)
	})

	return r
}
