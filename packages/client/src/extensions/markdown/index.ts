import type { ExtensionModule } from "#core/extensions";
import { createWorkspaceMarkdownSource } from "./infra/WorkspaceMarkdownSource";
import { MarkdownPreviewModel } from "./model/MarkdownPreviewModel";
import { createPreviewTabProvider } from "./view/previewTabProvider";
import { MarkdownPreviewViewModel } from "./viewmodel/MarkdownPreviewViewModel";

/**
 * 마크다운 확장 — 미리보기 탭. filesystem을 모른다 — 그 포트 둘을 markdown이 바라는 모양으로 감싸는 어댑터를
 * 자기 infra가 갖고, 어느 포트인지는 `provides`에서 id로만 안다.
 */
export const markdown: ExtensionModule = {
  id: "arka.markdown",
  provides: [
    {
      id: "arka.markdown.source",
      lifetime: "singleton",
      create: (c) =>
        createWorkspaceMarkdownSource({
          files: c.resolve("arka.filesystem.workspaceFiles"),
          watch: c.resolve("arka.filesystem.workspaceWatch"),
        }),
    },
    {
      id: "arka.markdown.previewModel",
      lifetime: "singleton",
      create: (c) => new MarkdownPreviewModel({ source: c.resolve("arka.markdown.source") }),
    },
    {
      id: "arka.markdown.previewViewModel",
      lifetime: "singleton",
      create: (c) =>
        new MarkdownPreviewViewModel({
          previewModel: c.resolve("arka.markdown.previewModel"),
          commandCenterRegistry: c.resolve("arka.commands"),
        }),
    },
  ],
  activate: (c) => {
    c.resolve("arka.workbench.tabSystem").add(
      createPreviewTabProvider({
        get preview() {
          return c.resolve("arka.markdown.previewViewModel");
        },
      }),
    );
    // "미리보기 열기" 명령(Ctrl+Shift+V)은 ViewModel이 만들어지는 순간 등록된다 — 탭이 뜨기 전에 팔레트에 올린다.
    c.resolve("arka.markdown.previewViewModel");
  },
};
