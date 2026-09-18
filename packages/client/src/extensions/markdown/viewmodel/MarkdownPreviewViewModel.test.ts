import { URI } from "#contracts";
import { CommandService } from "#core/commands";
import { describe, expect, it, vi } from "vitest";
import { MarkdownPreviewModel } from "../model/MarkdownPreviewModel";
import { MockMarkdownSource } from "../model/MockMarkdownSource";
import { MarkdownPreviewViewModel } from "./MarkdownPreviewViewModel";

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const make = (activeFile: string | null) => {
  const openUri = vi.fn();
  const registry = new CommandService({
    overridesStore: { load: () => ({}), save: () => undefined },
    reportError: () => undefined,
  });
  const viewModel = new MarkdownPreviewViewModel({
    previewModel: new MarkdownPreviewModel({ source: new MockMarkdownSource({ "a.md": "# 하나" }) }),
    commandCenterRegistry: registry,
    activeFile: () => activeFile,
    openUri,
  });
  return { viewModel, openUri, registry };
};

describe("MarkdownPreviewViewModel", () => {
  it("커맨드가 활성 .md 파일의 미리보기 탭을 연다", () => {
    const { openUri, registry } = make("docs/a.md");
    registry.execute("markdown.openPreview");
    expect(openUri).toHaveBeenCalledExactlyOnceWith(URI.parse("markdown-preview:///docs/a.md"));
    expect(registry.dispatchKeydown(new KeyboardEvent("keydown", { key: "V", ctrlKey: true, shiftKey: true }))).toBe(
      true,
    );
  });

  it("활성 파일이 마크다운이 아니면 아무 일도 없다", () => {
    const { viewModel, openUri } = make("a.ts");
    viewModel.openActivePreview();
    expect(openUri).not.toHaveBeenCalled();
  });

  it("경로로 미리보기를 열고 원문을 준다", async () => {
    const { viewModel } = make(null);
    viewModel.openPreview("a.md");
    expect(viewModel.previewOf("a.md").loading).toBe(true);
    await settled();
    expect(viewModel.previewOf("a.md")).toMatchObject({ loading: false, markdown: "# 하나" });
  });
});
