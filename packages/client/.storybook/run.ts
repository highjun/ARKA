import { spawnSync } from "node:child_process";
import path from "node:path";
import output from "../output.json" with { type: "json" };

/**
 * Storybook을 띄우거나 빌드한다.
 *
 * **`package.json`이 아니라 여기서 부르는 이유**는 출력 경로 때문이다. 그 값을 VRT 설정과
 * 스펙도 봐야 하는데(`test/vrt/`), JSON 스크립트는 파일을 읽을 수 없어 값을 적는 순간 사본이
 * 하나 더 생긴다. 여기서는 `output.json`을 그대로 읽는다.
 *
 * 포트는 넘기지 않는다 — Storybook의 기본값(6006)이라 적으면 중복이다.
 */
const CLIENT_ROOT = path.resolve(import.meta.dirname, "..");
const mode = process.argv[2];
if (mode !== "dev" && mode !== "build") throw new Error(`dev 또는 build여야 한다: ${String(mode)}`);

const args = mode === "dev" ? ["dev", "--no-open"] : ["build", "-o", output.storybook];
const { status } = spawnSync("storybook", args, { cwd: CLIENT_ROOT, stdio: "inherit" });
process.exit(status ?? 1);
