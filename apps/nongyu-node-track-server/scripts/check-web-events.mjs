import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = join(here, "data/track.db");
const db = new Database(dbPath, { readonly: true });
const shifted = new Date(Date.now() + 8 * 3600 * 1000);
const date = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
console.log("date", date);
console.log("total", db.prepare("SELECT COUNT(*) AS n FROM events").get().n);
console.log(
  "web",
  db
    .prepare(
      "SELECT event_type, event_name, COUNT(*) AS n FROM events WHERE platform='web' GROUP BY 1,2",
    )
    .all(),
);
console.log(
  "today_web_pv",
  db
    .prepare(
      "SELECT COUNT(*) AS n FROM events WHERE platform='web' AND event_type='screen_view' AND event_name='web_home' AND stat_date=?",
    )
    .get(date).n,
);
console.log(
  "today_cwv",
  db
    .prepare(
      "SELECT event_name, COUNT(*) AS n FROM events WHERE platform='web' AND event_type='perf' AND event_name LIKE 'cwv_%' AND stat_date=? GROUP BY 1",
    )
    .all(date),
);
db.close();
