import { describe, expect, it } from "vitest";
import { currentVersion, openDatabase, SCHEMA_VERSION } from "./database";

describe("openDatabase", () => {
  it("새 DB에 최신 스키마를 만든다", () => {
    const db = openDatabase(":memory:");
    expect(currentVersion(db)).toBe(SCHEMA_VERSION);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
      name: string;
    }[];
    expect(tables.map((t) => t.name)).toEqual(["events", "schema_version", "sessions"]);
  });

  it("다시 열어도 마이그레이션을 반복하지 않는다", () => {
    const db = openDatabase(":memory:");
    const rows = db.prepare("SELECT COUNT(*) AS n FROM schema_version").get() as { n: number };
    expect(rows.n).toBe(SCHEMA_VERSION);
  });
});
