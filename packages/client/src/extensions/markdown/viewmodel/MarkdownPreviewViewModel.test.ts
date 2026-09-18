import { URI } from "#contracts";
import { CommandService } from "#core/commands";
import { describe, expect, it, vi } from "vitest";
import { MarkdownPreviewModel } from "../model/MarkdownPreviewModel";
import { MockMarkdownSource } from "../model/MockMarkdownSource";
import { MarkdownPreviewViewModel } from "./MarkdownPreviewViewModel";

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
/** 셸이 낼 것을 흉내 낸다 — `tab.active.uri` 문맥과 `arka.workbench.open` 명령. */
const make = (activeFile: string | null) => {
  const open = vi.fn();
  const registry = new CommandService({
    overridesStore: { load: () => ({}), save: () => undefined },
    reportError: () => undefined,
  });
  registry.contexts.add({ id: "tab.active.uri", value: () => (activeFile === null ? null : URI.file(activeFile)) });
  registry.actions.add({ id: "arka.workbench.open", label: "열기", execute: open });
  const viewModel = new MarkdownPreviewViewModel({
    previewModel: new MarkdownPreviewModel({ source: new MockMarkdownSource({ "a.md": "# 하나" }) }),
    commandCenterRegistry: registry,
  });
  return { viewModel, open, registry };
};

describe("MarkdownPreviewViewModel", () => {
  it("커맨드가 활성 .md 파일의 미리보기 탭을 연다", () => {
    const { open, registry } = make("docs/a.md");
    registry.execute("markdown.openPreview");
    expect(open).toHaveBeenCalledExactlyOnceWith({ uri: URI.parse("markdown-preview:///docs/a.md") });
    expect(registry.dispatchKeydown(new KeyboardEvent("keydown", { key: "V", ctrlKey: true, shiftKey: true }))).toBe(
      true,
    );
  });

  it("활성 파일이 마크다운이 아니면 아무 일도 없다", () => {
    const { viewModel, open, registry } = make("a.ts");
    viewModel.openActivePreview();
    expect(open).not.toHaveBeenCalled();
    // 단축키도 `when`으로 막힌다 — 마크다운이 아닌 탭에서 Ctrl+Shift+V는 아무것도 아니다.
    expect(registry.dispatchKeydown(new KeyboardEvent("keydown", { key: "V", ctrlKey: true, shiftKey: true }))).toBe(
      false,
    );
  });

  it("경로로 미리보기를 열고 원문을 준다", async () => {
    const { viewModel } = make(null);
    viewModel.openPreview("a.md");
    expect(viewModel.previewOf("a.md").loading).toBe(true);
    await settled();
    expect(viewModel.previewOf("a.md")).toMatchObject({ loading: false, markdown: "# 하나" });
  });
});
