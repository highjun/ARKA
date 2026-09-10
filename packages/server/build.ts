import path from "node:path";
import { build } from "esbuild";
import output from "ops/output.json" with { type: "json" };

/**
 * 서버를 **단일 번들**로 낸다 — 실행 이미지에 `node_modules`를 넣지 않기 위해서다
 * (`ops/deploy/Dockerfile`이 `dist/`만 복사한다).
 *
 * 나가는 자리는 `ops/output.json`이 정한다. 클라이언트 산출물·E2E·`start`가 같은 값을 봐야
 * 하는데, 예전에 이 값이 한 곳만 낡아 첫 실행에서 깨진 적이 있다(`87c452f`).
 */
const repoRoot = path.resolve(import.meta.dirname, "../..");

await build({
  entryPoints: [path.join(import.meta.dirname, "src/index.ts")],
  outfile: path.join(repoRoot, output.serverEntry),
  bundle: true,
  platform: "node",
  format: "esm",
  // 런타임과 같은 버전을 겨눈다 — `engines`가 Node ≥24를 요구한다.
  target: "node24",
  sourcemap: true,
});
