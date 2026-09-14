import { describe, expect, it } from "vitest";
import { testMarkdownSourceContract } from "../model/markdownSource.contract";
import { createWorkspaceMarkdownSource } from "./WorkspaceMarkdownSource";
import type { MarkdownDirectoryWatcher, MarkdownFileReader } from "./WorkspaceMarkdownSource";

/**
 * 의존이 구조 타입이라 `filesystem`의 Mock을 쓰지 않고 여기서 세운다 — 슬라이스끼리는 import하지
 * 않는다(→ ADR 0007). 이 스텁이 워크스페이스 포트의 자리다.
 */
const stubs = (files: Readonly<Record<string, string>>, binary: readonly string[] = []) => {
  const contents = new Map(Object.entries(files));
  const subscriptions = new Set<{ paths: readonly string[]; onChange: (changed: readonly string[]) => void }>();
  const reader: MarkdownFileReader = {
    read: (path) => {
      const content = contents.get(path);
      if (content === undefined) return Promise.reject(new Error(`no such file: ${path}`));
      return Promise.resolve({ content, encoding: binary.includes(path) ? "binary" : "utf8", truncated: false });
    },
  };
  const watcher: MarkdownDirectoryWatcher = {
    watch: (paths, onChange) => {
      const subscription = { paths, onChange };
      subscriptions.add(subscription);
      return () => {
        subscriptions.delete(subscription);
      };
    },
  };
  const emit = (dir: string) => {
    for (const subscription of [...subscriptions]) if (subscription.paths.includes(dir)) subscription.onChange([dir]);
  };
  const watchedPaths = () => [...subscriptions].flatMap((subscription) => subscription.paths);
  return { reader, watcher, contents, emit, watchedPaths };
};

testMarkdownSourceContract("WorkspaceMarkdownSource", (files) => {
  const { reader, watcher, contents, emit } = stubs(files);
  return {
    source: createWorkspaceMarkdownSource({ files: reader, watch: watcher }),
    write: (path, content) => {
      contents.set(path, content);
      emit(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
    },
  };
});

describe("WorkspaceMarkdownSource", () => {
  it("바이너리는 던진다 — 미리보기가 그릴 수 있는 것이 아니다", async () => {
    const { reader, watcher } = stubs({ "logo.png": "not text" }, ["logo.png"]);
    await expect(createWorkspaceMarkdownSource({ files: reader, watch: watcher }).read("logo.png")).rejects.toThrow(
      "텍스트 파일이 아니다.",
    );
  });

  it("파일이 아니라 부모 디렉터리를 감시한다 — 저장이 rename이면 파일 감시가 교체를 놓친다", () => {
    const { reader, watcher, watchedPaths } = stubs({ "docs/a.md": "" });
    createWorkspaceMarkdownSource({ files: reader, watch: watcher }).watch("docs/a.md", () => undefined);
    expect(watchedPaths()).toEqual(["docs"]);
  });

  it("루트 파일이면 빈 문자열(워크스페이스 루트)을 감시한다", () => {
    const { reader, watcher, watchedPaths } = stubs({ "a.md": "" });
    createWorkspaceMarkdownSource({ files: reader, watch: watcher }).watch("a.md", () => undefined);
    expect(watchedPaths()).toEqual([""]);
  });
});
