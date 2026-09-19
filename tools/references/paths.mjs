/**
 * 이 도구가 읽고 쓰는 자리. `tools/figma/paths.mjs`와 같은 규약이다.
 *
 * **스크립트는 `tools/references/`(추적됨)에 살고 이미지는 `docs/references/assets/`
 * (추적 안 됨)에 남는다.** 남의 제품 화면이라 공개 저장소에 싣지 않는다 — 색인만 커밋한다.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const REPO = path.resolve(HERE, "..", "..");

/** 캡처한 이미지가 쌓이는 자리. 루트 `.gitignore`가 막는다. */
export const ASSETS = path.join(REPO, "docs", "references", "assets");

/** 이미지마다 무엇인지 적는 색인. **이것만 커밋한다.** */
export const INDEX = path.join(REPO, "docs", "references", "description.json");

/** 캡처할 때 본 것. **설명은 이것을 보고 쓴다** — 그림보다 먼저 쓰지 않으려는 장치다. */
export const PROBE = path.join(REPO, ".output", "references", "probe.json");

/** openvscode-server에 물리는 저장소 사본. 컨테이너가 진짜 워킹트리를 못 건드리게 한다. */
export const WORKSPACE = path.join(REPO, ".output", "references", "workspace");

/** compose 파일이 사는 자리. `docker compose -f`에 그대로 준다. */
export const COMPOSE = path.join(HERE, "compose.yml");

export const asset = (name) => {
  mkdirSync(ASSETS, { recursive: true });
  return path.join(ASSETS, name);
};

export const ensureOutput = () => {
  mkdirSync(path.dirname(PROBE), { recursive: true });
};
