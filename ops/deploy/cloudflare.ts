/**
 * Cloudflare REST를 감싼다. **존 이름만 알면 되게 한다** — 존 ID도 계정 ID도 코드에 박지 않는다.
 *
 * DNS는 **삭제만** 여기 있다. 생성은 `cloudflared tunnel route dns`가 하므로 `proxied`나
 * `<uuid>.cfargotunnel.com`을 우리가 알 필요가 없다. CLI에 삭제 명령이 없어 이쪽만 REST다.
 */

const API = "https://api.cloudflare.com/client/v4";

/** `fetch`를 주입받는 포트. 테스트가 실제 API를 부르지 않게 한다. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

interface Envelope<T> {
  readonly success: boolean;
  readonly errors: readonly { readonly code?: number; readonly message?: string }[];
  readonly result?: T;
}

/**
 * 실패를 **코드까지 담아** 던진다.
 *
 * Zero Trust가 꺼져 있으면 `9999`, 토큰에 Access 권한이 없으면 `10000`이다. 메시지는 둘 다
 * 모호해서 **코드가 유일한 단서다** — 이걸 빼면 대시보드를 뒤지는 시간이 길어진다.
 */
const fail = (what: string, status: number, body: Envelope<unknown>): never => {
  const detail = body.errors.map((e) => `${String(e.code ?? "?")} ${e.message ?? ""}`).join("; ");
  throw new Error(`${what} 실패 (HTTP ${String(status)}): ${detail || "(상세 없음)"}`);
};

const call = async <T>(fetchImpl: FetchLike, what: string, url: string, init?: RequestInit): Promise<Envelope<T>> => {
  const res = await fetchImpl(url, init);
  const body = (await res.json()) as Envelope<T>;
  if (!body.success) fail(what, res.status, body);
  return body;
};

const auth = (token: string): Record<string, string> => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

/** 존 이름(`sangjun.dev`)을 존 ID로 바꾼다. */
export const resolveZoneId = async (fetchImpl: FetchLike, token: string, zone: string): Promise<string> => {
  const body = await call<readonly { id: string }[]>(
    fetchImpl, `존 ${zone} 조회`, `${API}/zones?name=${encodeURIComponent(zone)}`, { headers: auth(token) },
  );
  const found = body.result?.[0];
  if (found === undefined) throw new Error(`존 ${zone}을 찾지 못했습니다 — 토큰이 그 존을 못 볼 수도 있습니다`);
  return found.id;
};

/**
 * 호스트 이름의 CNAME을 전부 지우고 **지운 개수**를 돌려준다.
 *
 * 보통 하나지만 방어적으로 반복한다 — 남은 하나가 다음 배포의 `route dns`를 거부하게 만든다.
 */
export const deleteDnsRecords = async (
  fetchImpl: FetchLike, token: string, zoneId: string, hostname: string,
): Promise<number> => {
  const body = await call<readonly { id: string }[]>(
    fetchImpl, `DNS ${hostname} 조회`,
    `${API}/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`,
    { headers: auth(token) },
  );
  const records = body.result ?? [];
  for (const record of records) {
    await fetchImpl(`${API}/zones/${zoneId}/dns_records/${record.id}`, { method: "DELETE", headers: auth(token) });
  }
  return records.length;
};

/** Access 앱 중 우리가 쓰는 것만. */
export interface AccessApp {
  readonly id: string;
  readonly domain: string;
  readonly name?: string;
}

/**
 * **`domain`으로 찾는다. 이름으로 찾으면 틀린다** — 앱 이름은 `ade`인데 도메인은
 * `arka.sangjun.dev`라 둘이 다르고, 같은 이름의 앱이 여럿일 수 있다.
 */
export const findAccessApp = async (
  fetchImpl: FetchLike, token: string, zoneId: string, hostname: string,
): Promise<AccessApp | undefined> => {
  const body = await call<readonly AccessApp[]>(
    fetchImpl, "Access 앱 조회", `${API}/zones/${zoneId}/access/apps`, { headers: auth(token) },
  );
  return (body.result ?? []).find((app) => app.domain === hostname);
};

/**
 * 이메일 목록을 Access 앱 하나로 **수렴시킨다**(만드는 것이 아니라 상태를 보장한다).
 *
 * 갱신은 PATCH가 아니라 **PUT**이다 — 부분 갱신이면 지난 실행이 남긴 정책이 겹쳐 쌓인다.
 * 정책은 별도 엔드포인트가 아니라 앱 본문에 인라인으로 넣는다.
 */
export const ensureAccessApp = async (
  fetchImpl: FetchLike, token: string, zoneId: string,
  spec: { readonly hostname: string; readonly name: string; readonly emails: readonly string[] },
): Promise<string> => {
  const existing = await findAccessApp(fetchImpl, token, zoneId, spec.hostname);
  const body = {
    domain: spec.hostname,
    type: "self_hosted",
    name: spec.name,
    session_duration: "720h",
    // `include`가 이중 중첩(`{email:{email}}`)이다. 한 겹으로 보내면 조용히 아무도 못 들어온다.
    policies: [{
      name: "owner",
      decision: "allow",
      include: spec.emails.map((email) => ({ email: { email } })),
    }],
  };
  const result = await call<{ id: string }>(
    fetchImpl, `Access 앱 ${spec.hostname}`,
    existing === undefined ? `${API}/zones/${zoneId}/access/apps` : `${API}/zones/${zoneId}/access/apps/${existing.id}`,
    { method: existing === undefined ? "POST" : "PUT", headers: auth(token), body: JSON.stringify(body) },
  );
  const id = result.result?.id;
  if (id === undefined) throw new Error(`Access 앱 ${spec.hostname}의 응답에 id가 없습니다`);
  return id;
};

/** 있으면 지우고 `true`, 없으면 `false`. */
export const deleteAccessApp = async (
  fetchImpl: FetchLike, token: string, zoneId: string, hostname: string,
): Promise<boolean> => {
  const existing = await findAccessApp(fetchImpl, token, zoneId, hostname);
  if (existing === undefined) return false;
  await fetchImpl(`${API}/zones/${zoneId}/access/apps/${existing.id}`, { method: "DELETE", headers: auth(token) });
  return true;
};
