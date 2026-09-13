import { DatabaseSync } from "node:sqlite";

/**
 * SQLite 연결과 스키마 마이그레이션. 드라이버는 Node 내장 `node:sqlite`다.
 *
 * 마이그레이션은 번호 순서대로 한 번씩 적용되고 `schema_version`에 기록된다. 사용자가 버전을
 * 건너뛰어 올려도(v1→v5) 빠진 단계가 순서대로 적용된다. **적용된 단계는 고치지 않는다** — 고치려면
 * 다음 번호를 추가한다.
 */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE sessions (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     archived INTEGER NOT NULL DEFAULT 0,
     last_run_status TEXT
   );
   CREATE TABLE events (
     session_id TEXT NOT NULL,
     seq INTEGER NOT NULL,
     run_id TEXT,
     at INTEGER NOT NULL,
     type TEXT NOT NULL,
     payload TEXT NOT NULL,
     PRIMARY KEY (session_id, seq)
   );`,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** 파일 경로 또는 `:memory:`. 열면서 마이그레이션까지 끝낸다. */
export const openDatabase = (location: string): DatabaseSync => {
  const db = new DatabaseSync(location);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
};

/** 표가 없으면 만들고 0을 돌려준다 — 빈 파일에도 그대로 부를 수 있다. */
export const currentVersion = (db: DatabaseSync): number => {
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = db.prepare("SELECT MAX(version) AS version FROM schema_version").get() as { version: number | null };
  return row.version ?? 0;
};

const migrate = (db: DatabaseSync): void => {
  const from = currentVersion(db);
  for (let version = from + 1; version <= MIGRATIONS.length; version += 1) {
    const step = MIGRATIONS[version - 1];
    if (step === undefined) break;
    db.exec("BEGIN");
    try {
      db.exec(step);
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(version);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
};
