package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config 来自环境变量；缺必填项时进程不得启动。
type Config struct {
	HTTPAddr             string
	DBPath               string
	JWTSecret            string
	InternalToken        string
	NodeInternalBaseURL  string
	NodeInternalToken    string
	PresenceOfflineAfter time.Duration
	WriteQueueSize       int
	BodyLimitBytes       int64
	UserRatePerMin       int
	IPRatePerMin         int
}

func Load() (*Config, error) {
	cfg := &Config{
		WriteQueueSize: 128,
		BodyLimitBytes: 1 << 20,
		UserRatePerMin: 120,
		IPRatePerMin:   300,
	}
	var err error
	if cfg.HTTPAddr, err = required("HTTP_ADDR"); err != nil {
		return nil, err
	}
	if cfg.DBPath, err = required("DB_PATH"); err != nil {
		return nil, err
	}
	if cfg.JWTSecret, err = required("JWT_SECRET"); err != nil {
		return nil, err
	}
	if cfg.InternalToken, err = required("INTERNAL_TOKEN"); err != nil {
		return nil, err
	}
	if cfg.NodeInternalBaseURL, err = required("NODE_INTERNAL_BASE_URL"); err != nil {
		return nil, err
	}
	cfg.NodeInternalBaseURL = strings.TrimRight(cfg.NodeInternalBaseURL, "/")
	if cfg.NodeInternalToken, err = required("NODE_INTERNAL_TOKEN"); err != nil {
		return nil, err
	}

	offlineMs := int64(600000)
	if raw := strings.TrimSpace(os.Getenv("PRESENCE_OFFLINE_AFTER_MS")); raw != "" {
		n, parseErr := strconv.ParseInt(raw, 10, 64)
		if parseErr != nil || n < 1000 {
			return nil, fmt.Errorf("invalid PRESENCE_OFFLINE_AFTER_MS")
		}
		offlineMs = n
	}
	cfg.PresenceOfflineAfter = time.Duration(offlineMs) * time.Millisecond
	return cfg, nil
}

func required(key string) (string, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return "", fmt.Errorf("missing required env %s", key)
	}
	return v, nil
}
