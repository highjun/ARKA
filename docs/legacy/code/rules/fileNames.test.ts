import path from "node:path";
import { fileNames } from "./fileNames";
import { createRuleTester } from "./ruleTester";

/** 규칙은 저장소 루트 기준 경로로 판정한다 — vitest의 cwd(`ops/`)가 아니라 파일 위치에서 뽑는다. */
const at = (relative: string): string => path.resolve(import.meta.dirname, "../../..", relative);

createRuleTester().run("file-names", fileNames, {
  valid: [
    { name: "클래스 파일 PascalCase", filename: at("packages/client/src/workbench/model/TabsModel.ts"), code: "" },
    { name: "계약 I<Name>", filename: at("packages/client/src/workbench/model/ITabsModel.ts"), code: "" },
    { name: "함수 모듈 camelCase", filename: at("packages/client/src/core/http/readSse.ts"), code: "" },
    { name: "꼬리는 소문자", filename: at("packages/client/src/a/B.stories.tsx"), code: "" },
    { name: "폴더 camelCase", filename: at("packages/client/src/core/viewmodel/useViewModel.ts"), code: "" },
    { name: "컴포넌트 폴더 PascalCase", filename: at("packages/client/src/a/component/FileTree/FileTree.tsx"), code: "" },
    { name: "src 밖은 대상이 아니다", filename: at("packages/client/test/e2e/shell-spec.ts"), code: "" },
  ],
  invalid: [
    { name: "kebab-case 폴더", filename: at("packages/client/src/core/file-tree/x.ts"), code: "", errors: [{ messageId: "directory" }] },
    { name: "kebab-case 파일", filename: at("packages/client/src/core/read-sse.ts"), code: "", errors: [{ messageId: "file" }] },
    { name: "snake_case 파일", filename: at("packages/client/src/core/read_sse.ts"), code: "", errors: [{ messageId: "file" }] },
    { name: "snake_case 폴더", filename: at("packages/client/src/core/view_model/x.ts"), code: "", errors: [{ messageId: "directory" }] },
    { name: "대문자 꼬리", filename: at("packages/client/src/a/B.Test.tsx"), code: "", errors: [{ messageId: "file" }] },
  ],
});
