import { URI } from "#contracts";
import { describe, expect, it, vi } from "vitest";
import type { IMarkdownPreviewViewModel } from "../viewmodel/IMarkdownPreviewViewModel";
import { createPreviewTabProvider } from "./previewTabProvider";

const fakePreview = (): IMarkdownPreviewViewModel => ({
  openPreview: vi.fn(),
  previewOf: () => ({ loading: true, markdown: "", truncated: false, failure: null }),
  openActivePreview: () => undefined,
});

describe("마크다운 미리보기 탭 provider", () => {
  it("markdown-preview 스킴만 받는다", async () => {
    const provider = createPreviewTabProvider({ preview: fakePreview() });

    await expect(provider.openTab(URI.file("a.md"))).resolves.toBeUndefined();
  });

  it("받으면 원문 읽기를 시작하고 '미리보기 <이름>'을 제목으로 한다", async () => {
    const preview = fakePreview();
    const provider = createPreviewTabProvider({ preview });

    const descriptor = await provider.openTab(URI.parse("markdown-preview:///docs/a.md"));

    expect(preview.openPreview).toHaveBeenCalledExactlyOnceWith("docs/a.md");
    expect(descriptor?.title).toBe("미리보기 a.md");
    expect(descriptor?.isDirty).toBe(false);
  });
});
