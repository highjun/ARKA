import { observable, observableRef } from "mobx";
import { Icon } from "#component/Icon";
import type { TabProviderDescriptor } from "../../../workbench/model/ITabProviderDescriptor";
import type { IMarkdownPreviewViewModel } from "../viewmodel/IMarkdownPreviewViewModel";
import { MarkdownPreviewTabView } from "./MarkdownPreviewTabView";

/** 미리보기 탭이 가리키는 자원의 스킴. `path`는 원본 마크다운의 워크스페이스 경로다. */
const PREVIEW_SCHEME = "markdown-preview";

/** 경로의 마지막 조각. */
const nameOf = (path: string): string => path.split("/").pop() ?? path;

/**
 * 마크다운 미리보기 탭 provider. `markdown-preview:///<path>`만 받는다 — 텍스트 provider보다 위지만(`priority 10`)
 * 스킴이 다르므로 실제로 겨루는 일은 없다. 미리보기는 저장된 내용을 따르므로 더러워지지 않는다.
 */
export const createPreviewTabProvider = (deps: {
  /** 열 때마다 읽는다 — 조립부가 getter로 늦게 꺼낼 수 있게. */
  readonly preview: IMarkdownPreviewViewModel;
}): TabProviderDescriptor => ({
  id: "arka.markdown.preview",
  priority: 10,
  // `async`인 이유 — `view/`는 `.resolve(` 호출을 금지해서 `Promise.resolve`도 못 쓴다.
  openTab: async (uri) => {
    if (uri.scheme !== PREVIEW_SCHEME) return undefined;
    const path = uri.path;
    deps.preview.openPreview(path);
    return observable(
      {
        icon: <Icon iconId="bookOpen" size="sm" />,
        title: `미리보기 ${nameOf(path)}`,
        isDirty: false,
        Content: () => <MarkdownPreviewTabView path={path} />,
      },
      { icon: observableRef, Content: observableRef },
    );
  },
});
