import path from "node:path";
import { componentsHaveStories } from "./componentsHaveStories";
import { createRuleTester } from "./ruleTester";

/** 스토리 존재는 실제 파일시스템으로 판정한다 — 리포 안의 진짜 경로를 fixture로 쓴다. */
const at = (relative: string): string => path.resolve(process.cwd(), relative);

createRuleTester().run("components-have-stories", componentsHaveStories, {
  valid: [
    {
      name: "스토리가 있는 컴포넌트는 통과한다",
      filename: at("packages/client/src/shared/components/common/Icon/Icon.tsx"),
      code: "export const Icon = () => null;",
    },
    {
      name: "슬라이스의 component/도 같은 규칙이다",
      filename: at("packages/client/src/extensions/filesystem/component/FileTree/FileTree.tsx"),
      code: "export const FileTree = () => null;",
    },
    {
      name: "폴더의 곁다리 파일은 대상이 아니다 — 주인 파일만 본다",
      filename: at("packages/client/src/extensions/filesystem/component/FileTree/useTreeNavigation.tsx"),
      code: "export const useTreeNavigation = () => null;",
    },
    {
      name: "view/는 대상이 아니다 — 조합이 드러나는 것만 고른다",
      filename: at("packages/client/src/workbench/view/RootView.tsx"),
      code: "export const RootView = () => null;",
    },
    {
      name: "스토리 파일 자신은 대상이 아니다",
      filename: at("packages/client/src/shared/components/common/Icon/Icon.stories.tsx"),
      code: "export default {};",
    },
    {
      name: "테스트 파일도 대상이 아니다",
      filename: at("packages/client/src/shared/components/common/Icon/Icon.test.tsx"),
      code: "export const x = 1;",
    },
  ],
  invalid: [
    {
      name: "스토리가 없는 컴포넌트는 걸린다",
      filename: at("packages/client/src/shared/components/common/NoStory/NoStory.tsx"),
      code: "export const NoStory = () => null;",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "슬라이스의 component/에서도 걸린다",
      filename: at("packages/client/src/extensions/agent/component/NoStory/NoStory.tsx"),
      code: "export const NoStory = () => null;",
      errors: [{ messageId: "missing" }],
    },
  ],
});
