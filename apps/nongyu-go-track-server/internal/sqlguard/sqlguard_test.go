package sqlguard

import (
	"errors"
	"strings"
	"testing"
)

func TestPrepare_AllowsSelectAndWith(t *testing.T) {
	t.Parallel()
	cases := []string{
		"SELECT metric_key, metric_value FROM daily_metrics LIMIT 10",
		"select count(*) as n from events where event_type = 'app_open'",
		"WITH x AS (SELECT stat_date FROM daily_metrics) SELECT * FROM x",
		"SELECT e.event_name FROM events e JOIN daily_dims d ON e.stat_date = d.stat_date",
	}
	for _, sql := range cases {
		got, err := Prepare(sql)
		if err != nil {
			t.Fatalf("%s: %v", sql, err)
		}
		if !strings.Contains(got.ExecSQL, "LIMIT 501") {
			t.Fatalf("expected wrap limit: %s", got.ExecSQL)
		}
	}
}

func TestPrepare_RejectsWritesAndForbiddenTables(t *testing.T) {
	t.Parallel()
	cases := []struct {
		sql  string
		want error
	}{
		{"DELETE FROM events", ErrNotSelect},
		{"SELECT 1; DROP TABLE events", ErrMultiStmt},
		{"SELECT * FROM events; SELECT 1", ErrMultiStmt},
		{"SELECT * FROM meta_jobs", ErrBadTable},
		{"SELECT * FROM events WHERE 1=1; ATTACH 'x' AS t", ErrMultiStmt},
		{"INSERT INTO events(event_id) VALUES ('x')", ErrNotSelect},
		{"SELECT * FROM events INTO dump", ErrForbidden},
		{"PRAGMA table_info(events)", ErrNotSelect},
		{"SELECT * FROM events --\n; DELETE FROM events", ErrMultiStmt},
	}
	for _, tc := range cases {
		_, err := Prepare(tc.sql)
		if err == nil {
			t.Fatalf("expected error for %q", tc.sql)
		}
		if !errors.Is(err, tc.want) {
			t.Fatalf("%q: got %v want %v", tc.sql, err, tc.want)
		}
	}
}

func TestPrepare_CommentDoesNotHideDelete(t *testing.T) {
	t.Parallel()
	_, err := Prepare("SELECT * FROM events /* */ ; DELETE FROM events")
	if !errors.Is(err, ErrMultiStmt) {
		t.Fatalf("got %v", err)
	}
}

func TestPrepare_EmptyAndTooLong(t *testing.T) {
	t.Parallel()
	if _, err := Prepare("   "); !errors.Is(err, ErrEmpty) {
		t.Fatalf("empty: %v", err)
	}
	long := "SELECT * FROM events WHERE x = '" + strings.Repeat("a", MaxSQLBytes) + "'"
	if _, err := Prepare(long); !errors.Is(err, ErrTooLong) {
		t.Fatalf("too long: %v", err)
	}
}
