import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { acquire, release } from "./lock.ts";

/**
 * **실제 디스크를 쓴다.** `O_EXCL`의 원자성이 이 모듈의 전부라, 가짜 파일시스템으로는
 * 검증할 것이 남지 않는다.
 */
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ade-lock-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("리소스 이름을 잠근다", () => {
  it("빈 자리는 잡힌다", () => {
    expect(() => acquire(dir, "tunnel-ade")).not.toThrow();
  });

  it("이미 잡혀 있으면 기다리지 않고 던진다 — 줄 세우는 것보다 서는 편이 안전하다", () => {
    acquire(dir, "tunnel-ade");
    expect(() => acquire(dir, "tunnel-ade")).toThrow(/잡혀 있습니다/u);
  });

  it("다른 키는 서로를 막지 않는다 — 앱이 다르면 병렬로 간다", () => {
    acquire(dir, "tunnel-ade");
    expect(() => acquire(dir, "tunnel-pr-12")).not.toThrow();
  });

  it("풀면 다시 잡힌다", () => {
    acquire(dir, "dns-arka.sangjun.dev");
    release(dir, "dns-arka.sangjun.dev");
    expect(() => acquire(dir, "dns-arka.sangjun.dev")).not.toThrow();
  });

  it("없는 락을 풀어도 조용하다 — 실패 경로에서 두 번 불릴 수 있다", () => {
    expect(() => release(dir, "없는것")).not.toThrow();
  });

  it("호스트 이름의 점이 파일 이름에 그대로 들어가지 않는다", () => {
    acquire(dir, "access-arka.sangjun.dev");
    expect(() => acquire(dir, "access-arka.sangjun.dev")).toThrow();
  });

  it("주인이 죽은 락은 회수한다 — 크래시로 release를 못 부른 경우다", () => {
    writeFileSync(path.join(dir, "tunnel-ade.lock"), "999999999");
    expect(() => acquire(dir, "tunnel-ade")).not.toThrow();
  });

  it("내용이 PID가 아니어도 회수한다 — 망가진 락에 영원히 막히지 않는다", () => {
    writeFileSync(path.join(dir, "tunnel-ade.lock"), "쓰레기");
    expect(() => acquire(dir, "tunnel-ade")).not.toThrow();
  });
});
