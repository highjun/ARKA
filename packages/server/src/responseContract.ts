import { realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ZodType } from "zod";
import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";
import { createApp } from "./app";
import { makeConfig } from "./core/config.testing";

/**
 * 라우트 응답이 `contracts`의 스키마를 통과하는지 보는 도구.
 *
 * **왜 서버가 자기 응답을 검증해야 하나** — 지금 응답 스키마는 서버에서 `import type`으로만
 * 쓰인다. 타입 체커가 컴파일 시점에 보긴 하지만 런타임에 확인하는 곳은 클라이언트 어댑터의
 * `parse`뿐이다. 즉 **서버의 계약 준수를 클라이언트를 통해서만 알 수 있었다.** 클라이언트가
 * 둘이 되면 그 방식은 무너진다 — 어느 클라이언트도 붙이지 않은 채로 서버가 계약을 지키는지
 * 말할 수 있어야 한다.
 *
 * 그래서 여기는 **클라이언트를 모른다.** 앱을 세우고 라우트를 두드려 응답을 스키마에 넣을 뿐이다.
 */
export type RouteProbe = { readonly app: ReturnType<typeof createApp>["app"]; readonly workspaceRoot: string };

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

/** 빈 임시 워크스페이스 위에 앱을 세운다. `dispose`로 지운다. */
export const probeApp = async (): Promise<RouteProbe & { dispose: () => Promise<void> }> => {
  const workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "arka-response-")));
  const { app } = createApp({
    config: makeConfig({ workspaceRoot }),
    log: silent,
    startedAt: "2026-09-09T00:00:00.000Z",
  });
  return { app, workspaceRoot, dispose: () => rm(workspaceRoot, { recursive: true, force: true }) };
};

/** 실제 클라이언트가 보내는 것과 같은 헤더를 싣는다 — 프로토콜 가드가 이걸 본다. */
export const withProtocol = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...(init.headers as Record<string, string> | undefined), [PROTOCOL_HEADER]: String(PROTOCOL_VERSION) },
});

/**
 * 라우트를 두드려 **응답 본문이 스키마를 통과하는지** 본다. 상태 코드도 함께 확인한다 —
 * 스키마가 맞아도 200이 아니면 계약을 지킨 것이 아니다.
 *
 * @throws Error 상태 코드가 다르거나 본문이 스키마에 어긋나면.
 */
export const expectResponse = async <T>(
  probe: RouteProbe,
  request: { readonly url: string; readonly init?: RequestInit; readonly status?: number },
  schema: ZodType<T>,
): Promise<T> => {
  const response = await probe.app.request(request.url, withProtocol(request.init));
  const expected = request.status ?? 200;
  if (response.status !== expected) {
    throw new Error(`${request.url} — 상태가 ${String(expected)}이어야 하는데 ${String(response.status)}: ${await response.text()}`);
  }
  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`${request.url} — 응답이 계약에 어긋난다:\n${parsed.error.message}\n받은 것: ${JSON.stringify(body)}`);
  }
  return parsed.data;
};
