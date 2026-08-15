package ingest

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestValidateOne_RejectsBadType(t *testing.T) {
	_, err := ValidateOne(RawEvent{EventID: "e1", EventType: "nope", EventName: "x"})
	if err == nil || err.Code != "INVALID_TYPE" {
		t.Fatalf("got %+v", err)
	}
}

func TestValidateOne_TruncatesHugeProps(t *testing.T) {
	s := strings.Repeat("a", 5000)
	raw, err := json.Marshal(map[string]any{"message": s})
	if err != nil {
		t.Fatal(err)
	}
	fields, ierr := ValidateOne(RawEvent{
		EventID:   "e1",
		EventType: "crash",
		EventName: "js",
		Props:     raw,
	})
	if ierr != nil {
		t.Fatal(ierr)
	}
	if !strings.Contains(fields.PropsJSON, `"_truncated":true`) && !strings.Contains(fields.PropsJSON, `"_truncated": true`) {
		t.Fatalf("expected truncated marker, got %s", fields.PropsJSON)
	}
}

func TestValidateOne_OK(t *testing.T) {
	fields, err := ValidateOne(RawEvent{
		EventID:   "550e8400-e29b-41d4-a716-446655440000",
		EventType: "screen_view",
		EventName: "home",
		Platform:  "android",
	})
	if err != nil {
		t.Fatal(err)
	}
	if fields.EventName != "home" {
		t.Fatalf("%+v", fields)
	}
}
