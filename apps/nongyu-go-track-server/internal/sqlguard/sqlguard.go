package sqlguard

import (
	"errors"
	"fmt"
	"strings"
	"unicode"
)

const (
	MaxSQLBytes = 8000
	MaxRows     = 500
	// fetchLimit 多取 1 行以判断 truncated。
	fetchLimit = MaxRows + 1
)

var (
	ErrEmpty     = errors.New("sql is required")
	ErrTooLong   = errors.New("sql exceeds 8000 bytes")
	ErrMultiStmt = errors.New("multiple statements are not allowed")
	ErrNotSelect = errors.New("only a single SELECT is allowed")
	ErrForbidden = errors.New("statement contains forbidden keywords")
	ErrBadTable  = errors.New("query references a table that is not allowed")
)

var allowedTables = map[string]struct{}{
	"events":         {},
	"daily_metrics":  {},
	"daily_dims":     {},
	"user_presence":  {},
}

var bannedKeywords = map[string]struct{}{
	"insert": {}, "update": {}, "delete": {}, "replace": {},
	"alter": {}, "drop": {}, "create": {}, "attach": {}, "detach": {},
	"vacuum": {}, "reindex": {}, "pragma": {}, "into": {},
}

var joinLeaders = map[string]struct{}{
	"inner": {}, "left": {}, "right": {}, "full": {}, "cross": {}, "outer": {}, "natural": {},
}

var trailingKeywords = map[string]struct{}{
	"on": {}, "using": {}, "where": {}, "group": {}, "order": {}, "limit": {},
	"having": {}, "union": {}, "except": {}, "intersect": {}, "set": {},
	"join": {}, "left": {}, "right": {}, "inner": {}, "full": {}, "cross": {},
	"outer": {}, "natural": {}, "as": {}, "and": {}, "or": {}, "from": {},
	"select": {}, "with": {}, "window": {},
}

// Prepared 是通过闸门后的可执行 SQL（已包 LIMIT）。
type Prepared struct {
	ExecSQL string
}

// Prepare 校验只读 SELECT，并包一层 LIMIT 501。
func Prepare(raw string) (Prepared, error) {
	if strings.TrimSpace(raw) == "" {
		return Prepared{}, ErrEmpty
	}
	if len(raw) > MaxSQLBytes {
		return Prepared{}, ErrTooLong
	}

	stripped, err := stripComments(raw)
	if err != nil {
		return Prepared{}, err
	}
	stripped = strings.TrimSpace(stripped)
	if stripped == "" {
		return Prepared{}, ErrEmpty
	}
	stripped = strings.TrimSuffix(stripped, ";")
	stripped = strings.TrimSpace(stripped)
	if strings.Contains(stripped, ";") {
		return Prepared{}, ErrMultiStmt
	}

	tokens := tokenize(stripped)
	if len(tokens) == 0 {
		return Prepared{}, ErrEmpty
	}
	first := strings.ToLower(tokens[0])
	if first != "select" && first != "with" {
		return Prepared{}, ErrNotSelect
	}

	for _, tok := range tokens {
		if _, bad := bannedKeywords[strings.ToLower(tok)]; bad {
			return Prepared{}, fmt.Errorf("%w: %s", ErrForbidden, strings.ToLower(tok))
		}
	}

	ctes := collectCTEs(tokens)
	tables, err := extractTables(tokens)
	if err != nil {
		return Prepared{}, err
	}
	if len(tables) == 0 {
		return Prepared{}, ErrBadTable
	}
	for _, table := range tables {
		base := tableBase(table)
		if _, ok := ctes[base]; ok {
			continue
		}
		if _, ok := allowedTables[base]; !ok {
			return Prepared{}, fmt.Errorf("%w: %s", ErrBadTable, base)
		}
	}

	wrapped := "SELECT * FROM (" + stripped + ") AS _ny_q LIMIT " + fmt.Sprintf("%d", fetchLimit)
	return Prepared{ExecSQL: wrapped}, nil
}

func tableBase(name string) string {
	name = strings.ToLower(strings.Trim(name, "`\"[]"))
	if i := strings.LastIndex(name, "."); i >= 0 {
		return name[i+1:]
	}
	return name
}

