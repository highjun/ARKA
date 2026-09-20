import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "#utils/axe";
import { implementsClassName, implementsDataComponent, implementsRef } from "#utils/testing";
import { Icon } from "#component/Icon";
import { Tab } from "./Tab";
import type { PaneRowLeaf, PaneRowSplit, TabRow } from "./Tab";

const row = (id: string, title: string, extra: Partial<TabRow> = {}): TabRow => ({
  id,
  kind: "file",
  title,
  icon: <Icon iconId="file" size="sm" />,
  Content: () => <span>{title} content</span>,
  isPreview: false,
  isDirty: false,
  ...extra,
});

const ROWS: TabRow[] = [row("a", "A"), row("b", "B")];

describe("Tab", () => {
  it("tree 를 생략하면 Group 으로 렌더링하고 활성 탭의 Content 를 그린다", () => {
    render(<Tab tabs={ROWS} activeTabId="a" />);

    expect(screen.getByRole("tab", { name: /A/ })).toBeInTheDocument();
    expect(screen.getByText("A content")).toBeInTheDocument();
    expect(screen.queryByText("B content")).not.toBeInTheDocument();
  });

  it("content 를 주면 탭의 Content 대신 그것을 그린다", () => {
    render(<Tab tabs={ROWS} activeTabId="a" content="직접 준 내용" />);

    expect(screen.getByText("직접 준 내용")).toBeInTheDocument();
    expect(screen.queryByText("A content")).not.toBeInTheDocument();
  });

  it("탭이 0개면 Strip을 렌더하지 않고 emptyMessage 만 그린다", () => {
    render(<Tab tabs={[]} activeTabId={null} emptyMessage="탐색기에서 파일을 고르세요." />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("탐색기에서 파일을 고르세요.")).toBeInTheDocument();
  });

  it("activeTabId 가 목록에 없으면 첫 탭이 활성이다", () => {
    render(<Tab tabs={ROWS} activeTabId={null} />);

    expect(screen.getByRole("tab", { name: /A/ })).toHaveAttribute("aria-selected", "true");
  });

  it("탭을 클릭하면 onSelect 가 그 id 로 불리고, 강조는 activeTabId 를 따른다", () => {
    const onSelect = vi.fn();
    render(<Tab tabs={ROWS} activeTabId="a" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("tab", { name: /B/ }));

    expect(onSelect).toHaveBeenCalledWith("b");
    expect(screen.getByRole("tab", { name: /A/ })).toHaveAttribute("aria-selected", "true");
  });

  it("tree 를 주면 Split 으로 렌더링하고 renderContent 로 내용을 그린다", () => {
    const tree: PaneRowLeaf = { kind: "leaf", id: "only", activeTabId: "a", tabs: ROWS };

    render(<Tab tree={tree} activePaneId="only" renderContent={(paneId, tabId) => `${paneId}/${tabId} 내용`} />);

    expect(screen.getByRole("tab", { name: /A/ })).toBeInTheDocument();
    expect(screen.getByText("only/a 내용")).toBeInTheDocument();
  });

  it("Split 에서 탭을 고르면 onSelect 가 칸 id·탭 id 로 불린다", () => {
    const onSelect = vi.fn();
    const tree: PaneRowLeaf = { kind: "leaf", id: "only", activeTabId: "a", tabs: ROWS };

    render(<Tab tree={tree} activePaneId="only" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("tab", { name: /B/ }));

    expect(onSelect).toHaveBeenCalledWith("only", "b");
  });

  implementsDataComponent((extra) => <Tab tabs={ROWS} activeTabId="a" {...extra} />, "Tab");

  it("data-component 로 컴포넌트 이름을 노출한다(Split)", () => {
    const tree: PaneRowLeaf = { kind: "leaf", id: "only", activeTabId: "a", tabs: ROWS };
    const { container } = render(<Tab tree={tree} activePaneId="only" />);

    expect(container.querySelector('[data-component="Tab"]')).toBeInTheDocument();
  });

  implementsClassName((extra) => <Tab tabs={ROWS} activeTabId="a" {...extra} />);
  implementsRef((extra) => <Tab tabs={ROWS} activeTabId="a" {...extra} />, HTMLElement);

  it("ref 로 루트 DOM 노드에 접근할 수 있다(Split, 분기 트리)", () => {
    const ref = createRef<HTMLElement>();
    const tree: PaneRowSplit = {
      kind: "split",
      id: "root",
      orientation: "horizontal",
      children: [
        { kind: "leaf", id: "left", activeTabId: "a", tabs: ROWS },
        { kind: "leaf", id: "right", activeTabId: "b", tabs: ROWS },
      ],
    };

    render(<Tab ref={ref} tree={tree} activePaneId="left" />);

    expect(ref.current).toBe(document.querySelector('[data-component="Tab"]'));
    expect(ref.current).toHaveAttribute("data-orientation", "horizontal");
  });

  it("Tab.Group 을 직접 써도 같은 계약을 지킨다", () => {
    const ref = createRef<HTMLElement>();

    render(<Tab.Group ref={ref} tabs={ROWS} activeTabId="a" />);

    expect(ref.current).toHaveAttribute("data-component", "Tab");
  });

  it("onClose 가 없으면 닫기 버튼이 없고, 있으면 클릭 시 그 탭 id 로 불린다", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Tab tabs={ROWS} activeTabId="a" />);
    expect(screen.queryByRole("button", { name: "A 닫기" })).not.toBeInTheDocument();

    rerender(<Tab tabs={ROWS} activeTabId="a" onClose={onClose} />);
    screen.getByRole("button", { name: "A 닫기" }).click();

    expect(onClose).toHaveBeenCalledWith("a");
  });

  it("비활성 탭도 겹쳐 뜨는 닫기 버튼으로 닫을 수 있다", () => {
    const onClose = vi.fn();
    render(<Tab tabs={ROWS} activeTabId="a" onClose={onClose} />);

    screen.getByRole("button", { name: "B 닫기" }).click();

    expect(onClose).toHaveBeenCalledWith("b");
  });

  it("활성 탭이 dirty여도 닫기 버튼이 곧바로 클릭 가능하고, data-dirty 로 표시된다", () => {
    const onClose = vi.fn();
    render(<Tab tabs={[row("a", "A", { isDirty: true }), ROWS[1]!]} activeTabId="a" onClose={onClose} />);

    screen.getByRole("button", { name: "A 닫기" }).click();

    expect(onClose).toHaveBeenCalledWith("a");
    expect(screen.getByRole("tab", { name: /A/ })).toHaveAttribute("data-dirty", "");
  });

  it("미리보기 탭을 더블클릭하면 onPin 이 그 id로 호출된다", () => {
    const onPin = vi.fn();
    render(<Tab tabs={[row("a", "A", { isPreview: true }), ROWS[1]!]} activeTabId="a" onPin={onPin} />);

    fireEvent.doubleClick(screen.getByRole("tab", { name: /A/ }));

    expect(onPin).toHaveBeenCalledWith("a");
  });

  it("고정된(미리보기 아닌) 탭을 더블클릭해도 onPin 이 안 불린다", () => {
    const onPin = vi.fn();
    render(<Tab tabs={ROWS} activeTabId="a" onPin={onPin} />);

    fireEvent.doubleClick(screen.getByRole("tab", { name: /A/ }));

    expect(onPin).not.toHaveBeenCalled();
  });

  it("renderTabMenu 를 주면 우클릭에 그 메뉴가 뜬다", () => {
    render(<Tab tabs={ROWS} activeTabId="a" renderTabMenu={(tabId) => <span>{tabId} 메뉴</span>} />);

    fireEvent.contextMenu(screen.getByRole("tab", { name: /B/ }));

    expect(screen.getByText("b 메뉴")).toBeInTheDocument();
  });

  it("axe 접근성 위반이 없다", async () => {
    const { container } = render(<Tab tabs={ROWS} activeTabId="a" onClose={() => undefined} />);

    await expectNoA11yViolations(container, { rules: { "nested-interactive": { enabled: false } } });
  });
});
