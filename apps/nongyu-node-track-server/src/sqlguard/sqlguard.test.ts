import { describe, expect, it } from "vitest";
import {
  ErrBadTable,
  ErrEmpty,
  ErrForbidden,
  ErrMultiStmt,
  ErrNotSelect,
  ErrTooLong,
  MaxSQLBytes,
  isSqlGuardError,
  prepare,
} from "../sqlguard/index.js";

describe("sqlguard prepare", () => {
  it("allows select and with", () => {
    const cases = [
      "SELECT metric_key, metric_value FROM daily_metrics LIMIT 10",
      "select count(*) as n from events where event_type = 'app_open'",
      "WITH x AS (SELECT stat_date FROM daily_metrics) SELECT * FROM x",
      "SELECT e.event_name FROM events e JOIN daily_dims d ON e.stat_date = d.stat_date",
    ];
    for (const sql of cases) {
      const got = prepare(sql);
      expect(got.execSQL).toContain("LIMIT 501");
    }
  });

  it("rejects writes and forbidden tables", () => {
    const cases: Array<{ sql: string; want: Error }> = [
      { sql: "DELETE FROM events", want: ErrNotSelect },
      { sql: "SELECT 1; DROP TABLE events", want: ErrMultiStmt },
      { sql: "SELECT * FROM events; SELECT 1", want: ErrMultiStmt },
      { sql: "SELECT * FROM meta_jobs", want: ErrBadTable },
      { sql: "SELECT * FROM events; ATTACH 'x' AS t", want: ErrMultiStmt },
      { sql: "INSERT INTO events(event_id) VALUES ('x')", want: ErrNotSelect },
      { sql: "SELECT * FROM events INTO dump", want: ErrForbidden },
      { sql: "PRAGMA table_info(events)", want: ErrNotSelect },
      { sql: "SELECT * FROM events --\n; DELETE FROM events", want: ErrMultiStmt },
    ];
    for (const tc of cases) {
      expect(() => prepare(tc.sql)).toThrow();
      try {
        prepare(tc.sql);
      } catch (err) {
        expect(isSqlGuardError(err, tc.want)).toBe(true);
      }
    }
  });

  it("comment does not hide delete", () => {
    try {
      prepare("SELECT * FROM events /* */ ; DELETE FROM events");
      expect.fail("should throw");
    } catch (err) {
      expect(isSqlGuardError(err, ErrMultiStmt)).toBe(true);
    }
  });

  it("empty and too long", () => {
    try {
      prepare("   ");
      expect.fail("should throw");
    } catch (err) {
      expect(isSqlGuardError(err, ErrEmpty)).toBe(true);
    }
    const long = "SELECT * FROM events WHERE x = '" + "a".repeat(MaxSQLBytes) + "'";
    try {
      prepare(long);
      expect.fail("should throw");
    } catch (err) {
      expect(isSqlGuardError(err, ErrTooLong)).toBe(true);
    }
  });
});