func stripComments(sql string) (string, error) {
	var b strings.Builder
	b.Grow(len(sql))
	i := 0
	for i < len(sql) {
		ch := sql[i]
		if ch == '\'' || ch == '"' {
			end, err := skipQuoted(sql, i)
			if err != nil {
				return "", err
			}
			b.WriteString(sql[i:end])
			i = end
			continue
		}
		if ch == '-' && i+1 < len(sql) && sql[i+1] == '-' {
			i += 2
			for i < len(sql) && sql[i] != '\n' {
				i++
			}
			continue
		}
		if ch == '/' && i+1 < len(sql) && sql[i+1] == '*' {
			i += 2
			closed := false
			for i+1 < len(sql) {
				if sql[i] == '*' && sql[i+1] == '/' {
					i += 2
					closed = true
					break
				}
				i++
			}
			if !closed {
				return "", errors.New("unclosed block comment")
			}
			continue
		}
		b.WriteByte(ch)
		i++
	}
	return b.String(), nil
}

func skipQuoted(sql string, start int) (int, error) {
	q := sql[start]
	i := start + 1
	for i < len(sql) {
		if sql[i] == q {
			if i+1 < len(sql) && sql[i+1] == q {
				i += 2
				continue
			}
			return i + 1, nil
		}
		i++
	}
	return 0, errors.New("unclosed string literal")
}

func tokenize(sql string) []string {
	tokens := make([]string, 0, 32)
	i := 0
	for i < len(sql) {
		ch := rune(sql[i])
		if unicode.IsSpace(ch) {
			i++
			continue
		}
		if sql[i] == '\'' || sql[i] == '"' {
			end, err := skipQuoted(sql, i)
			if err != nil {
				tokens = append(tokens, sql[i:])
				break
			}
			tokens = append(tokens, sql[i:end])
			i = end
			continue
		}
		if isIdentStart(sql[i]) || sql[i] == '`' {
			j := i + 1
			for j < len(sql) && isIdentPart(sql[j]) {
				j++
			}
			tokens = append(tokens, sql[i:j])
			i = j
			continue
		}
		tokens = append(tokens, sql[i:i+1])
		i++
	}
	return tokens
}

func isIdentStart(b byte) bool {
	return b == '_' || (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z')
}

func isIdentPart(b byte) bool {
	return isIdentStart(b) || (b >= '0' && b <= '9') || b == '$'
}

func collectCTEs(tokens []string) map[string]struct{} {
	out := map[string]struct{}{}
	if len(tokens) == 0 || strings.ToLower(tokens[0]) != "with" {
		return out
	}
	i := 1
	if i < len(tokens) && strings.ToLower(tokens[i]) == "recursive" {
		i++
	}
	for i < len(tokens) {
		name := tableBase(tokens[i])
		i++
		if i < len(tokens) && strings.ToLower(tokens[i]) == "as" {
			i++
		}
		if i >= len(tokens) || tokens[i] != "(" {
			break
		}
		i = skipBalanced(tokens, i)
		out[name] = struct{}{}
		if i < len(tokens) && tokens[i] == "," {
			i++
			continue
		}
		break
	}
	return out
}

func skipBalanced(tokens []string, i int) int {
	depth := 0
	for i < len(tokens) {
		if tokens[i] == "(" {
			depth++
		} else if tokens[i] == ")" {
			depth--
			if depth == 0 {
				return i + 1
			}
		}
		i++
	}
	return i
}

func extractTables(tokens []string) ([]string, error) {
	tables := make([]string, 0, 4)
	for i := 0; i < len(tokens); i++ {
		low := strings.ToLower(tokens[i])
		if low != "from" && low != "join" {
			continue
		}
		j := i + 1
		if low == "join" {
			// already at JOIN
		}
		if j >= len(tokens) {
			return nil, ErrBadTable
		}
		if tokens[j] == "(" {
			continue
		}
		name, next, ok := parseTableName(tokens, j)
		if !ok {
			return nil, ErrBadTable
		}
		tables = append(tables, name)
		i = next - 1
	}
	return tables, nil
}

func parseTableName(tokens []string, j int) (string, int, bool) {
	if j >= len(tokens) {
		return "", j, false
	}
	if _, skip := joinLeaders[strings.ToLower(tokens[j])]; skip {
		return "", j, false
	}
	parts := make([]string, 0, 2)
	parts = append(parts, tokens[j])
	j++
	if j+1 < len(tokens) && tokens[j] == "." {
		parts = append(parts, tokens[j+1])
		j += 2
	}
	name := strings.Join(parts, ".")
	if j < len(tokens) && strings.ToLower(tokens[j]) == "as" {
		j++
		if j < len(tokens) {
			j++
		}
	} else if j < len(tokens) {
		low := strings.ToLower(tokens[j])
		if isIdentStart(tokens[j][0]) || tokens[j][0] == '`' {
			if _, kw := trailingKeywords[low]; !kw {
				if _, banned := bannedKeywords[low]; !banned {
					j++
				}
			}
		}
	}
	return name, j, true
}
