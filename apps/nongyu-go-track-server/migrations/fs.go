package migrations

import "embed"

//go:embed *.sql
var fs embed.FS

func InitSQL() string {
	return mustRead("001_init.sql")
}

func Migration002SQL() string {
	return mustRead("002_llm_proxy_fail.sql")
}

func mustRead(name string) string {
	b, err := fs.ReadFile(name)
	if err != nil {
		panic(err)
	}
	return string(b)
}
