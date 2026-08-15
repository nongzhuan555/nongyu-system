package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"nongyu-go-track-server/migrations"

	_ "modernc.org/sqlite"
)

// Store 写连接串行（MaxOpenConns=1）；读连接只读。
type Store struct {
	write *sql.DB
	read  *sql.DB
}

func Open(ctx context.Context, dbPath string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, fmt.Errorf("mkdir db dir: %w", err)
	}
	abs, err := filepath.Abs(dbPath)
	if err != nil {
		return nil, fmt.Errorf("abs db path: %w", err)
	}
	slash := filepath.ToSlash(abs)

	writeDSN := fmt.Sprintf("file:%s?_pragma=busy_timeout(5000)", slash)
	writeDB, err := sql.Open("sqlite", writeDSN)
	if err != nil {
		return nil, fmt.Errorf("open write db: %w", err)
	}
	writeDB.SetMaxOpenConns(1)
	writeDB.SetMaxIdleConns(1)
	if err := applyWritePragmas(ctx, writeDB); err != nil {
		_ = writeDB.Close()
		return nil, err
	}
	if err := migrate(ctx, writeDB); err != nil {
		_ = writeDB.Close()
		return nil, err
	}

	readDSN := fmt.Sprintf("file:%s?mode=ro&_pragma=busy_timeout(5000)", slash)
	readDB, err := sql.Open("sqlite", readDSN)
	if err != nil {
		_ = writeDB.Close()
		return nil, fmt.Errorf("open read db: %w", err)
	}
	readDB.SetMaxOpenConns(4)
	if _, err := readDB.ExecContext(ctx, "PRAGMA foreign_keys=ON"); err != nil {
		_ = readDB.Close()
		_ = writeDB.Close()
		return nil, fmt.Errorf("read pragma: %w", err)
	}

	return &Store{write: writeDB, read: readDB}, nil
}

func applyWritePragmas(ctx context.Context, db *sql.DB) error {
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA synchronous=NORMAL",
		"PRAGMA busy_timeout=5000",
		"PRAGMA foreign_keys=ON",
		"PRAGMA temp_store=MEMORY",
		"PRAGMA cache_size=-20000",
		"PRAGMA mmap_size=67108864",
	}
	for _, p := range pragmas {
		if _, err := db.ExecContext(ctx, p); err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
	}
	return nil
}

func migrate(ctx context.Context, db *sql.DB) error {
	raw := migrations.InitSQL()
	if _, err := db.ExecContext(ctx, "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY)"); err != nil {
		return fmt.Errorf("schema_migrations: %w", err)
	}
	var n int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migrations WHERE id=?", "001_init").Scan(&n); err != nil {
		return fmt.Errorf("check migration: %w", err)
	}
	if n > 0 {
		return nil
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err := execSQL(ctx, tx, raw); err != nil {
		return fmt.Errorf("apply 001_init: %w", err)
	}
	if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations(id) VALUES (?)", "001_init"); err != nil {
		return fmt.Errorf("record migration: %w", err)
	}
	return tx.Commit()
}

func execSQL(ctx context.Context, tx *sql.Tx, script string) error {
	parts := strings.Split(script, ";")
	for _, part := range parts {
		stmt := strings.TrimSpace(part)
		if stmt == "" {
			continue
		}
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			preview := stmt
			if len(preview) > 80 {
				preview = preview[:80]
			}
			return fmt.Errorf("%s: %w", preview, err)
		}
	}
	return nil
}

func (s *Store) Ping(ctx context.Context) error {
	if err := s.write.PingContext(ctx); err != nil {
		return err
	}
	return s.read.PingContext(ctx)
}

func (s *Store) Close() error {
	var errs []string
	if err := s.read.Close(); err != nil {
		errs = append(errs, err.Error())
	}
	if err := s.write.Close(); err != nil {
		errs = append(errs, err.Error())
	}
	if len(errs) > 0 {
		return fmt.Errorf("close store: %s", strings.Join(errs, "; "))
	}
	return nil
}

func (s *Store) WriteDB() *sql.DB { return s.write }
func (s *Store) ReadDB() *sql.DB  { return s.read }
