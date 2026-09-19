import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../src");
const FEATURES = path.join(SRC, "features");

/** 폴더 이름만. */
const foldersIn = (dir: string): string[] =>
  readdirSync(dir).filter((entry) => statSync(path.join(dir, entry)).isDirectory());

/**
 * **슬라이스 안의 계층은 이 다섯뿐이다**(→ [ADR 0007](../../../docs/adr/0007-client-layers.md)의
 * server 판). 늘리려면 이 줄과 `eslint.config.ts`의 `LAYER_ALLOW`를 함께 고쳐야 한다 —
 * 의존 방향을 정하지 않은 계층이 생기면 zone이 그 폴더를 아예 안 본다.
 */
const LAYERS = new Set(["domain", "infra", "services", "runtime", "transport"]);

describe("server 슬라이스 구조", () => {
  const slices = foldersIn(FEATURES);

  it("슬라이스를 하나라도 찾는다 — 배치가 바뀌면 이 스위트가 조용히 비어 버린다", () => {
    expect(slices.length).toBeGreaterThan(0);
  });

  it("슬라이스마다 배럴이 있다 — 조립부(`src/app.ts`)가 부르는 자리는 `index.ts` 하나다", () => {
    const missing = slices.filter((slice) => {
      try {
        return !statSync(path.join(FEATURES, slice, "index.ts")).isFile();
      } catch {
        return true;
      }
    });

    expect(missing).toEqual([]);
  });

  it("슬라이스 안의 폴더는 정해진 계층뿐이다", () => {
    const unknown = slices.flatMap((slice) =>
      foldersIn(path.join(FEATURES, slice))
        .filter((layer) => !LAYERS.has(layer))
        .map((layer) => `${slice}/${layer}`),
    );

    expect(unknown).toEqual([]);
  });

  it("빈 계층 폴더를 미리 만들지 않는다", () => {
    const empty = slices.flatMap((slice) =>
      foldersIn(path.join(FEATURES, slice))
        .filter((layer) => readdirSync(path.join(FEATURES, slice, layer)).length === 0)
        .map((layer) => `${slice}/${layer}`),
    );

    expect(empty).toEqual([]);
  });
});
