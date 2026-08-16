package sqlite

import (
	"context"
	"fmt"
	"time"
)

const queryTimeout = 8 * time.Second

// QueryReadOnly 在只读连接上执行已校验 SQL，最多返回 maxRows 行。
func (s *Store) QueryReadOnly(
	ctx context.Context,
	query string,
	maxRows int,
) (columns []string, rowsOut []map[string]any, truncated bool, err error) {
	if maxRows < 1 {
		maxRows = 1
	}
	qctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	rows, err := s.read.QueryContext(qctx, query)
	if err != nil {
		return nil, nil, false, fmt.Errorf("readonly query: %w", err)
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return nil, nil, false, fmt.Errorf("columns: %w", err)
	}
	columns = cols
	rowsOut = make([]map[string]any, 0)

	raw := make([]any, len(cols))
	ptrs := make([]any, len(cols))
	for i := range raw {
		ptrs[i] = &raw[i]
	}

	for rows.Next() {
		if err := rows.Scan(ptrs...); err != nil {
			return nil, nil, false, fmt.Errorf("scan: %w", err)
		}
		if len(rowsOut) >= maxRows {
			truncated = true
			break
		}
		item := make(map[string]any, len(cols))
		for i, col := range cols {
			item[col] = jsonCell(raw[i])
		}
		rowsOut = append(rowsOut, item)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, false, fmt.Errorf("rows: %w", err)
	}
	return columns, rowsOut, truncated, nil
}

func jsonCell(v any) any {
	if v == nil {
		return nil
	}
	switch t := v.(type) {
	case []byte:
		return string(t)
	case time.Time:
		return t.UTC().Format(time.RFC3339Nano)
	default:
		return t
	}
}
