import { readdirSync, mkdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync, backup } from "node:sqlite";

/**
 * 세션 SQLite를 **일관된 사본**으로 뜬다. 하루 한 번 사용자 타이머가 부른다(→ `systemd/`).
 *
 * **파일을 복사하지 않는 이유**: DB가 WAL 모드라(`features/agent/infra/database.ts`) 쓰기가
 * `-wal`에 먼저 앉는다. `data.db`만 복사하면 최근 쓰기가 빠진 채 조용히 깨진 사본이 남는다.
 * `node:sqlite`의 `backup()`은 온라인 백업 API라 앱이 떠 있는 채로 정합한 사본을 만든다.
 *
 *     node ops/backup/run.ts [원본] [보관 폴더]
 */
const source = process.argv[2] ?? path.join(os.homedir(), "ARKA/.arka/data.db");
const target = process.argv[3] ?? path.join(os.homedir(), "ARKA/.arka/backups");

/** 남길 세대 수. 하루 한 번이라 일주일이다. 더 오래는 다른 기계로 보내는 이야기라 여기서 다루지 않는다. */
const KEEP = 7;

const stamp = new Date().toISOString().slice(0, 10);

mkdirSync(target, { recursive: true, mode: 0o700 });
const destination = path.join(target, `data-${stamp}.db`);

const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
} finally {
  db.close();
}

// 오래된 것부터 걷는다. 이름이 날짜라 사전순이 곧 시간순이다.
const kept = readdirSync(target)
  .filter((name) => /^data-\d{4}-\d{2}-\d{2}\.db$/u.test(name))
  .sort();
for (const name of kept.slice(0, Math.max(0, kept.length - KEEP))) {
  rmSync(path.join(target, name), { force: true });
}

process.stdout.write(
  `${destination} (${String(statSync(destination).size)} bytes), 보관 ${String(Math.min(kept.length, KEEP))}개\n`,
);
