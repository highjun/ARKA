import { describe, expect, it } from "vitest";
import { findGhostMounts } from "./ghostMount.ts";
import type { Inspected } from "./ghostMount.ts";

/**
 * 픽스처는 실제 `docker inspect` 출력의 모양이다.
 *
 * 이 검사가 잡는 사고는 이렇다 — 컨테이너가 없어진 경로를 물고도 **재시작 없이 메모리로만
 * 버틴다.** 서비스는 응답하지만 다음 재시작에 죽고, 그때는 원인 경로가 사라진 지 오래다.
 */
const EXPECTED = { project: "ade", composeFile: "/state/ade/compose.yml" };

const container = (over: Partial<Inspected> = {}): Inspected => ({
  Name: "/ade-app",
  Mounts: [{ Source: "/live" }],
  Config: { Labels: { "com.docker.compose.project": "ade", "com.docker.compose.project.config_files": "/state/ade/compose.yml" } },
  ...over,
});

const exists = (p: string): boolean => p === "/live";

describe("유령 마운트", () => {
  it("살아 있는 마운트만 있으면 위반이 없다", () => {
    expect(findGhostMounts([container()], exists, EXPECTED)).toEqual([]);
  });

  it("없어진 소스를 물고 있으면 잡는다 — 서비스가 응답 중이어도 다음 재시작에 죽는다", () => {
    const found = findGhostMounts([container({ Mounts: [{ Source: "/사라진경로" }] })], exists, EXPECTED);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ container: "ade-app", kind: "ghost-mount" });
    expect(found[0]?.detail).toContain("/사라진경로");
  });

  it("컨테이너 이름의 앞 슬래시를 뗀다 — docker가 `/ade-app`으로 준다", () => {
    const found = findGhostMounts([container({ Mounts: [{ Source: "/x" }] })], exists, EXPECTED);
    expect(found[0]?.container).toBe("ade-app");
  });

  it("여러 컨테이너의 여러 마운트를 다 본다", () => {
    const found = findGhostMounts(
      [container({ Mounts: [{ Source: "/live" }, { Source: "/x" }] }), container({ Name: "/ade-tunnel", Mounts: [{ Source: "/y" }] })],
      exists,
      EXPECTED,
    );
    expect(found).toHaveLength(2);
  });
});

describe("남의 설정에서 온 컨테이너", () => {
  it("프로젝트 이름이 다르면 잡는다 — 이걸 놓치면 남의 컨테이너를 지운다", () => {
    const labels = { "com.docker.compose.project": "workbench", "com.docker.compose.project.config_files": "/state/ade/compose.yml" };
    const found = findGhostMounts([container({ Config: { Labels: labels } })], exists, EXPECTED);
    expect(found[0]).toMatchObject({ kind: "foreign-config" });
    expect(found[0]?.detail).toContain("workbench");
  });

  it("compose 파일 경로가 다르면 잡는다 — 옛 경로에서 뜬 채로 남아 있는 것이다", () => {
    const labels = { "com.docker.compose.project": "ade", "com.docker.compose.project.config_files": "/옛경로/compose.yml" };
    const found = findGhostMounts([container({ Config: { Labels: labels } })], exists, EXPECTED);
    expect(found[0]?.detail).toContain("/옛경로/compose.yml");
  });

  it("라벨이 아예 없으면 따지지 않는다 — compose가 만들지 않은 컨테이너다", () => {
    expect(findGhostMounts([container({ Config: { Labels: {} } })], exists, EXPECTED)).toEqual([]);
  });
});
