import { describe, expect, it } from "vitest";
import { parseArgs, parseDownFlags } from "./cli.ts";

/**
 * 플래그 조합만 본다. 실제 배포는 CLI를 손으로 돌려 확인한다.
 *
 * `--purge`가 access를 켜지 않는 것이 이 파일의 핵심이다 — 지우는 순간 그 호스트 이름은
 * 다시 배포될 때까지 무방비다.
 */
describe("down 플래그", () => {
  it("아무것도 안 주면 컨테이너만 내린다", () => {
    expect(parseDownFlags([])).toEqual({
      containers: true, tunnel: false, dns: false, image: false, state: false, access: false,
    });
  });

  it("--purge는 넷을 켜지만 access는 켜지 않는다", () => {
    const options = parseDownFlags(["--purge"]);
    expect(options).toMatchObject({ tunnel: true, dns: true, image: true, state: true });
    expect(options.access).toBe(false);
  });

  it("--remove-access는 따로 켜야 한다", () => {
    expect(parseDownFlags(["--purge", "--remove-access"]).access).toBe(true);
  });

  it("--keep-containers면 컨테이너를 남긴다", () => {
    expect(parseDownFlags(["--purge", "--keep-containers"]).containers).toBe(false);
  });

  it("개별 플래그만으로도 켜진다 — purge 없이 DNS만 지울 수 있다", () => {
    expect(parseDownFlags(["--remove-dns"])).toMatchObject({ dns: true, tunnel: false, image: false });
  });
});

describe("인자 가르기 — 위치로 가르면 대상 없는 명령이 깨진다", () => {
  it("대상이 있으면 그대로 읽는다", () => {
    expect(parseArgs(["up", "ops/deploy/ade.deploy.ts", "--dry-run"]))
      .toEqual({ command: "up", target: "ops/deploy/ade.deploy.ts", flags: ["--dry-run"] });
  });

  it("플래그가 대상 앞에 와도 된다", () => {
    expect(parseArgs(["down", "--purge", "pr-12"]))
      .toMatchObject({ command: "down", target: "pr-12", flags: ["--purge"] });
  });

  it("빈 인자에 죽지 않는다", () => {
    expect(parseArgs([])).toEqual({ command: undefined, target: undefined, flags: [] });
  });
});
