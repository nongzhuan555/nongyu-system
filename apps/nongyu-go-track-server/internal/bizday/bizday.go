package bizday

import (
	"time"

	_ "time/tzdata" // 保证 Windows / 精简 Linux 也能加载 Asia/Shanghai
)

var shanghai *time.Location

func init() {
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		loc = time.FixedZone("CST", 8*3600)
	}
	shanghai = loc
}

// Location 返回业务日时区（Asia/Shanghai）。
func Location() *time.Location {
	return shanghai
}

// StatDate 按上海日历日格式化为 YYYY-MM-DD。
func StatDate(t time.Time) string {
	return t.In(shanghai).Format("2006-01-02")
}

// ParseDate 解析 YYYY-MM-DD（上海日）。
func ParseDate(s string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", s, shanghai)
}

// Yesterday 返回 t 所在上海日的前一日 YYYY-MM-DD。
func Yesterday(t time.Time) string {
	d := t.In(shanghai)
	y := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, shanghai).AddDate(0, 0, -1)
	return y.Format("2006-01-02")
}

// IsToday 判断 date 是否为 t 的上海日历日。
func IsToday(date string, t time.Time) bool {
	return date == StatDate(t)
}
