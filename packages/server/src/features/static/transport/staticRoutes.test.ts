import { describe, expect, it } from "vitest";
import { createStaticRoutes } from "./staticRoutes";

/**
 * **kill-switch가 브라우저에 닿는 조건**만 본다. 어떤 파일을 고르는지는 `infra/staticFiles.test.ts`가 본다.
 *
 * 여기 케이스들은 2026-08-18에 `arka.sangjun.dev`에서 실제로 겪은 사고에 하나씩 대응한다 —
 * 옛 PWA의 Service Worker가 새 앱을 가렸고, 회수 경로 자체가 막혀 저절로 사라지지 않았다.
 */
const app = createStaticRoutes("/does-not-exist");

describe("Service Worker kill-switch", () => {
  it("MIME이 text/javascript다 — 어긋나면 브라우저가 SW 업데이트를 거부해 옛 SW가 살아남는다", async () => {
    const res = await app.request("/sw.js");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
  });

  it("캐시하지 않는다 — 캐시되면 갱신 확인이 나가지 않아 회수 기회가 사라진다", async () => {
    const res = await app.request("/sw.js");

    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("스스로를 해제하는 스크립트를 준다 — 빈 응답이면 옛 SW가 그대로 남는다", async () => {
    const res = await app.request("/sw.js");

    await expect(res.text()).resolves.toContain("self.registration.unregister()");
  });
});
