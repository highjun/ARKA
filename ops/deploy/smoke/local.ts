import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const IMAGE = process.env["IMAGE"] ?? "arka:smoke";
const PORT = Number(process.env["PORT"] ?? 3997);
const NAME = `arka-smoke-${String(process.pid)}`;
const BASE = `http://127.0.0.1:${String(PORT)}`;
const H = { "x-arka-protocol": "1", "content-type": "application/json" };

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

const waitHealthy = async (): Promise<void> => {
  for (let i = 0; i < 30; i += 1) {
    const healthy = await fetch(`${BASE}/api/health`)
      .then((response) => response.ok)
      .catch(() => false);
    if (healthy) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("서버가 healthy가 되지 않았다");
};

const workspace = mkdtempSync(path.join(tmpdir(), "arka-ws-"));

try {
  console.log("# build");
  spawnSync("node", [`${REPO_ROOT}/ops/deploy/build.ts`, IMAGE], { stdio: "inherit" });
  docker(
    "run",
    "-d",
    "--name",
    NAME,
    "--user",
    `${String(process.getuid?.() ?? 0)}:${String(process.getgid?.() ?? 0)}`,
    "-p",
    `127.0.0.1:${String(PORT)}:3000`,
    "-v",
    `${workspace}:/workspace`,
    IMAGE,
  );
  await waitHealthy();

  console.log("# ① 볼륨 권한 — 컨테이너가 만든 파일을 호스트 사용자가 소유한다");
  await api("/api/files", { method: "POST", body: JSON.stringify({ path: "from-container.txt", type: "file" }) });
  const owner = statSync(path.join(workspace, "from-container.txt")).uid;
  if (owner !== process.getuid?.()) fail(`소유자 불일치: ${String(owner)}`);
  await api("/api/files/content", {
    method: "PUT",
    body: JSON.stringify({ path: "from-container.txt", content: "hello" }),
  });
  const onHost = readFileSync(path.join(workspace, "from-container.txt"), "utf8");
  if (onHost !== "hello") fail(`내용 불일치: ${onHost}`);

  console.log("# ② bind mount에서 watch — 호스트가 바꾸면 SSE가 알린다");
  const watch = await api("/api/files/watch?path=");
  const reader = watch.body?.getReader();
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

  console.log("# ③ 재시작 후 데이터 유지 — 워크스페이스 파일");
  docker("restart", NAME);
  await waitHealthy();
  const content = (await (await api("/api/files/content?path=from-container.txt")).json()) as { content?: string };
  if (content.content !== "hello") fail("재시작 뒤 파일이 사라졌다");

  console.log("# ④ 정적 클라이언트가 같은 오리진에서 나온다");
  const html = await (await fetch(`${BASE}/`)).text();
  if (!html.includes('<div id="root">')) fail("클라이언트가 서빙되지 않는다");

  console.log("ok");
} finally {
  spawnSync("docker", ["rm", "-f", NAME], { stdio: "ignore" });
  rmSync(workspace, { recursive: true, force: true });
}
