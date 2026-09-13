import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Docker 경계 스모크.
 *
 * 컨테이너 **안**은 이미지가 고정이라 매트릭스 테스트가 필요 없다. 깨지는 곳은 언제나 경계다 —
 * ① 볼륨 마운트 권한(호스트 UID/GID), ② bind mount에서 파일 watch(inotify), ③ 재시작 후 데이터
 * 유지, ④ 정적 클라이언트가 같은 오리진에서 나오는가. 이 넷만 본다.
 */
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const IMAGE = process.env["IMAGE"] ?? "arka:smoke";
const PORT = Number(process.env["PORT"] ?? 3997);
const NAME = `arka-smoke-${String(process.pid)}`;
const BASE = `http://127.0.0.1:${String(PORT)}`;
/** `/api/*`는 프로토콜 헤더가 있어야 통과한다(→ ADR 0017). */
const H = { "x-ade-protocol": "1", "content-type": "application/json" };

const docker = (...args: readonly string[]): string => {
  const { status, stdout } = spawnSync("docker", args, { encoding: "utf8" });
  if (status !== 0) throw new Error(`docker ${args.join(" ")} 실패`);
  return stdout;
};

const fail = (message: string): never => {
  console.error(message);
  console.error(spawnSync("docker", ["logs", NAME], { encoding: "utf8" }).stdout);
  throw new Error(message);
};

const api = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const response = await fetch(`${BASE}${path}`, { headers: H, ...init });
  if (!response.ok) fail(`${path}: ${String(response.status)}`);
  return response;
};

/** 헬스가 설 때까지 기다린다. 컨테이너가 아직 부팅 중일 수 있어 폴링 말고는 방법이 없다. */
const waitHealthy = async (): Promise<void> => {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch { /* 아직 안 떴다 */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("서버가 healthy가 되지 않았다");
};

const workspace = mkdtempSync(path.join(tmpdir(), "arka-ws-"));
const data = mkdtempSync(path.join(tmpdir(), "arka-data-"));

try {
  console.log("# build");
  // **`build.ts`를 통한다** — 직접 `docker build`를 부르면 회수 단계를 비껴가고, 그렇게 쌓인
  // 중간 이미지가 656개까지 간 적이 있다. 빌드하는 길은 저장소에 하나뿐이어야 한다.
  spawnSync("node", [`${REPO_ROOT}/ops/deploy/build.ts`, IMAGE], { stdio: "inherit" });
  docker("run", "-d", "--name", NAME,
    "--user", `${String(process.getuid?.() ?? 0)}:${String(process.getgid?.() ?? 0)}`,
    "-p", `127.0.0.1:${String(PORT)}:3000`,
    "-v", `${workspace}:/workspace`, "-v", `${data}:/data`, IMAGE);
  await waitHealthy();

  console.log("# ① 볼륨 권한 — 컨테이너가 만든 파일을 호스트 사용자가 소유한다");
  await api("/api/files", { method: "POST", body: JSON.stringify({ path: "from-container.txt", type: "file" }) });
  const owner = statSync(path.join(workspace, "from-container.txt")).uid;
  if (owner !== process.getuid?.()) fail(`소유자 불일치: ${String(owner)}`);
  await api("/api/files/content", { method: "PUT", body: JSON.stringify({ path: "from-container.txt", content: "hello" }) });
  const onHost = readFileSync(path.join(workspace, "from-container.txt"), "utf8");
  if (onHost !== "hello") fail(`내용 불일치: ${onHost}`);

  console.log("# ② bind mount에서 watch — 호스트가 바꾸면 SSE가 알린다");
  // 비재귀 감시라 바뀐 파일이 아니라 감시한 디렉터리(루트 = "")를 알린다. 하트비트(빈 배열)가 아닌
  // 프레임이 하나라도 오면 inotify가 bind mount를 통과한 것이다. **첫 유효 프레임에서 끝낸다** —
  // 정해둔 시간만큼 기다렸다가 훑으면 느린 기계에서 헛되이 실패한다.
  const watch = await api("/api/files/watch?path=");
  const reader = watch.body?.getReader();
  // `fail`은 화살표 함수라 TS가 `never`로 흐름을 좁히지 않는다 — 여기서는 직접 던진다.
  if (reader === undefined) throw new Error("watch 응답에 본문이 없다");
  const deadline = setTimeout(() => void reader.cancel(), 8_000);
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  spawnSync("sh", ["-c", `echo changed > ${path.join(workspace, "from-host.txt")}`]);
  let fired = false;
  const decoder = new TextDecoder();
  while (!fired) {
    const { done, value } = await reader.read();
    if (done) break;
    const frame = decoder.decode(value);
    if (frame.includes("paths") && !frame.includes('"paths":[]')) fired = true;
  }
  clearTimeout(deadline);
  await reader.cancel();
  if (!fired) fail("watch가 뜨지 않았다");

  console.log("# ③ 재시작 후 데이터 유지 — 워크스페이스 파일과 SQLite의 세션");
  // 응답은 `{ session: AgentSession }`이다 — **id가 최상위가 아니다.** 정규식으로 첫 `"id"`를
  // 집던 옛 방식은 그 중첩을 모른 채 우연히 맞았다. 파싱하니 실제 모양이 드러났다.
  const created = (await (await api("/api/agent/sessions", { method: "POST", body: JSON.stringify({ title: "smoke" }) })).json()) as { session?: { id?: string } };
  const sessionId = created.session?.id;
  if (sessionId === undefined) fail("세션이 만들어지지 않았다");
  statSync(path.join(data, "data.db"));
  docker("restart", NAME);
  await waitHealthy();
  const content = (await (await api("/api/files/content?path=from-container.txt")).json()) as { content?: string };
  if (content.content !== "hello") fail("재시작 뒤 파일이 사라졌다");
  const fetched = (await (await api(`/api/agent/sessions/${sessionId}`)).json()) as { session?: { title?: string } };
  if (fetched.session?.title !== "smoke") fail("재시작 뒤 세션이 사라졌다");

  console.log("# ④ 정적 클라이언트가 같은 오리진에서 나온다");
  const html = await (await fetch(`${BASE}/`)).text();
  if (!html.includes('<div id="root">')) fail("클라이언트가 서빙되지 않는다");

  console.log("ok");
} finally {
  spawnSync("docker", ["rm", "-f", NAME], { stdio: "ignore" });
  rmSync(workspace, { recursive: true, force: true });
  rmSync(data, { recursive: true, force: true });
}
