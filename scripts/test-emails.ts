import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
const root = process.cwd();
const port = 15439;
const database = `visipro_email_test_${randomUUID().replaceAll("-", "")}`;
const password = randomBytes(24).toString("hex");
const directory = path.join(root, ".email-test-data", database);
async function run(args: string[], env: NodeJS.ProcessEnv) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Test subprocess failed (${code})`)),
    );
  });
}
async function main() {
  await mkdir(directory, { recursive: true });
  const pg = new EmbeddedPostgres({
    databaseDir: directory,
    port,
    user: "visipro_test",
    password,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://visipro_test:${password}@127.0.0.1:${port}/${database}?schema=public`,
    EMAIL_TEST_DATABASE: database,
    EMAIL_RECIPIENT_HASH_SECRET: randomBytes(32).toString("hex"),
    EMAIL_UNSUBSCRIBE_SECRET: randomBytes(32).toString("hex"),
    EMAIL_IMPORT_API_KEY: randomBytes(32).toString("hex"),
    EMAIL_DELIVERY_MODE: "simulation",
    EMAIL_REAL_SEND_ENABLED: "false",
  };
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase(database);
    console.info(
      "Isolated PostgreSQL test database started on loopback; delivery simulation only.",
    );
    await run(["node_modules/prisma/build/index.js", "migrate", "deploy"], env);
    await run(["node_modules/vitest/vitest.mjs", "run"], env);
    const existing = pg.getPgClient(database);
    await existing.connect();
    const snapshotSql = `SELECT (SELECT count(*)::int FROM email_queue) AS queue,
      (SELECT count(*)::int FROM email_settings) AS settings,
      (SELECT count(*)::int FROM email_send_attempts) AS attempts,
      (SELECT count(*)::int FROM email_suppressions) AS suppressions,
      (SELECT count(*)::int FROM email_api_rate_limits) AS limits`;
    const snapshot = JSON.stringify((await existing.query(snapshotSql)).rows);
    await existing.end();
    await pg.stop();
    await pg.start();
    const restarted = pg.getPgClient(database);
    await restarted.connect();
    if (JSON.stringify((await restarted.query(snapshotSql)).rows) !== snapshot)
      throw new Error("Database restart lost data");
    await restarted.end();
    console.info("PostgreSQL restart: persistent email tables preserved.");
    const migrationDb = `${database}_migration`;
    await pg.createDatabase(migrationDb);
    const migrationClient = pg.getPgClient(migrationDb);
    await migrationClient.connect();
    try {
      await migrationClient.query(
        await readFile(
          "prisma/migrations/20261022000100_existing_schema/migration.sql",
          "utf8",
        ),
      );
      await migrationClient.query(
        'INSERT INTO "Client" ("id", "legalName", "updatedAt") VALUES ($1,$2,NOW())',
        ["test-legacy-client", "Legacy fixture preserved"],
      );
      await migrationClient.query(
        await readFile(
          "prisma/migrations/20261022000200_email_prospection/migration.sql",
          "utf8",
        ),
      );
      const legacy = await migrationClient.query(
        'SELECT "legalName" FROM "Client" WHERE "id"=$1',
        ["test-legacy-client"],
      );
      if (legacy.rows[0]?.legalName !== "Legacy fixture preserved")
        throw new Error("Additive migration altered legacy data");
    } finally {
      await migrationClient.end();
    }
    console.info("Additive migration: existing client fixture preserved.");
    if (process.argv.includes("--browser")) {
      if (!process.argv.includes("--skip-build"))
        await run(["node_modules/next/dist/bin/next", "build"], env);
      await run(
        ["node_modules/tsx/dist/cli.mjs", "scripts/test-email-browser.ts"],
        env,
      );
    }
  } finally {
    await pg.stop();
    console.info(
      "Test PostgreSQL stopped; test data retained under .email-test-data (ignored by Git).",
    );
  }
}
main().catch(() => {
  console.error("Email tests failed. No production database was used.");
  process.exit(1);
});
