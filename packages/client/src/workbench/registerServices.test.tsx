import { ViewModelProvider } from "#core/viewmodel";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IWorkspaceFiles } from "../extensions/filesystem";
import { MockWorkspaceFiles } from "../extensions/filesystem/model/MockWorkspaceFiles";
import { MockSearchService } from "../extensions/search/model/MockSearchService";
import { TabContentRegistry } from "./model/TabContentRegistry";
import { RootView } from "./view/RootView";
import { createApplication } from "./registerServices";

/**
 * 조립이 실제로 맞물리는지만 본다 — 화면의 내용은 각 컴포넌트가, 계층의 규칙은 각 계층의
 * unit test가 이미 본다. 여기서 걸리는 것은 **배선이 틀린 경우**뿐이다.
 *
 * `<RootView />`를 마운트한다 — main.tsx가 그리는 것과 같은 트리다. beforeunload 가드·전역
 * 키다운·오류 핸들러 등 앱 전체 배선이 `infra/`의 기여들에 있다.
 *
 * 파일시스템 구현만 `MockWorkspaceFiles`로 대신한다. 진짜 구현을 그대로 두면 이 테스트가 서버를
 * 요구하게 된다. Mock이 실물처럼 구는 것은 `workspaceFiles.contract.ts`가 보증한다.
 */

/**
 * `createApplication()`이 실제 저장소(→ `localStorage`)를 쓴다 — 매 테스트가 새 컨테이너를
 * 만들어도 jsdom의 `localStorage`는 파일 전체가 공유한다. 안 지우면 앞 테스트가 연 탭이
 * 다음 테스트에서 부팅 시 복원돼 같은 텍스트가 사이드바와 탭 양쪽에 뜬다.
 */

