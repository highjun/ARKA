import { describe, expect, it } from "vitest";
import { createTunnel, deleteTunnel, findTunnelByName, listTunnels, routeDns } from "./cloudflared.ts";
import type { Exec, ExecResult } from "./cloudflared.ts";

/**
 * **인자 배열 전체를 고정한다.** 이 저장소가 아니라 옆 저장소가 실제로 겪은 함정이라,
 * 여기서 순서가 흐트러지면 아무도 눈치채지 못한 채 다른 것이 지워진다.
 */
const TUNNELS = JSON.stringify([{ id: "a35b3f82", name: "ade", connections: [] }]);

const record = (): { calls: string[][]; exec: Exec } => {
  const calls: string[][] = [];
  const exec: Exec = async (file, args) => {
    calls.push([file, ...args]);
    const result: ExecResult = { code: 0, stdout: args.includes("list") ? TUNNELS : "", stderr: "" };
    return Promise.resolve(result);
  };
  return { calls, exec };
};

describe("플래그는 위치 인자보다 앞이다 — 뒤에 두면 셋이 각각 다르게 깨진다", () => {
  it("create — `--cred-file`이 이름보다 앞. 뒤면 `requires exactly 1 argument`", async () => {
    const { calls, exec } = record();
    await createTunnel(exec, "ade", "/tmp/creds.json");
    expect(calls[0]).toEqual(["cloudflared", "tunnel", "create", "--cred-file", "/tmp/creds.json", "ade"]);
  });

  it("route dns — `--overwrite-dns`가 터널·호스트보다 앞. 뒤면 `expects the format …`", async () => {
    const { calls, exec } = record();
    await routeDns(exec, "a35b3f82", "arka.sangjun.dev", true);
    expect(calls[0]).toEqual([
      "cloudflared", "tunnel", "route", "dns", "--overwrite-dns", "a35b3f82", "arka.sangjun.dev",
    ]);
  });

  it("delete — `--force`가 TUNNEL보다 앞. **여기가 조용히 틀린다** — 뒤면 `--force`라는 이름의 터널을 찾는다", async () => {
    const { calls, exec } = record();
    await deleteTunnel(exec, "a35b3f82");
    expect(calls[0]).toEqual(["cloudflared", "tunnel", "delete", "--force", "a35b3f82"]);
  });

  it("덮어쓰지 않을 때는 플래그 자체가 없다 — 빈 문자열을 인자로 넣으면 위치가 밀린다", async () => {
    const { calls, exec } = record();
    await routeDns(exec, "t", "h.example.com");
    expect(calls[0]).toEqual(["cloudflared", "tunnel", "route", "dns", "t", "h.example.com"]);
  });
});

describe("터널 조회", () => {
  it("list는 JSON으로 받는다", async () => {
    const { calls, exec } = record();
    await listTunnels(exec);
    expect(calls[0]).toEqual(["cloudflared", "tunnel", "list", "-o", "json"]);
  });

  it("이름으로 찾는다", async () => {
    const { exec } = record();
    await expect(findTunnelByName(exec, "ade")).resolves.toMatchObject({ id: "a35b3f82" });
    await expect(findTunnelByName(exec, "없는것")).resolves.toBeUndefined();
  });

  it("create는 stdout을 파싱하지 않고 list로 UUID를 얻는다 — stdout 모양이 버전마다 다르다", async () => {
    const { calls, exec } = record();
    await expect(createTunnel(exec, "ade", "/tmp/c.json")).resolves.toBe("a35b3f82");
    expect(calls.map((c) => c[2])).toEqual(["create", "list"]);
  });
});

describe("실패를 삼키지 않는다", () => {
  const failing: Exec = async () => Promise.resolve({ code: 1, stdout: "", stderr: "그런 터널 없음" });

  it("종료 코드가 0이 아니면 stderr를 담아 던진다", async () => {
    await expect(deleteTunnel(failing, "x")).rejects.toThrow("그런 터널 없음");
  });

  it("만들었는데 목록에 없으면 던진다 — 조용히 빈 UUID를 돌려주지 않는다", async () => {
    const exec: Exec = async (_f, args) =>
      Promise.resolve({ code: 0, stdout: args.includes("list") ? "[]" : "", stderr: "" });
    await expect(createTunnel(exec, "ade", "/tmp/c.json")).rejects.toThrow("목록에 없습니다");
  });
});
