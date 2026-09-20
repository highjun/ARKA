import type { Container } from "#core/di";
import type { ExtensionModule } from "#core/extensions";
import { ContainerProvider } from "#core/viewmodel";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IWorkspaceFiles } from "../extensions/filesystem";
import { MockWorkspaceFiles } from "../extensions/filesystem/model/MockWorkspaceFiles";
import { RootView } from "./view/RootView";
import { createApplication } from "./registerServices";

describe("registerServices", () => {
  const containers: Container[] = [];
  const track = (container: Container): Container => {
    containers.push(container);
    return container;
  };

  afterEach(() => {
    for (const container of containers.splice(0)) container.dispose();
    localStorage.clear();
  });

  const mocks = (workspaceFiles: IWorkspaceFiles): ExtensionModule => ({
    id: "test.mocks",
    provides: [{ id: "arka.filesystem.workspaceFiles", lifetime: "singleton", create: () => workspaceFiles }],
  });

  const mountWith = (workspaceFiles: IWorkspaceFiles) => {
    const container = track(createApplication([mocks(workspaceFiles)]));
    render(
      <ContainerProvider container={container}>
        <RootView />
      </ContainerProvider>,
    );
    return container;
  };

  it("셸에 탐색기 활동이 있다", () => {
    mountWith(new MockWorkspaceFiles({ projects: null }));

    expect(screen.getByLabelText("탐색기")).toBeDefined();
  });

  it("워크스페이스 트리가 사이드바까지 연결된다", async () => {
    mountWith(new MockWorkspaceFiles({ projects: null }));

    expect(await screen.findByText("projects")).toBeDefined();
  });

  describe("저장 안 된 변경 보호", () => {
    const mountWithOpenFile = async () => {
      const container = mountWith(new MockWorkspaceFiles({ "a.md": "원본" }));

      fireEvent.click(await screen.findByText("a.md"));
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

  describe("렌더 오류 보호", () => {
    it("탭이 렌더 중 던지면 CrashScreen이 뜨고 IErrorLog에 남는다", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const container = track(createApplication([mocks(new MockWorkspaceFiles({ "a.md": "" }))]));
      container.resolve("arka.workbench.tabSystem").add({
        id: "test.crashing",
        priority: 1000,
        openTab: () =>
          Promise.resolve({
            icon: null,
            title: "터지는 탭",
            isDirty: false,
            Content: () => {
              throw new Error("탭이 터졌다");
            },
          }),
      });
      render(
        <ContainerProvider container={container}>
          <RootView />
        </ContainerProvider>,
      );

      fireEvent.click(await screen.findByText("a.md"));

      expect(await screen.findByRole("alert")).toHaveTextContent("탭이 터졌다");
      expect(
        container.resolve("arka.workbench.errorLog").entries.map((entry) => [entry.source, entry.message]),
      ).toEqual([["render", "탭이 터졌다"]]);
      consoleError.mockRestore();
    });
  });

  describe("커맨드와 단축키", () => {
    it("키보드 단축키 커맨드가 목록 탭을 연다", async () => {
      mountWith(new MockWorkspaceFiles({}));
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      fireEvent.click(await screen.findByText("키보드 단축키 보기"));
      expect(await screen.findByRole("tab", { name: /키보드 단축키/u })).toBeDefined();
      expect(screen.getByText("shell.openCommandPalette")).toBeDefined();
    });
  });

  describe("설정 배선", () => {
    it("설정 탭에서 밀도를 바꾸면 html의 data-density가 따라온다", async () => {
      mountWith(new MockWorkspaceFiles({}));
      fireEvent.keyDown(window, { key: ",", ctrlKey: true });
      expect(await screen.findByRole("tab", { name: /설정/u })).toBeDefined();
      expect(document.documentElement.dataset["density"]).toBe("compact");
      fireEvent.click(screen.getByLabelText("touch"));
      expect(document.documentElement.dataset["density"]).toBe("touch");
      expect(localStorage.getItem("workbench.settings")).toContain("touch");
    });
  });

  describe("부팅", () => {
    it("셸 모듈과 확장이 기여 지점을 채운다 — 사이드바 하나, 탭 provider 셋, 밀도 설정, 명령", () => {
      const container = track(createApplication([mocks(new MockWorkspaceFiles({}))]));

      expect(
        container
          .resolve("arka.workbench.sidebar")
          .list()
          .map((sidebar) => sidebar.id),
      ).toEqual(["explorer"]);
      expect(
        container
          .resolve("arka.workbench.tabSystem")
          .list()
          .map((provider) => provider.id)
          .sort(),
      ).toEqual(["arka.filesystem.text", "arka.workbench.keybindings", "arka.workbench.settings"]);
      expect(
        container
          .resolve("arka.settings")
          .schema.list()
          .map((setting) => setting.id),
      ).toEqual(["workbench.density"]);
      const commands = container.resolve("arka.commands");
      for (const id of ["arka.workbench.open", "arka.filesystem.focus"])
        expect(commands.actions.tryGet(id), id).toBeDefined();
    });

    it("켜지 못한 확장은 알림으로 남고 나머지는 켜진다", () => {
      const broken: ExtensionModule = {
        id: "test.broken",
        activate: () => {
          throw new Error("고장");
        },
      };
      const container = track(createApplication([mocks(new MockWorkspaceFiles({})), broken]));

      expect(container.resolve("arka.workbench.notifications").items.map((item) => item.message)).toEqual([
        "확장 test.broken을(를) 켜지 못했다(activate) — 고장",
      ]);
      expect(container.resolve("arka.workbench.sidebar").list()).toHaveLength(1);
    });
  });
});
