import { URI } from "#contracts";
import { describe, expect, it, vi } from "vitest";
import type { IFileContentViewModel } from "../viewmodel/IFileContentViewModel";
import { createTextTabProvider } from "./textTabProvider";

const fakeFileContent = (opens: boolean, isDirty = false): IFileContentViewModel => ({
  dispose: () => undefined,
  rows: { "docs/a.md": { content: "", notice: null, readOnly: false, isDirty, isSaving: false, loading: false } },
  onDidChange: () => ({ dispose: () => undefined }),
  reveals: {},
  revealAt: () => undefined,
  openFile: vi.fn(() => Promise.resolve(opens)),
  editFile: () => undefined,
  saveFile: () => undefined,
  retargetOpenFile: () => undefined,
  startWatching: () => undefined,
  stopWatching: () => undefined,
});

describe("텍스트 탭 provider", () => {
  it("file 스킴이 아니면 읽어 보지도 않고 거절한다", async () => {
    const fileContent = fakeFileContent(true);
    const provider = createTextTabProvider({ fileContent });

    await expect(provider.openTab(URI.parse("chat:///1"))).resolves.toBeUndefined();
    expect(fileContent.openFile).not.toHaveBeenCalled();
  });

  it("읽어서 텍스트면 파일 이름을 제목으로 한 descriptor를 돌려준다", async () => {
    const provider = createTextTabProvider({ fileContent: fakeFileContent(true) });

    const descriptor = await provider.openTab(URI.file("docs/a.md"));

    expect(descriptor?.title).toBe("a.md");
    expect(descriptor?.isDirty).toBe(false);
  });

  it("텍스트가 아니면(openFile이 false) 거절한다 — 다음 provider에게 넘어간다", async () => {
    const provider = createTextTabProvider({ fileContent: fakeFileContent(false) });

    await expect(provider.openTab(URI.file("x.png"))).resolves.toBeUndefined();
  });

  it("isDirty는 그 경로의 행을 따른다", async () => {
    const provider = createTextTabProvider({ fileContent: fakeFileContent(true, true) });

    const descriptor = await provider.openTab(URI.file("docs/a.md"));

    expect(descriptor?.isDirty).toBe(true);
  });
});