describe("registerServices", () => {
  afterEach(() => {
    localStorage.clear();
  });

  const mountWith = (workspaceFiles: IWorkspaceFiles) => {
    const container = createApplication().createChild("test");
    // 자식 스코프에 다시 등록해 그 스코프 안에서만 부모를 가린다.
    container.register("arka.filesystem.workspaceFiles", "singleton", () => workspaceFiles);
    container.register("arka.search.service", "singleton", () => new MockSearchService({ "a.md": "원본" }));
    render(
      <ViewModelProvider container={container}>
        <RootView />
      </ViewModelProvider>,
    );
    return container;
  };

  it("셸에 탐색기 활동이 있다", () => {
    mountWith(new MockWorkspaceFiles({ projects: null }));

    expect(screen.getByLabelText("탐색기")).toBeDefined();
  });

  /**
   * jsdom은 CSS를 적용하지 않으므로 트리가 화면 밖으로 밀려 있어도 여기서는 통과한다 —
   * 보이는지가 아니라 **배선이 닿는지**만 보는 테스트다.
   */
  it("워크스페이스 트리가 사이드바까지 연결된다", async () => {
    mountWith(new MockWorkspaceFiles({ projects: null }));

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
      const container = mountWith(new MockWorkspaceFiles({ "a.md": "원본" }));

      // 탐색기는 이미 기본 활동이다 — 다시 누르면 "같은 것을 또 골랐다"로 읽어 오히려 닫는다.
      fireEvent.click(await screen.findByText("a.md"));
      // 저장 버튼은 readOnly가 풀렸을 때만 뜬다 — 즉 파일이 다 읽혔다는 신호다. 그전에
      // editFile을 부르면 Model이 조용히 무시한다.
      await screen.findByRole("button", { name: "저장" });

      return container.resolve("arka.filesystem.fileContentViewModel");
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

  /**
   * 화면이 죽어도 아무도 모르는 상태를 막는 배선이 실제로 닿는지 본다 — 탭 하나가 렌더 중 던지면
   * 빈 화면 대신 `CrashScreen`이 뜨고, `IErrorLog`에 기록이 남아야 한다.
   */
  describe("렌더 오류 보호", () => {
    it("탭이 렌더 중 던지면 CrashScreen이 뜨고 IErrorLog에 남는다", async () => {
      // React가 잡힌 오류를 console.error로도 내보낸다 — 테스트 출력이 그걸로 덮이지 않게 막는다.
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const container = createApplication().createChild("test");
      container.register("arka.filesystem.workspaceFiles", "singleton", () => new MockWorkspaceFiles({ "a.md": "" }));
      // 파일 탭을 그리는 컴포넌트를 터지는 것으로 바꾼다 — 자식 스코프에 다시 등록해 부모를 가린다.
      container.register("arka.workbench.tabContentRegistry", "singleton", () => {
        const registry = new TabContentRegistry();
        registry.add({
          id: "file",
          iconId: "file",
          TabComponent: () => {
            throw new Error("탭이 터졌다");
          },
        });
        return registry;
      });
      render(
        <ViewModelProvider container={container}>
          <RootView />
        </ViewModelProvider>,
      );

      fireEvent.click(await screen.findByText("a.md"));

      expect(await screen.findByRole("alert")).toHaveTextContent("탭이 터졌다");
      expect(
        container.resolve("arka.workbench.errorLog").entries.map((entry) => [entry.source, entry.message]),
      ).toEqual([["render", "탭이 터졌다"]]);
      consoleError.mockRestore();
    });
  });

  describe("검색 배선", () => {
    it("검색 활동에서 찾은 결과를 누르면 파일 탭이 열린다", async () => {
      mountWith(new MockWorkspaceFiles({ "a.md": "원본" }));
      fireEvent.click(screen.getByLabelText("검색"));
      await act(async () => {
        fireEvent.change(await screen.findByLabelText("검색어"), { target: { value: "원본" } });
      });
      fireEvent.click(await screen.findByText("원본", { selector: "span" }));
      expect(await screen.findByRole("tab", { name: /a\.md/u })).toBeDefined();
    });
  });

  describe("커맨드와 단축키", () => {
    it("Ctrl+Shift+F가 검색 활동을 열고, 팔레트에 단축키가 보인다", async () => {
      mountWith(new MockWorkspaceFiles({}));
      fireEvent.keyDown(window, { key: "F", ctrlKey: true, shiftKey: true });
      expect(await screen.findByLabelText("검색어")).toBeDefined();

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const item = await screen.findByText("검색 보기");
      expect(item.closest("[cmdk-item]")?.textContent).toContain("Shift");
    });

    it("키보드 단축키 커맨드가 목록 탭을 연다", async () => {
      mountWith(new MockWorkspaceFiles({}));
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      fireEvent.click(await screen.findByText("키보드 단축키 보기"));
      expect(await screen.findByRole("tab", { name: /키보드 단축키/u })).toBeDefined();
      expect(screen.getByText("shell.openCommandPalette")).toBeDefined();
    });
  });

  describe("마크다운 미리보기 배선", () => {
    it("파일을 열고 Ctrl+Shift+V를 누르면 미리보기 탭이 렌더된 제목을 보여 준다", async () => {
      mountWith(new MockWorkspaceFiles({ "a.md": "# 안녕 세상" }));
      fireEvent.click(await screen.findByText("a.md"));
      await screen.findByRole("button", { name: "저장" });
      fireEvent.keyDown(window, { key: "V", ctrlKey: true, shiftKey: true });
      expect(await screen.findByRole("tab", { name: /미리보기 a\.md/u })).toBeDefined();
      expect(await screen.findByRole("heading", { level: 1, name: "안녕 세상" })).toBeDefined();
    });
  });

  describe("설정 배선", () => {
    it("설정 탭에서 밀도를 바꾸면 html의 data-density가 따라온다", async () => {
      mountWith(new MockWorkspaceFiles({}));
      fireEvent.keyDown(window, { key: ",", ctrlKey: true });
      expect(await screen.findByRole("tab", { name: /설정/u })).toBeDefined();
      expect(document.documentElement.dataset["density"]).toBe("compact");
      fireEvent.click(screen.getByLabelText(/^넓게/u));
      expect(document.documentElement.dataset["density"]).toBe("touch");
      expect(localStorage.getItem("workbench.settings")).toContain("touch");
    });
  });
});
