import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "#utils/axe";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { Shell } from "./Shell";
import { Menu } from "#component/Menu";

const SIDEBARS = [{ id: "a", iconId: "files" as const, title: "탐색기", isActive: true }];
const BOTTOMS = [
  { id: "terminal", iconId: "bell" as const, title: "터미널", isActive: true },
  { id: "problems", iconId: "warning" as const, title: "문제", isActive: false },
];

describe("Shell", () => {
  it("brand/actions/children 을 렌더한다", () => {
    render(
      <Shell colorMode="light" brand="왼쪽" actions="오른쪽">
        본문
      </Shell>,
    );

    expect(screen.getByText("왼쪽")).toBeInTheDocument();
    expect(screen.getByText("오른쪽")).toBeInTheDocument();
    expect(screen.getByText("본문")).toBeInTheDocument();
  });

  it("sidebars 를 안 주면 사이드바 자체가 없다(토글 버튼도 없다)", () => {
    render(<Shell colorMode="light">본문</Shell>);

    expect(screen.queryByRole("button", { name: "사이드바 열기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "탐색기" })).not.toBeInTheDocument();
  });

  it("sidebars 를 주면 사이드바(활동 레일 포함)가 뜨고, 고르면 onSidebarSelect 가 불린다", () => {
    const onSidebarSelect = vi.fn();
    render(
      <Shell colorMode="light" sidebars={SIDEBARS} onSidebarSelect={onSidebarSelect}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "탐색기" }));

    expect(onSidebarSelect).toHaveBeenCalledWith("a");
    expect(screen.getByRole("button", { name: "사이드바 열기" })).toBeInTheDocument();
  });

  it("레일의 설정 톱니는 onSettingsSelect 로 간다", () => {
    const onSettingsSelect = vi.fn();
    render(
      <Shell colorMode="light" sidebars={SIDEBARS} onSettingsSelect={onSettingsSelect}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "설정" }));

    expect(onSettingsSelect).toHaveBeenCalledOnce();
  });

  it("sidebarContent 가 없으면 좁은 폭으로 렌더된다", () => {
    const { container } = render(
      <Shell colorMode="light" sidebars={SIDEBARS}>
        본문
      </Shell>,
    );

    expect(container.querySelector('[data-component="ShellSidebar"]')).toHaveStyle({
      "--pane-width-custom": "48px",
    } as never);
  });

  it("sidebarContent 가 있으면 넓은 폭으로 렌더된다", () => {
    const { container } = render(
      <Shell colorMode="light" sidebars={SIDEBARS} sidebarContent="패널 내용">
        본문
      </Shell>,
    );

    expect(screen.getByText("패널 내용")).toBeInTheDocument();
    expect(container.querySelector('[data-component="ShellSidebar"]')).toHaveStyle({
      "--pane-width-custom": "348px",
    } as never);
  });

  it("sidebarResizable 이 없으면 고정폭이다(리사이즈 불가)", () => {
    render(
      <Shell colorMode="light" sidebars={SIDEBARS} sidebarContent="패널 내용">
        본문
      </Shell>,
    );

    expect(screen.queryByRole("slider", { name: /splitter/i })).not.toBeInTheDocument();
  });

  it("sidebarResizable 을 주면 드래그로 폭을 조절할 수 있다", () => {
    const { container } = render(
      <Shell colorMode="light" sidebars={SIDEBARS} sidebarContent="패널 내용" sidebarResizable sidebarMinWidth="200px">
        본문
      </Shell>,
    );

    const sidebar = container.querySelector('[data-component="ShellSidebar"]');
    expect(sidebar).toHaveAttribute("data-resizable", "true");
    expect(sidebar).toHaveStyle({ "--pane-min-width": "200px", "--pane-width-custom": "348px" } as never);
    expect(screen.getByRole("slider", { name: /splitter/i })).toBeInTheDocument();
  });

  it("sidebarTitle·sidebarActions 이 둘 다 없으면 패널 머리 행 자체가 없다", () => {
    render(
      <Shell colorMode="light" sidebars={SIDEBARS} sidebarContent="패널 내용">
        본문
      </Shell>,
    );

    expect(screen.queryByText("파일 탐색기")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "새 파일" })).not.toBeInTheDocument();
  });

  it("sidebarTitle 을 주면 패널 위에 제목이 뜬다", () => {
    render(
      <Shell colorMode="light" sidebars={SIDEBARS} sidebarContent="패널 내용" sidebarTitle="파일 탐색기">
        본문
      </Shell>,
    );

    expect(screen.getByText("파일 탐색기")).toBeInTheDocument();
  });

  it("sidebarActions 는 머리의 아이콘 버튼이고, 누르면 그 명령 id 로 onSidebarActionActivate 가 불린다", () => {
    const onSidebarActionActivate = vi.fn();
    render(
      <Shell
        colorMode="light"
        sidebars={SIDEBARS}
        sidebarContent="패널 내용"
        sidebarActions={[{ actionId: "filesystem.newFile", iconId: "file", label: "새 파일" }]}
        onSidebarActionActivate={onSidebarActionActivate}
      >
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "새 파일" }));

    expect(onSidebarActionActivate).toHaveBeenCalledWith("filesystem.newFile");
  });

  it("bottoms 를 주면 아래 창의 탭 띠가 뜨고, 고르면 onBottomSelect 가 불린다", () => {
    const onBottomSelect = vi.fn();
    render(
      <Shell colorMode="light" bottoms={BOTTOMS} bottomContent="터미널 내용" onBottomSelect={onBottomSelect}>
        본문
      </Shell>,
    );

    expect(screen.getByRole("tab", { name: "터미널" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("터미널 내용")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "문제" }));

    expect(onBottomSelect).toHaveBeenCalledWith("problems");
  });

  it("bottoms 가 비면 아래 창 자체가 없다", () => {
    render(
      <Shell colorMode="light" bottoms={[]}>
        본문
      </Shell>,
    );

    expect(document.querySelector('[data-component="ShellBottom"]')).not.toBeInTheDocument();
  });

  it("isNarrow 는 data-narrow 로 실린다", () => {
    render(
      <Shell colorMode="light" isNarrow>
        본문
      </Shell>,
    );

    expect(document.querySelector('[data-component="Shell"]')).toHaveAttribute("data-narrow", "");
  });

  it("사이드바 열기 버튼을 누르면 열린다(비제어)", () => {
    render(
      <Shell colorMode="light" sidebars={SIDEBARS}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 열기" }));

    expect(document.querySelector('[data-state="open"]')).toBeInTheDocument();
  });

  it("닫기 버튼을 누르면 onSidebarOpenChange(false) 가 호출된다", () => {
    const onSidebarOpenChange = vi.fn();
    render(
      <Shell colorMode="light" sidebars={SIDEBARS} sidebarOpen onSidebarOpenChange={onSidebarOpenChange}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 닫기" }));

    expect(onSidebarOpenChange).toHaveBeenCalledWith(false);
  });

  it("overlays 는 SplitPageLayout 밖의 형제로 렌더된다", () => {
    render(
      <Shell colorMode="light" overlays={<span data-testid="overlay">오버레이</span>}>
        본문
      </Shell>,
    );

    const overlay = screen.getByTestId("overlay");
    const layout = document.querySelector('[data-component="SplitPageLayout"]');
    expect(layout).not.toBeNull();
    expect(layout?.contains(overlay)).toBe(false);
  });

  it("overlays 로 넘긴 포탈 기반 컴포넌트가 Shell 의 portalRoot 로 실제로 포탈된다", () => {
    const { container } = render(
      <Shell
        colorMode="light"
        overlays={
          <Menu kind="context" open>
            <Menu.Trigger>트리거</Menu.Trigger>
            <Menu.Content>
              <Menu.Item>항목</Menu.Item>
            </Menu.Content>
          </Menu>
        }
      >
        본문
      </Shell>,
    );

    const menu = screen.getByRole("menu");
    const layout = container.querySelector('[data-component="SplitPageLayout"]');
    const shellRoot = document.querySelector('[data-component="Shell"]');
    expect(layout?.contains(menu)).toBe(false);
    expect(shellRoot?.contains(menu)).toBe(true);
  });

  implementsRef(
    (extra) => (
      <Shell colorMode="light" {...extra}>
        본문
      </Shell>
    ),
    HTMLDivElement,
  );

  implementsDataComponent(
    (extra) => (
      <Shell colorMode="light" {...extra}>
        본문
      </Shell>
    ),
    "Shell",
  );

  implementsClassName((extra) => (
    <Shell colorMode="light" {...extra}>
      본문
    </Shell>
  ));

  implementsNoA11yViolations(() => (
    <Shell
      colorMode="light"
      brand="왼쪽"
      sidebars={SIDEBARS}
      sidebarContent="패널"
      bottoms={BOTTOMS}
      bottomContent="터미널"
    >
      본문
    </Shell>
  ));

  it("axe 접근성 위반이 없다(Portal로 빠져나간 실제 내용까지)", async () => {
    render(
      <Shell colorMode="light" brand="왼쪽" sidebars={SIDEBARS} sidebarContent="패널">
        본문
      </Shell>,
    );

    await expectNoA11yViolations(document.body);
  });
});
