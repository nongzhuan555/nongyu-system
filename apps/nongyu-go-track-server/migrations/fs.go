package migrations

import "embed"

//go:embed 001_init.sql
var fs embed.FS

func InitSQL() string {
	b, err := fs.ReadFile("001_init.sql")
	if err != nil {
		panic(err)
	}
	return string(b)
}
