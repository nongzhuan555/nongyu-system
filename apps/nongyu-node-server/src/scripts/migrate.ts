import { loadEnvFiles, getEnv } from "../config/env.js";
import { closePool } from "../lib/db.js";
import { ensureSuperAdminRole } from "../lib/ensureSuperAdmin.js";
import { runMigrations } from "../lib/migrate.js";

loadEnvFiles(process.env.ENV_FILE);
getEnv();

runMigrations()
  .then(async () => {
    console.log("migrations done");
    await ensureSuperAdminRole();
    await closePool();
  })
  .catch(async (err) => {
    console.error(err);
    await closePool();
    process.exit(1);
  });
