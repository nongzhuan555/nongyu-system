package ingest

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

const maxPropsBytes = 4096

var allowedTypes = map[string]struct{}{
	"screen_view":    {},
	"button_click":   {},
	"perf":           {},
	"app_open":       {},
	"heartbeat":      {},
	"crash":          {},
	"llm_proxy_fail": {},
}

type RawEvent struct {
	EventID     string          `json:"event_id"`
	EventType   string          `json:"event_type"`
	EventName   string          `json:"event_name"`
	ClientTsMs  *int64          `json:"client_ts_ms"`
	SessionID   string          `json:"session_id"`
	AppVersion  string          `json:"app_version"`
	Platform    string          `json:"platform"`
	DeviceBrand string          `json:"device_brand"`
	DurationMs  *int64          `json:"duration_ms"`
	StudentNo   string          `json:"student_no"`
	Props       json.RawMessage `json:"props"`
}

type ItemError struct {
	EventID string `json:"event_id"`
	Code    string `json:"code"`
	Message string `json:"message,omitempty"`
}

type Prepared struct {
	Row        EventFields
	SkipInsert bool
	Err        *ItemError
}

type EventFields struct {
	EventID     string
	EventType   string
	EventName   string
	AppVersion  string
	Platform    string
	DeviceBrand string
	SessionID   string
	DurationMs  *int64
	PropsJSON   string
	ClientTsMs  *int64
	StudentNo   string
}

// ValidateOne 校验单条事件；失败时返回 ItemError，不阻断整包。
func ValidateOne(raw RawEvent) (*EventFields, *ItemError) {
	id := strings.TrimSpace(raw.EventID)
	if id == "" {
		return nil, &ItemError{EventID: raw.EventID, Code: "INVALID_EVENT", Message: "event_id required"}
	}
	typ := strings.TrimSpace(raw.EventType)
	if _, ok := allowedTypes[typ]; !ok {
		return nil, &ItemError{EventID: id, Code: "INVALID_TYPE", Message: "unknown event_type"}
	}
	name := strings.TrimSpace(raw.EventName)
	if name == "" {
		return nil, &ItemError{EventID: id, Code: "INVALID_EVENT", Message: "event_name required"}
	}
	platform := strings.TrimSpace(raw.Platform)
	if platform != "" && platform != "ios" && platform != "android" {
		return nil, &ItemError{EventID: id, Code: "INVALID_EVENT", Message: "invalid platform"}
	}

	propsJSON, err := normalizeProps(raw.Props)
	if err != nil {
		return nil, &ItemError{EventID: id, Code: "INVALID_EVENT", Message: "invalid props"}
	}

	return &EventFields{
		EventID:     id,
		EventType:   typ,
		EventName:   name,
		AppVersion:  strings.TrimSpace(raw.AppVersion),
		Platform:    platform,
		DeviceBrand: strings.TrimSpace(raw.DeviceBrand),
		SessionID:   strings.TrimSpace(raw.SessionID),
		DurationMs:  raw.DurationMs,
		PropsJSON:   propsJSON,
		ClientTsMs:  raw.ClientTsMs,
		StudentNo:   strings.TrimSpace(raw.StudentNo),
	}, nil
}

func normalizeProps(raw json.RawMessage) (string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return "", nil
	}
	var obj map[string]any
	if err := json.Unmarshal(raw, &obj); err != nil {
		return "", err
	}
	b, err := json.Marshal(obj)
	if err != nil {
		return "", err
	}
	if len(b) <= maxPropsBytes {
		return string(b), nil
	}
	trimmed := map[string]any{"_truncated": true, "_original_bytes": len(b)}
	if msg, ok := obj["message"]; ok {
		trimmed["message"] = clipAny(msg, 512)
	}
	if st, ok := obj["stack"]; ok {
		trimmed["stack"] = clipAny(st, 2048)
	}
	out, err := json.Marshal(trimmed)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

func clipAny(v any, max int) string {
	s := fmt.Sprint(v)
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	runes := []rune(s)
	return string(runes[:max])
}
