import { describe, expect, it } from "vitest";
import { isClean, render } from "./index.ts";

describe("isClean", () => {
  it("셋 다 비면 깨끗하다", () => {
    expect(isClean({ contracts: [], outside: [], ui: [] })).toBe(true);
  });

  it("packages 밖이 하나라도 있으면 아니다", () => {
    expect(isClean({ contracts: [], outside: [{ path: "ops/knip.config.ts", status: "modified" }], ui: [] })).toBe(
      false,
    );
  });

  it("그림만 바뀌어도 아니다", () => {
    expect(isClean({ contracts: [], outside: [], ui: [{ story: "a--b", change: "changed" }] })).toBe(false);
  });
});

describe("render", () => {
  it("깨끗하면 아무 말도 안 한다", () => {
    expect(render({ contracts: [], outside: [], ui: [] })).toBe("");
  });

  it("세 갈래를 세어 적는다", () => {
    const text = render({
      contracts: [{ file: "filesystem/types.ts", name: "FileEntry", kind: "const", change: "changed" }],
      outside: [
        { path: "ops/deploy/compose.yml", status: "modified" },
        { path: "pnpm-lock.yaml", status: "modified" },
      ],
      ui: [{ story: "workbench-sidebar--default", change: "changed" }],
    });
    expect(text).toContain("### 계약 1건");
    expect(text).toContain("`FileEntry` (const) — 바뀜");
    expect(text).toContain("### `packages/` 밖 2건");
    expect(text).toContain("`pnpm-lock.yaml` — 고침");
    expect(text).toContain("### UI 1건");
    expect(text).toContain("`workbench-sidebar--default` — 바뀜");
  });

  it("곁들인 마크다운이 있으면 깨끗해도 적는다", () => {
    const text = render({ contracts: [], outside: [], ui: [] }, "### UI — 승인된 그림이 없는 스토리 97개");
    expect(text).toContain("## 사용자 검토가 필요합니다");
    expect(text).toContain("승인된 그림이 없는 스토리 97개");
  });
});
