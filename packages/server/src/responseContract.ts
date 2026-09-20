import { realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ZodType } from "zod";
import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";
import { createApp } from "./app";
import { makeConfig } from "./core/config.testing";

export type RouteProbe = { readonly app: ReturnType<typeof createApp>["app"]; readonly workspaceRoot: string };

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

export const probeApp = async (): Promise<RouteProbe & { dispose: () => Promise<void> }> => {
  const workspaceRoot = realpathSync(await mkdtemp(path.join(os.tmpdir(), "arka-response-")));
  const { app } = createApp({
    config: makeConfig({ workspaceRoot }),
    log: silent,
    startedAt: "2026-09-09T00:00:00.000Z",
  });
  return { app, workspaceRoot, dispose: () => rm(workspaceRoot, { recursive: true, force: true }) };
};

export const withProtocol = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...(init.headers as Record<string, string> | undefined), [PROTOCOL_HEADER]: String(PROTOCOL_VERSION) },
});

export const expectResponse = async <T>(
  probe: RouteProbe,
  request: { readonly url: string; readonly init?: RequestInit; readonly status?: number },
  schema: ZodType<T>,
): Promise<T> => {
  const response = await probe.app.request(request.url, withProtocol(request.init));
  const expected = request.status ?? 200;
  if (response.status !== expected) {
    throw new Error(
      `${request.url} — 상태가 ${String(expected)}이어야 하는데 ${String(response.status)}: ${await response.text()}`,
    );
  }
  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      `${request.url} — 응답이 계약에 어긋난다:\n${parsed.error.message}\n받은 것: ${JSON.stringify(body)}`,
    );
  }
  return parsed.data;
};
