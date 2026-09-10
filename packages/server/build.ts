import path from "node:path";
import { build } from "esbuild";

/**
 * 서버를 **단일 번들**로 낸다 — 실행 이미지에 `node_modules`를 넣지 않기 위해서다
 * (`ops/deploy/Dockerfile`이 `dist/`만 복사한다).
 *
 * 나가는 자리는 `.output/dist/server` — 클라이언트 산출물(`.output/dist/client`)과 나란히 놓여
 * 그 둘이 배포 단위 하나가 된다(→ ADR 0002). 이미지는 이 폴더만 복사한다.
 */
const repoRoot = path.resolve(import.meta.dirname, "../..");

await build({
  entryPoints: [path.join(import.meta.dirname, "src/index.ts")],
  outfile: path.join(repoRoot, ".output/dist/server/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  // 런타임과 같은 버전을 겨눈다 — `engines`가 Node ≥24를 요구한다.
  target: "node24",
  sourcemap: true,
});
