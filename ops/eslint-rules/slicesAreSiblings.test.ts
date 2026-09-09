import path from "node:path";
import { createRuleTester } from "./ruleTester";
import { slicesAreSiblings } from "./slicesAreSiblings";

/** 규칙은 저장소 루트 기준 경로로 판정한다 — vitest의 cwd(`ops/`)가 아니라 파일 위치에서 뽑는다. */
const at = (relative: string): string => path.resolve(import.meta.dirname, "../..", relative);
// 규칙은 `roots`를 `context.cwd` 기준으로 푼다. 테스트의 cwd는 `ops/`이므로 절대경로로 준다.
const options = [{ roots: [at("packages/client/src/extensions"), at("packages/server/src/features")] }];

createRuleTester().run("slices-are-siblings", slicesAreSiblings, {
  valid: [
    {
      name: "같은 슬라이스 안은 된다",
      filename: at("packages/client/src/extensions/filesystem/view/A.tsx"),
      code: "import { x } from '../model/IWorkspaceFiles';",
      options,
    },
    {
      name: "별칭은 슬라이스가 아니다",
      filename: at("packages/client/src/extensions/filesystem/view/A.tsx"),
      code: "import { createToken } from '#core/di';",
      options,
    },
    {
      name: "루트 밖 파일은 대상이 아니다",
      filename: at("packages/client/src/workbench/registerServices.tsx"),
      code: "import { a } from '../extensions/filesystem'; import { b } from '../extensions/agent';",
      options,
    },
    {
      name: "다른 루트의 슬라이스는 비교하지 않는다",
      filename: at("packages/server/src/features/filesystem/index.ts"),
      code: "import { x } from '../../core/config';",
      options,
    },
  ],
  invalid: [
    {
      name: "extension이 형제 extension을 import",
      filename: at("packages/client/src/extensions/git/model/A.ts"),
      code: "import { x } from '../../filesystem/model/IWorkspaceFiles';",
      options,
      errors: [{ messageId: "crossSlice", data: { from: "git", to: "filesystem" } }],
    },
    {
      name: "재수출도 잡는다",
      filename: at("packages/client/src/extensions/agent/index.ts"),
      code: "export { x } from '../filesystem';",
      options,
      errors: [{ messageId: "crossSlice" }],
    },
    {
      name: "export * 도 잡는다",
      filename: at("packages/client/src/extensions/agent/index.ts"),
      code: "export * from '../filesystem/model/IWorkspaceFiles';",
      options,
      errors: [{ messageId: "crossSlice" }],
    },
    {
      name: "동적 import도 잡는다",
      filename: at("packages/client/src/extensions/agent/infra/A.ts"),
      code: "const m = import('../../filesystem');",
      options,
      errors: [{ messageId: "crossSlice" }],
    },
    {
      name: "서버 feature끼리도 같은 규칙",
      filename: at("packages/server/src/features/static/transport/a.ts"),
      code: "import { resolveWithin } from '../../filesystem/infra/fileOperations';",
      options,
      errors: [{ messageId: "crossSlice", data: { from: "static", to: "filesystem" } }],
    },
  ],
});
