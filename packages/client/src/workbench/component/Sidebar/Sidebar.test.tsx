import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#lib/testing";
import { Sidebar } from "./index";
import type { SidebarItem } from "./index";

const TOP: SidebarItem[] = [
  { id: "explorer", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
];

const BOTTOM: SidebarItem[] = [{ id: "settings", iconId: "settingsGear", title: "설정" }];

const sidebar = (extra: Record<string, unknown> = {}) => (
  <Sidebar {...extra}>
    <Sidebar.RailTop items={TOP} activeId="explorer" />
    <Sidebar.RailBottom items={BOTTOM} />
    <Sidebar.Panel title="탐색기" body="탐색기 본문" />
  </Sidebar>
);

describe("Sidebar", () => {
  it("레일과 패널이 한 자리에 함께 선다", () => {
    const { container } = render(sidebar());

    expect(container.querySelector('[data-component="Sidebar/RailTop"]')).toBeInTheDocument();
    expect(container.querySelector('[data-component="Sidebar/RailBottom"]')).toBeInTheDocument();
    expect(container.querySelector('[data-component="Sidebar/Panel"]')).toBeInTheDocument();
  });

  it("패널 없이 레일만 세울 수 있다 — 접힌 사이드바다", () => {
    const { container } = render(
      <Sidebar>
        <Sidebar.RailTop items={TOP} activeId="explorer" />
      </Sidebar>,
    );

    expect(container.querySelector('[data-component="Sidebar/RailTop"]')).toBeInTheDocument();
    expect(container.querySelector('[data-component="Sidebar/Panel"]')).toBeNull();
  });

  implementsDataComponent((extra) => sidebar(extra), "Sidebar");
  implementsClassName((extra) => sidebar(extra));
  implementsRef((extra) => sidebar(extra), HTMLDivElement);
  implementsNoA11yViolations(() => sidebar());
});

describe("Sidebar.RailTop", () => {
  it("이름표를 안 주면 `활동 막대`로 읽힌다 — 주면 그것을 쓴다", () => {
    const { rerender } = render(<Sidebar.RailTop items={TOP} />);
    expect(screen.getByRole("navigation", { name: "활동 막대" })).toBeInTheDocument();

    rerender(<Sidebar.RailTop items={TOP} aria-label="왼쪽 막대" />);

    expect(screen.getByRole("navigation", { name: "왼쪽 막대" })).toBeInTheDocument();
  });

  it("누르면 onItemClick 이 그 id 로 불린다", () => {
    const onItemClick = vi.fn();
    render(<Sidebar.RailTop items={TOP} onItemClick={onItemClick} />);

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onItemClick).toHaveBeenCalledWith("search");
  });

  it("눌린 것은 최대 하나다 — activeId 하나가 정하고 aria-pressed 로 드러난다", () => {
    render(<Sidebar.RailTop items={TOP} activeId="explorer" />);

    expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
  });

  it("목록에 없는 activeId 면 아무것도 안 눌린다", () => {
    render(<Sidebar.RailTop items={TOP} activeId="없는활동" />);

    for (const item of TOP) {
      expect(screen.getByRole("button", { name: item.title })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("비제어면 제가 들고 있는다 — 누르면 눌리고, 같은 것을 다시 누르면 접힌다", () => {
    render(<Sidebar.RailTop items={TOP} />);
    const search = screen.getByRole("button", { name: "검색" });
    expect(search).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(search);
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
  });

  it("비제어는 defaultActiveId 에서 시작한다", () => {
    render(<Sidebar.RailTop items={TOP} defaultActiveId="search" />);

    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "true");
  });

  it("제어면 activeId 만 따른다 — 눌러도 제멋대로 안 바뀐다", () => {
    const onItemClick = vi.fn();
    render(<Sidebar.RailTop items={TOP} activeId="explorer" onItemClick={onItemClick} />);

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onItemClick).toHaveBeenCalledWith("search");
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
  });

  implementsClassName((extra) => <Sidebar.RailTop items={TOP} {...extra} />);
  implementsDataComponent((extra) => <Sidebar.RailTop items={TOP} {...extra} />, "Sidebar/RailTop");
  implementsRef((extra) => <Sidebar.RailTop items={TOP} {...extra} />, HTMLElement);
});

describe("Sidebar.RailBottom", () => {
  it("눌린 상태가 없다 — aria-pressed 를 아예 안 단다", () => {
    render(
      <Sidebar>
        <Sidebar.RailTop items={TOP} activeId="settings" />
        <Sidebar.RailBottom items={BOTTOM} />
      </Sidebar>,
    );

    expect(screen.getByRole("button", { name: "설정" })).not.toHaveAttribute("aria-pressed");
  });

  it("제 onItemClick 으로 간다 — 위와 통로가 따로다", () => {
    const onTop = vi.fn();
    const onBottom = vi.fn();
    render(
      <Sidebar>
        <Sidebar.RailTop items={TOP} onItemClick={onTop} />
        <Sidebar.RailBottom items={BOTTOM} onItemClick={onBottom} />
      </Sidebar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "설정" }));

    expect(onBottom).toHaveBeenCalledWith("settings");
    expect(onTop).not.toHaveBeenCalled();
  });

  it("아래 묶음을 안 넣으면 그 자리도 안 잡는다", () => {
    render(
      <Sidebar>
        <Sidebar.RailTop items={TOP} />
      </Sidebar>,
    );

    expect(screen.queryByRole("button", { name: "설정" })).toBeNull();
  });

  implementsClassName((extra) => <Sidebar.RailBottom items={BOTTOM} {...extra} />);
  implementsDataComponent((extra) => <Sidebar.RailBottom items={BOTTOM} {...extra} />, "Sidebar/RailBottom");
  implementsRef((extra) => <Sidebar.RailBottom items={BOTTOM} {...extra} />, HTMLDivElement);
});

describe("Sidebar.Panel", () => {
  it("title 을 주면 제목 줄이 뜨고, body 가 그 아래에 선다", () => {
    render(<Sidebar.Panel title="탐색기" body="탐색기 본문" />);

    expect(screen.getByText("탐색기")).toBeInTheDocument();
    expect(screen.getByText("탐색기 본문")).toBeInTheDocument();
  });

  it("title 이 없으면 제목 줄 자체가 없다 — 본문이 위까지 올라온다", () => {
    const { container } = render(<Sidebar.Panel body="탐색기 본문" />);

    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByText("탐색기 본문")).toBeInTheDocument();
  });

  it("body 가 바뀌면 그것만 그린다 — 지킬 상태는 ViewModel 이 들고 있다", () => {
    const { rerender } = render(<Sidebar.Panel title="탐색기" body="탐색기 본문" />);

    rerender(<Sidebar.Panel title="검색" body="검색 본문" />);

    expect(screen.queryByText("탐색기 본문")).toBeNull();
    expect(screen.getByText("검색 본문")).toBeInTheDocument();
  });

  implementsClassName((extra) => <Sidebar.Panel {...extra} />);
  implementsDataComponent((extra) => <Sidebar.Panel {...extra} />, "Sidebar/Panel");
  implementsRef((extra) => <Sidebar.Panel {...extra} />, HTMLDivElement);
});
