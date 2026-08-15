package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"nongyu-go-track-server/internal/aggregate"
	"nongyu-go-track-server/internal/config"
	"nongyu-go-track-server/internal/httpapi"
	"nongyu-go-track-server/internal/ingest"
	"nongyu-go-track-server/internal/presence"
	"nongyu-go-track-server/internal/store/sqlite"
	"nongyu-go-track-server/internal/usersync"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}

	ctx := context.Background()
	store, err := sqlite.Open(ctx, cfg.DBPath)
	if err != nil {
		log.Error("sqlite open", "err", err)
		os.Exit(1)
	}
	defer func() { _ = store.Close() }()

	syncer := usersync.New(cfg.NodeInternalBaseURL, cfg.NodeInternalToken, log)
	writer := ingest.NewWriter(store, syncer, cfg.WriteQueueSize)
	jobs := aggregate.New(store, log)
	scanner := presence.NewScanner(store, syncer, cfg.PresenceOfflineAfter, log)

	jobs.Start()
	scanner.Start()

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           httpapi.New(cfg, store, writer, syncer, jobs, log),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Info("listen", "addr", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("http", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	scanner.Stop()
	jobs.Stop()
	writer.Stop()
	syncer.Stop()
	log.Info("stopped")
}
