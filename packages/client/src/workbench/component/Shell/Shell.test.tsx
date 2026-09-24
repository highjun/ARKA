import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "#lib/axe";
import { implementsClassName, implementsDataComponent, implementsRef, implementsNoA11yViolations } from "#lib/testing";
import { Shell } from "./Shell";
import { Menu } from "#ui/Menu";

const SIDEBARS = [{ id: "a", iconId: "files" as const, title: "탐색기", isActive: true }];
const BOTTOMS = [
  { id: "terminal", title: "터미널" },
  { id: "problems", title: "문제" },
];

describe("Shell", () => {
  it("제품 이름·빌드 표시·children 을 렌더한다", () => {
    render(
      <Shell colorMode="light" brandName="ARKA" buildTimestamp="2026-09-20 11:18">
        본문
      </Shell>,
    );

    expect(screen.getByText("ARKA")).toBeInTheDocument();
    expect(screen.getByText("2026-09-20 11:18")).toBeInTheDocument();
    expect(screen.getByText("본문")).toBeInTheDocument();
  });

  it("sidebars 를 안 주면 사이드바 자체가 없다(토글 버튼도 없다)", () => {
    render(
      <Shell colorMode="light" brandName="ARKA">
        본문
      </Shell>,
    );

    expect(screen.queryByRole("button", { name: "사이드바 열기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "탐색기" })).not.toBeInTheDocument();
  });

  it("sidebars 를 주면 사이드바(활동 레일 포함)가 뜨고, 고르면 onSidebarSelect 가 불린다", () => {
    const onSidebarSelect = vi.fn();
    render(
      <Shell colorMode="light" brandName="ARKA" sidebars={SIDEBARS} onSidebarSelect={onSidebarSelect}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "탐색기" }));

    expect(onSidebarSelect).toHaveBeenCalledWith("a");
  });

  it("레일의 설정 톱니는 onSettingsSelect 로 간다", () => {
    const onSettingsSelect = vi.fn();
    render(
      <Shell colorMode="light" brandName="ARKA" sidebars={SIDEBARS} onSettingsSelect={onSettingsSelect}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "설정" }));

    expect(onSettingsSelect).toHaveBeenCalledOnce();
  });

  it("활성 사이드바가 없으면 좁은 폭으로 렌더된다", () => {
    const { container } = render(
      <Shell colorMode="light" brandName="ARKA" sidebars={SIDEBARS}>
        본문
      </Shell>,
    );

    expect(container.querySelector('[data-component="ShellSidebar"]')).toHaveStyle({
      "--pane-width-custom": "48px",
    } as never);
  });

  it("활성 사이드바가 있으면 넓은 폭으로 렌더된다", () => {
    const { container } = render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "패널 내용"}
      >
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
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "패널 내용"}
      >
        본문
      </Shell>,
    );

    expect(screen.queryByRole("slider", { name: /splitter/i })).not.toBeInTheDocument();
  });

  it("sidebarResizable 을 주면 드래그로 폭을 조절할 수 있다", () => {
    const { container } = render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "패널 내용"}
        sidebarResizable
        sidebarMinWidth="200px"
      >
        본문
      </Shell>,
    );

    const sidebar = container.querySelector('[data-component="ShellSidebar"]');
    expect(sidebar).toHaveAttribute("data-resizable", "true");
    expect(sidebar).toHaveStyle({ "--pane-min-width": "200px", "--pane-width-custom": "348px" } as never);
    expect(screen.getByRole("slider", { name: /splitter/i })).toBeInTheDocument();
  });

  it("sidebarTitle 이 없으면 패널 머리 행 자체가 없다", () => {
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "패널 내용"}
      >
        본문
      </Shell>,
    );

    expect(screen.queryByText("파일 탐색기")).not.toBeInTheDocument();
  });

  it("sidebarTitle 을 주면 패널 위에 제목이 뜬다", () => {
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "패널 내용"}
        sidebarTitle="파일 탐색기"
      >
        본문
      </Shell>,
    );

    expect(screen.getByText("파일 탐색기")).toBeInTheDocument();
  });

  it("활성 사이드바의 본문만 그린다 — 바꾸면 이전 것은 사라진다", () => {
    const rows = [
      { id: "a", iconId: "files" as const, title: "탐색기" },
      { id: "b", iconId: "search" as const, title: "검색" },
    ];
    const content = (id: string) => `${id} 본문`;
    const { rerender } = render(
      <Shell colorMode="light" brandName="ARKA" sidebars={rows} activeSidebarId="a" renderSidebarContent={content}>
        본문
      </Shell>,
    );
    expect(screen.getByText("a 본문")).toBeInTheDocument();

    rerender(
      <Shell colorMode="light" brandName="ARKA" sidebars={rows} activeSidebarId="b" renderSidebarContent={content}>
        본문
      </Shell>,
    );

    expect(screen.queryByText("a 본문")).toBeNull();
    expect(screen.getByText("b 본문")).toBeInTheDocument();
  });

  it("접으면 패널이 사라지고 레일만 남는다", () => {
    const rows = [{ id: "a", iconId: "files" as const, title: "탐색기" }];
    const content = () => "탐색기 본문";
    const { rerender } = render(
      <Shell colorMode="light" brandName="ARKA" sidebars={rows} activeSidebarId="a" renderSidebarContent={content}>
        본문
      </Shell>,
    );
    expect(document.querySelector('[data-component="Sidebar/Panel"]')).toBeInTheDocument();

    rerender(
      <Shell colorMode="light" brandName="ARKA" sidebars={rows} activeSidebarId={null} renderSidebarContent={content}>
        본문
      </Shell>,
    );

    expect(document.querySelector('[data-component="Sidebar/Panel"]')).toBeNull();
    expect(document.querySelector('[data-component="Sidebar/RailTop"]')).toBeInTheDocument();
  });

  it("bottoms 를 주면 아래 창의 탭 띠가 뜨고, 고르면 onBottomSelect 가 불린다", () => {
    const onBottomSelect = vi.fn();
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        bottoms={BOTTOMS}
        activeBottomId="terminal"
        bottomContent="터미널 내용"
        onBottomSelect={onBottomSelect}
      >
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
      <Shell colorMode="light" brandName="ARKA" bottoms={[]}>
        본문
      </Shell>,
    );

    expect(document.querySelector('[data-component="ShellBottom"]')).not.toBeInTheDocument();
  });

  it("여닫기 콜백을 주면 타이틀바 오른쪽 끝에 버튼 둘이 뜨고, 펼침 여부를 눌린 상태로 알린다", () => {
    const onSidebarToggle = vi.fn();
    const onBottomToggle = vi.fn();
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "탐색기"}
        bottoms={BOTTOMS}
        onSidebarToggle={onSidebarToggle}
        onBottomToggle={onBottomToggle}
      >
        본문
      </Shell>,
    );

    const sidebarToggle = screen.getByRole("button", { name: "사이드바 닫기" });
    const bottomToggle = screen.getByRole("button", { name: "아래 창 열기" });
    expect(sidebarToggle).toHaveAttribute("aria-pressed", "true");
    expect(bottomToggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(sidebarToggle);
    fireEvent.click(bottomToggle);

    expect(onSidebarToggle).toHaveBeenCalledOnce();
    expect(onBottomToggle).toHaveBeenCalledOnce();
  });

  it("좁은 화면에서 사이드바 단추는 드로어를 여닫는다 — 접기가 아니다", () => {
    const onSidebarToggle = vi.fn();
    const onSidebarOpenChange = vi.fn();
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        isNarrow
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "탐색기"}
        onSidebarToggle={onSidebarToggle}
        onSidebarOpenChange={onSidebarOpenChange}
      >
        본문
      </Shell>,
    );

    expect(screen.queryByRole("button", { name: "사이드바 닫기" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "사이드바 열기" }));

    expect(onSidebarOpenChange).toHaveBeenCalledWith(true);
    expect(onSidebarToggle).not.toHaveBeenCalled();
  });

  it("넓은 화면에서 같은 단추는 패널을 접고 편다 — 드로어는 건드리지 않는다", () => {
    const onSidebarToggle = vi.fn();
    const onSidebarOpenChange = vi.fn();
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "탐색기"}
        onSidebarToggle={onSidebarToggle}
        onSidebarOpenChange={onSidebarOpenChange}
      >
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 닫기" }));

    expect(onSidebarToggle).toHaveBeenCalledOnce();
    expect(onSidebarOpenChange).not.toHaveBeenCalled();
  });

  it("아래 창 탭이 없으면 아래 창 버튼도 없다 — 열 것이 없다", () => {
    render(
      <Shell colorMode="light" brandName="ARKA" sidebars={SIDEBARS} onSidebarToggle={vi.fn()} onBottomToggle={vi.fn()}>
        본문
      </Shell>,
    );

    expect(screen.getByRole("button", { name: "사이드바 열기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "아래 창 열기" })).not.toBeInTheDocument();
  });

  it("여닫기 콜백을 안 주면 그 버튼도 없다", () => {
    render(
      <Shell colorMode="light" brandName="ARKA" sidebars={SIDEBARS} bottoms={BOTTOMS}>
        본문
      </Shell>,
    );

    expect(screen.queryByRole("button", { name: "사이드바 열기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "아래 창 열기" })).not.toBeInTheDocument();
  });

  it("isNarrow 는 data-narrow 로 실린다", () => {
    render(
      <Shell colorMode="light" brandName="ARKA" isNarrow>
        본문
      </Shell>,
    );

    expect(document.querySelector('[data-component="Shell"]')).toHaveAttribute("data-narrow", "");
  });

  it("좁은 화면에서 사이드바 열기 버튼을 누르면 열린다(비제어)", () => {
    render(
      <Shell colorMode="light" brandName="ARKA" isNarrow sidebars={SIDEBARS}>
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 열기" }));

    expect(document.querySelector('[data-state="open"]')).toBeInTheDocument();
  });

  it("좁은 화면에서 닫기 버튼을 누르면 onSidebarOpenChange(false) 가 호출된다 — 레일까지 같이 닫힌다", () => {
    const onSidebarOpenChange = vi.fn();
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        isNarrow
        sidebars={SIDEBARS}
        sidebarOpen
        onSidebarOpenChange={onSidebarOpenChange}
      >
        본문
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 닫기" }));

    expect(onSidebarOpenChange).toHaveBeenCalledWith(false);
  });

  it("overlays 는 SplitPageLayout 밖의 형제로 렌더된다", () => {
    render(
      <Shell colorMode="light" brandName="ARKA" overlays={<span data-testid="overlay">오버레이</span>}>
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
        brandName="ARKA"
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
      <Shell colorMode="light" brandName="ARKA" {...extra}>
        본문
      </Shell>
    ),
    HTMLDivElement,
  );

  implementsDataComponent(
    (extra) => (
      <Shell colorMode="light" brandName="ARKA" {...extra}>
        본문
      </Shell>
    ),
    "Shell",
  );

  implementsClassName((extra) => (
    <Shell colorMode="light" brandName="ARKA" {...extra}>
      본문
    </Shell>
  ));

  implementsNoA11yViolations(() => (
    <Shell
      colorMode="light"
      brandName="ARKA"
      sidebars={SIDEBARS}
      activeSidebarId="a"
      renderSidebarContent={() => "패널"}
      bottoms={BOTTOMS}
      bottomContent="터미널"
    >
      본문
    </Shell>
  ));

  it("axe 접근성 위반이 없다(Portal로 빠져나간 실제 내용까지)", async () => {
    render(
      <Shell
        colorMode="light"
        brandName="ARKA"
        sidebars={SIDEBARS}
        activeSidebarId="a"
        renderSidebarContent={() => "패널"}
      >
        본문
      </Shell>,
    );

    await expectNoA11yViolations(document.body);
  });
});
