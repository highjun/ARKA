# ADR 0012: 패키지 안의 경로는 `imports` 필드로 가리킨다

## 결정:
- 패키지 **안**의 경로 별칭은 `package.json`의 **`imports` 필드**를 쓴다 — `#core/*`, `#utils/*`, `#components/*`. tsc·vite·vitest·node가 전부 같은 방식으로 해석한다.
- 슬라이스 **내부**는 상대경로로 부른다(`../model/IThemeModel`). 폴더를 통째로 옮겨도 그대로 유효하다.
- 패키지 **간**은 workspace 패키지명으로 부른다(→ [ADR 0001](0001-monorepo-pnpm.md)).

## 기각:
- **`#extensions/*`·`#workbench/*` 서브패스** — 슬라이스 간 직접 import를 가장 쉽게 만드는 초대장이다. 게다가 `import-x/no-restricted-paths`가 `#`-서브패스를 해석하지 못해, 그 경로로 들어온 위반은 **에러도 경고도 없이 조용히 통과한다**.
- tsconfig `paths` — [ADR 0001](0001-monorepo-pnpm.md)에서 이미 기각했다. tsc만 알아서 vitest·node에서 깨진다.
- 깊은 상대경로(`../../../shared/components`) — 폴더 깊이가 바뀔 때마다 전부 틀어진다. 실제로 구조 재편 때 이것 때문에 고칠 곳이 늘었다.

## 상태:
승인됨. `#core/*`가 `./src/core/*/index.ts`로 매핑되므로 core 하위에 폴더가 아닌 파일을 두려면 개별 항목이 필요하다(`#core/errors`가 그 예다).
