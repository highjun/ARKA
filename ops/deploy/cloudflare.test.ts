import { describe, expect, it, vi } from "vitest";
import { deleteAccessApp, deleteDnsRecords, ensureAccessApp, findAccessApp, resolveZoneId } from "./cloudflare.ts";
import type { FetchLike } from "./cloudflare.ts";

/** 실제 `Response`를 흉내내지 않는다 — 코드가 읽는 두 가지만 만든다. */
const ok = (result: unknown): Response =>
  ({ status: 200, json: async () => Promise.resolve({ success: true, errors: [], result }) }) as unknown as Response;

const err = (status: number, code: number, message: string): Response =>
  ({ status, json: async () => Promise.resolve({ success: false, errors: [{ code, message }] }) }) as unknown as Response;

const APP = { id: "app-1", domain: "arka.sangjun.dev", name: "workbench" };

describe("존 해석 — 존 ID를 코드에 박지 않는다", () => {
  it("이름으로 물어 ID를 얻는다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(ok([{ id: "zone-1" }]));
    await expect(resolveZoneId(fetchImpl, "t", "sangjun.dev")).resolves.toBe("zone-1");
    expect(fetchImpl.mock.calls[0]?.[0]).toContain("/zones?name=sangjun.dev");
  });

  it("못 찾으면 던진다 — 빈 ID로 다음 요청을 보내지 않는다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(ok([]));
    await expect(resolveZoneId(fetchImpl, "t", "없는.dev")).rejects.toThrow("찾지 못했습니다");
  });
});

describe("실패는 코드까지 담아 던진다 — 9999와 10000이 메시지로는 구분되지 않는다", () => {
  it("Zero Trust가 꺼져 있으면(9999) 그 번호가 예외에 남는다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(err(403, 9999, "Access is not enabled."));
    await expect(findAccessApp(fetchImpl, "t", "z", "h.dev")).rejects.toThrow(/9999/u);
  });

  it("토큰에 권한이 없으면(10000) 그 번호가 예외에 남는다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(err(403, 10000, "Authentication error"));
    await expect(findAccessApp(fetchImpl, "t", "z", "h.dev")).rejects.toThrow(/10000/u);
  });

  it("HTTP 상태도 함께 남는다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(err(403, 9999, "x"));
    await expect(findAccessApp(fetchImpl, "t", "z", "h.dev")).rejects.toThrow(/403/u);
  });
});

describe("Access 앱 — 이름이 아니라 domain으로 찾는다", () => {
  it("이름이 달라도 domain이 같으면 그것이다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(ok([APP]));
    await expect(findAccessApp(fetchImpl, "t", "z", "arka.sangjun.dev")).resolves.toMatchObject({ id: "app-1" });
  });

  it("domain이 다르면 없는 것이다 — 이름으로 찾았다면 잘못 집었을 상황이다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(ok([{ ...APP, domain: "다른.sangjun.dev" }]));
    await expect(findAccessApp(fetchImpl, "t", "z", "arka.sangjun.dev")).resolves.toBeUndefined();
  });
});

describe("Access 앱 수렴 — 두 번째 실행이 첫 번째와 같은 결과여야 한다", () => {
  const body = (call: readonly unknown[]): Record<string, unknown> =>
    JSON.parse((call[1] as RequestInit).body as string) as Record<string, unknown>;

  it("없으면 POST로 만든다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({ id: "new" }));
    await expect(ensureAccessApp(fetchImpl, "t", "z", { hostname: "h.dev", name: "ade", emails: ["a@b.c"] }))
      .resolves.toBe("new");
    expect((fetchImpl.mock.calls[1]?.[1] as RequestInit).method).toBe("POST");
  });

  it("있으면 PUT으로 통째로 덮는다 — PATCH면 지난 정책이 겹쳐 쌓인다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(ok([APP])).mockResolvedValueOnce(ok({ id: "app-1" }));
    await ensureAccessApp(fetchImpl, "t", "z", { hostname: "arka.sangjun.dev", name: "ade", emails: ["a@b.c"] });
    const [url, init] = fetchImpl.mock.calls[1] ?? [];
    expect((init as RequestInit).method).toBe("PUT");
    expect(url).toContain("/access/apps/app-1");
  });

  it("include가 이중 중첩이다 — 한 겹으로 보내면 조용히 아무도 못 들어온다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({ id: "n" }));
    await ensureAccessApp(fetchImpl, "t", "z", { hostname: "h.dev", name: "ade", emails: ["a@b.c", "d@e.f"] });
    expect((body(fetchImpl.mock.calls[1] ?? []) as { policies: { include: unknown[] }[] }).policies[0]?.include)
      .toEqual([{ email: { email: "a@b.c" } }, { email: { email: "d@e.f" } }]);
  });

  it("self_hosted에 720시간 세션이다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({ id: "n" }));
    await ensureAccessApp(fetchImpl, "t", "z", { hostname: "h.dev", name: "ade", emails: [] });
    expect(body(fetchImpl.mock.calls[1] ?? [])).toMatchObject({ type: "self_hosted", session_duration: "720h" });
  });

  it("응답에 id가 없으면 던진다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({}));
    await expect(ensureAccessApp(fetchImpl, "t", "z", { hostname: "h.dev", name: "ade", emails: [] }))
      .rejects.toThrow("id가 없습니다");
  });
});

describe("DNS 삭제 — 생성은 CLI가 하고 여기는 삭제만 있다", () => {
  it("CNAME을 이름으로 찾아 전부 지우고 개수를 돌려준다", async () => {
    const fetchImpl = vi.fn<FetchLike>()
      .mockResolvedValueOnce(ok([{ id: "r1" }, { id: "r2" }]))
      .mockResolvedValue(ok({}));
    await expect(deleteDnsRecords(fetchImpl, "t", "z", "h.dev")).resolves.toBe(2);
    expect(fetchImpl.mock.calls[0]?.[0]).toContain("type=CNAME&name=h.dev");
    expect((fetchImpl.mock.calls[1]?.[1] as RequestInit).method).toBe("DELETE");
  });

  it("없으면 0이고 삭제 요청을 보내지 않는다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(ok([]));
    await expect(deleteDnsRecords(fetchImpl, "t", "z", "h.dev")).resolves.toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("Access 앱 삭제", () => {
  it("없으면 false이고 요청을 보내지 않는다", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(ok([]));
    await expect(deleteAccessApp(fetchImpl, "t", "z", "h.dev")).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("있으면 지우고 true", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValueOnce(ok([APP])).mockResolvedValue(ok({}));
    await expect(deleteAccessApp(fetchImpl, "t", "z", "arka.sangjun.dev")).resolves.toBe(true);
  });
});
