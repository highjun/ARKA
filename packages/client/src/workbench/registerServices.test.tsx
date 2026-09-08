import { ViewModelProvider } from "#core/view-model";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FileContentViewModelToken, WorkspaceFilesToken } from "../extensions/filesystem";
import type { IWorkspaceFiles } from "../extensions/filesystem";
import { ShellView } from "./view/ShellView";
import { createApplication } from "./registerServices";

/**
 * 조립이 실제로 맞물리는지만 본다 — 화면의 내용은 각 컴포넌트가, 계층의 규칙은 각 계층의
 * unit test가 이미 본다. 여기서 걸리는 것은 **배선이 틀린 경우**뿐이다.
 *
 * `<ShellView />`을 마운트한다(`<ShellView />`가 아니다) — beforeunload 가드·전역 키다운 등 앱
 * 전체 배선이 `infra/`의 기여들에 있다.
 *
 * 파일시스템 구현만 대신한다. 진짜 구현을 그대로 두면 이 테스트가 서버를 요구하게 된다.
 */
const listing = { path: "", parent: null, entries: [{ name: "projects", type: "dir" as const }] };

/**
 * `createApplication()`이 실제 저장소(→ `localStorage`)를 쓴다 — 매 테스트가 새 컨테이너를
 * 만들어도 jsdom의 `localStorage`는 파일 전체가 공유한다. 안 지우면 앞 테스트가 연 탭이
 * 다음 테스트에서 부팅 시 복원돼 같은 텍스트가 사이드바와 탭 양쪽에 뜬다.
 */
afterEach(() => {
  localStorage.clear();
});

const mountWith = (workspaceFiles: Partial<IWorkspaceFiles>) => {
  const container = createApplication().createScope("test");
  // 자식 스코프에 다시 등록해 그 스코프 안에서만 부모를 가린다.
  container.register(WorkspaceFilesToken, {
    lifetime: "singleton",
    create: () => workspaceFiles as IWorkspaceFiles,
  });
  render(
    <ViewModelProvider container={container}>
      <ShellView />
    </ViewModelProvider>,
  );
  return container;
};

it("셸에 탐색기 활동이 있다", () => {
  mountWith({
    list: () => Promise.resolve(listing),
    read: () =>
      Promise.resolve({ path: "", content: "", truncated: false, encoding: "utf8" as const }),
  });

  expect(screen.getByLabelText("탐색기")).toBeDefined();
});

/**
 * jsdom은 CSS를 적용하지 않으므로 트리가 화면 밖으로 밀려 있어도 여기서는 통과한다 —
 * 보이는지가 아니라 **배선이 닿는지**만 보는 테스트다.
 */
it("워크스페이스 트리가 사이드바까지 연결된다", async () => {
  mountWith({
    list: () => Promise.resolve(listing),
    read: () =>
      Promise.resolve({ path: "", content: "", truncated: false, encoding: "utf8" as const }),
  });

  expect(await screen.findByText("projects")).toBeDefined();
});

/**
 * **저장 안 된 변경이 Shell까지 실제로 닿는지**를 본다 — `ShellView`가 `fileContentViewModel`을
 * `FileContentView`와 같은 컨테이너에서 꺼내는지가 이 배선의 전부다. 하나라도 다른 컨테이너를
 * 가리키면 dirty가 조용히 `false`로 굳는다.
 *
 * `editFile`을 직접 부르는 것은 CodeMirror 타이핑을 jsdom이 흉내내지 못해서다.
 */
describe("저장 안 된 변경 보호", () => {
  const mountWithOpenFile = async () => {
    const container = mountWith({
      list: () =>
        Promise.resolve({
          path: "",
          parent: null,
          entries: [{ name: "a.md", type: "file" as const }],
        }),
      read: () =>
        Promise.resolve({
          path: "a.md",
          content: "원본",
          truncated: false,
          encoding: "utf8" as const,
        }),
      write: () => Promise.resolve(),
    });

    // 탐색기는 이미 기본 활동이다 — 다시 누르면 "같은 것을 또 골랐다"로 읽어 오히려 닫는다.
    fireEvent.click(await screen.findByText("a.md"));
    // 저장 버튼은 readOnly가 풀렸을 때만 뜬다 — 즉 파일이 다 읽혔다는 신호다. 그전에
    // editFile을 부르면 Model이 조용히 무시한다.
    await screen.findByRole("button", { name: "저장" });

    return container.resolve(FileContentViewModelToken);
  };

  it("탭에 저장 안 됨 표시가 뜬다", async () => {
    const fileContentViewModel = await mountWithOpenFile();
    const tab = screen.getByRole("tab", { name: /a\.md/u });

    expect(tab.hasAttribute("data-dirty")).toBe(false);
    act(() => fileContentViewModel.editFile("a.md", "고친 내용"));

    expect(tab.hasAttribute("data-dirty")).toBe(true);
  });

  it("닫으려 하면 확인을 구하고, 취소하면 탭이 남는다", async () => {
    const fileContentViewModel = await mountWithOpenFile();
    act(() => fileContentViewModel.editFile("a.md", "고친 내용"));

    fireEvent.click(screen.getByRole("button", { name: "a.md 닫기" }));
    expect(await screen.findByText("저장하지 않은 변경사항이 있다")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getByRole("tab", { name: /a\.md/u })).toBeDefined();
  });

  it("확인하면 실제로 닫힌다", async () => {
    const fileContentViewModel = await mountWithOpenFile();
    act(() => fileContentViewModel.editFile("a.md", "고친 내용"));

    fireEvent.click(screen.getByRole("button", { name: "a.md 닫기" }));
    fireEvent.click(await screen.findByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("tab", { name: /a\.md/u })).toBeNull();
  });

  it("저장 안 된 파일이 있으면 beforeunload를 막는다", async () => {
    const fileContentViewModel = await mountWithOpenFile();
    act(() => fileContentViewModel.editFile("a.md", "고친 내용"));

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("저장 안 된 것이 없으면 beforeunload를 막지 않는다", async () => {
    await mountWithOpenFile();

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
