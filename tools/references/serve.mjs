/**
 * openvscode-server를 띄우고 **찍을 거리가 있는 워크스페이스**를 만들어 준다.
 *
 *     node tools/references/serve.mjs up     사본을 맞추고 컨테이너를 띄운다
 *     node tools/references/serve.mjs down   컨테이너를 지운다
 *
 * 워크스페이스는 **저장소 사본**이다(`.output/references/workspace`). 진짜 워킹트리를 컨테이너에
 * 물리지 않는다 — 다른 세션이 같은 트리를 쓰고 있고, 여기서는 일부러 파일을 더럽힌다.
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { COMPOSE, WORKSPACE } from "./paths.mjs";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const URL_BASE = "http://127.0.0.1:13000";

const run = (file, args, cwd = REPO) =>
  execFileSync(file, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * 사본을 원본과 맞추고 **일부러 더럽힌다.** 고친 파일·새 파일·지운 파일이 있어야
 * 더티 탭·SCM 목록·diff가 빈 패널이 아니게 된다.
 */
const prepareWorkspace = () => {
  if (!existsSync(path.join(WORKSPACE, ".git"))) {
    rmSync(WORKSPACE, { recursive: true, force: true });
    run("git", ["clone", "--quiet", "--depth", "1", `file://${REPO}`, WORKSPACE]);
  }
  run("git", ["-C", WORKSPACE, "checkout", "--", "."]);
  // `-x`까지 지운다 — 서버가 앞선 실행에서 워크스페이스 안에 남긴 `.cache`·`.openvscode-server`가
  // 탐색기 트리에 그대로 보인다.
  run("git", ["-C", WORKSPACE, "clean", "-qfdx"]);

  // 편집기가 워크스페이스 안에 만드는 `.cache/`가 SCM 목록에 섞인다. 우리가 일부러 만든
  // 고침·새로·지움 셋만 보이도록 그것만 가린다.
  writeFileSync(path.join(WORKSPACE, ".git/info/exclude"), ".cache/\n");

  // 고친 파일 — 더티 탭과 diff가 여기서 나온다.
  const concept = path.join(WORKSPACE, "docs/concept.md");
  const text = readFileSync(concept, "utf8");
  writeFileSync(concept, text.replace("# ARKA\n", "# ARKA\n\n<!-- 레퍼런스 캡처용으로 고친 줄이다. -->\n"));

  // 새 파일 — SCM 목록의 'U'와 탐색기의 색칠.
  writeFileSync(path.join(WORKSPACE, "docs/scratch.md"), "# 새로 만든 문서\n\n- 하나\n- 둘\n");

  // 지운 파일 — SCM 목록의 'D'.
  rmSync(path.join(WORKSPACE, "SECURITY.md"), { force: true });
};

const compose = (...args) => run("docker", ["compose", "-f", COMPOSE, ...args]);

const waitReady = async () => {
  for (let tries = 0; tries < 90; tries += 1) {
    try {
      const response = await fetch(URL_BASE, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      /* 아직 안 떴다 */
    }
    await new Promise((done) => setTimeout(done, 2000));
  }
  throw new Error(`${URL_BASE}가 3분 안에 안 떴습니다`);
};

const [action = "up"] = process.argv.slice(2);
if (action === "down") {
  compose("down", "-v");
  console.log("컨테이너를 지웠습니다.");
} else {
  prepareWorkspace();
  console.log("워크스페이스를 맞췄습니다 — 고침 1 · 새로 1 · 지움 1");
  compose("up", "-d");
  await waitReady();
  console.log(`${URL_BASE} 준비됨`);
}
