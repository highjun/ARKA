import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "#utils/axe";
import { implementsClassName, implementsDataComponent, implementsRef } from "#utils/testing";
import { Icon } from "#component/Icon";
import { Tab } from "./index";
import type { TabGroup, TabItem, TabSplit } from "./index";

const item = (id: string, title: string, extra: Partial<TabItem> = {}): TabItem => ({
  id,
  title,
  icon: <Icon iconId="file" size="sm" />,
  ...extra,
});

const ITEMS: TabItem[] = [item("a", "A"), item("b", "B")];

const group = (id: string, items: readonly TabItem[] = ITEMS, activeItemId: string | null = "a"): TabGroup => ({
  kind: "group",
  id,
  items,
  activeItemId,
});

const ONE_GROUP = group("only");
const renderContent = (itemId: string) => `${itemId} 내용`;
const activeGroups = (container: HTMLElement) =>
  container.querySelectorAll('[data-component="Tab/Group"][data-active]');

describe("Tab", () => {
  it("칸 하나짜리 트리를 주면 탭 띠와 활성 탭의 내용을 그린다", () => {
    render(<Tab tree={ONE_GROUP} renderContent={renderContent} />);

    expect(screen.getByRole("tab", { name: /A/ })).toBeInTheDocument();
    expect(screen.getByText("a 내용")).toBeInTheDocument();
    expect(screen.queryByText("b 내용")).not.toBeInTheDocument();
  });

  it("탭이 0개면 띠를 안 그리고 emptyMessage 만 그린다", () => {
    render(<Tab tree={group("only", [], null)} emptyMessage="탐색기에서 파일을 고르세요." />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("data-empty", "");
    expect(screen.getByText("탐색기에서 파일을 고르세요.")).toBeInTheDocument();
  });

  it("activeItemId 가 목록에 없으면 첫 탭이 활성이다", () => {
    render(<Tab tree={group("only", ITEMS, "사라진탭")} />);

    expect(screen.getByRole("tab", { name: /A/ })).toHaveAttribute("aria-selected", "true");
  });

  it("탭을 고르면 onItemSelect 가 칸 id·탭 id 로 불린다", () => {
    const onItemSelect = vi.fn();
    render(<Tab tree={ONE_GROUP} onItemSelect={onItemSelect} />);

    fireEvent.click(screen.getByRole("tab", { name: /B/ }));

    expect(onItemSelect).toHaveBeenCalledWith("only", "b");
  });

  it("onItemClose 가 없으면 닫기 버튼이 없고, 있으면 클릭 시 칸 id·탭 id 로 불린다", () => {
    const onItemClose = vi.fn();
    const { rerender } = render(<Tab tree={ONE_GROUP} />);
    expect(screen.queryByRole("button", { name: "A 닫기" })).not.toBeInTheDocument();

    rerender(<Tab tree={ONE_GROUP} onItemClose={onItemClose} />);
    screen.getByRole("button", { name: "A 닫기" }).click();

    expect(onItemClose).toHaveBeenCalledWith("only", "a");
  });

  it("저장 안 한 탭은 닫기 버튼이 곧바로 눌리고 data-dirty 로 표시된다", () => {
    const onItemClose = vi.fn();
    render(<Tab tree={group("only", [item("a", "A", { isDirty: true }), ITEMS[1]!])} onItemClose={onItemClose} />);

    screen.getByRole("button", { name: "A 닫기" }).click();

    expect(onItemClose).toHaveBeenCalledWith("only", "a");
    expect(screen.getByRole("tab", { name: /A/ })).toHaveAttribute("data-dirty", "");
  });

  it("미리보기 탭을 더블클릭하면 onItemPin 이 불린다", () => {
    const onItemPin = vi.fn();
    render(<Tab tree={group("only", [item("a", "A", { isPreview: true }), ITEMS[1]!])} onItemPin={onItemPin} />);

    fireEvent.doubleClick(screen.getByRole("tab", { name: /A/ }));

    expect(onItemPin).toHaveBeenCalledWith("only", "a");
  });

  it("renderItemMenu 를 주면 우클릭에 그 메뉴가 뜬다", () => {
    render(<Tab tree={ONE_GROUP} renderItemMenu={(groupId, itemId) => <span>{`${groupId}/${itemId} 메뉴`}</span>} />);

    fireEvent.contextMenu(screen.getByRole("tab", { name: /B/ }));

    expect(screen.getByText("only/b 메뉴")).toBeInTheDocument();
  });

  it("탭이 하나도 없는 칸은 트리에서 잘라내고 남은 칸만 그린다", () => {
    const tree: TabSplit = {
      kind: "split",
      id: "root",
      orientation: "horizontal",
      children: [group("empty", [], null), group("full", [item("a", "A")])],
    };

    const { container } = render(<Tab tree={tree} renderContent={renderContent} />);

    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(container.querySelectorAll('[data-component="Tab/Group"]')).toHaveLength(1);
  });

  it("가지를 Tab.Split 으로, 잎을 Tab.Group 으로 그린다", () => {
    const tree: TabSplit = {
      kind: "split",
      id: "root",
      orientation: "vertical",
      children: [group("top"), group("bottom", ITEMS, "b")],
    };

    const { container } = render(<Tab tree={tree} onSplitResize={() => undefined} />);

    expect(container.querySelector('[data-component="Tab/Split"]')).toHaveAttribute("data-orientation", "vertical");
    expect(container.querySelectorAll('[data-component="Tab/Group"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-component="Tab/Sash"]')).toHaveLength(1);
  });

  describe("활성 칸", () => {
    const split: TabSplit = {
      kind: "split",
      id: "root",
      orientation: "horizontal",
      children: [group("left", [item("a", "A")]), group("right", [item("b", "B")], "b")],
    };

    it("activeGroupId 를 안 주면 트리의 첫 칸이 활성이다", () => {
      const { container } = render(<Tab tree={split} />);

      expect(activeGroups(container)).toHaveLength(1);
      expect(activeGroups(container)[0]).toHaveTextContent("A");
    });

    it("다른 칸의 탭을 고르면 활성 칸이 그리로 옮겨간다", () => {
      const { container } = render(<Tab tree={split} />);

      fireEvent.click(screen.getByRole("tab", { name: /B/ }));

      expect(activeGroups(container)[0]).toHaveTextContent("B");
    });

    it("activeGroupId 를 주면 그 값을 따른다", () => {
      const { container } = render(<Tab tree={split} activeGroupId="right" />);

      expect(activeGroups(container)[0]).toHaveTextContent("B");
    });
  });

  implementsClassName((extra) => <Tab tree={ONE_GROUP} {...extra} />);
  implementsDataComponent((extra) => <Tab tree={ONE_GROUP} {...extra} />, "Tab");
  implementsRef((extra) => <Tab tree={ONE_GROUP} {...extra} />, HTMLDivElement);

  it("분할 트리에서도 ref 는 뿌리 하나를 가리킨다", () => {
    const ref = createRef<HTMLDivElement>();
    const tree: TabSplit = {
      kind: "split",
      id: "root",
      orientation: "horizontal",
      children: [group("left"), group("right", ITEMS, "b")],
    };

    render(<Tab ref={ref} tree={tree} />);

    expect(ref.current).toBe(document.querySelector('[data-component="Tab"]'));
  });

  it("axe 접근성 위반이 없다", async () => {
    const { container } = render(<Tab tree={ONE_GROUP} renderContent={renderContent} onItemClose={() => undefined} />);

    await expectNoA11yViolations(container, { rules: { "nested-interactive": { enabled: false } } });
  });
});

describe("Tab.Split", () => {
  it("onResize 를 주면 자식 사이마다 Sash 가 하나씩 선다", () => {
    render(
      <Tab.Split orientation="horizontal" onResize={() => undefined}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </Tab.Split>,
    );

    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });

  it("onResize 가 없으면 Sash 를 안 그린다", () => {
    render(
      <Tab.Split orientation="horizontal">
        <div>A</div>
        <div>B</div>
      </Tab.Split>,
    );

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("Sash 를 움직이면 앞 자식의 새 비율(%)이 온다 — px 이동량을 자기 상자로 잰다", () => {
    const onResize = vi.fn();
    const { container } = render(
      <Tab.Split orientation="horizontal" onResize={onResize}>
        <div data-testid="left">A</div>
        <div>B</div>
      </Tab.Split>,
    );

    const box = container.querySelector('[data-component="Tab/Split"]')!;
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({ width: 200, height: 100 } as DOMRect);
    vi.spyOn(screen.getByTestId("left"), "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 100,
    } as DOMRect);

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });

    // 100px 이던 자식이 24px 늘어 124px, 상자가 200px 이니 62% 다.
    expect(onResize).toHaveBeenCalledWith(0, 62);
  });

  it("size 를 주면 형제 사이에서 그만큼 차지한다", () => {
    const { container } = render(
      <Tab.Split orientation="horizontal" size={30}>
        <div>A</div>
      </Tab.Split>,
    );

    expect(container.querySelector('[data-component="Tab/Split"]')).toHaveStyle({ flexBasis: "30%" });
  });

  implementsClassName((extra) => <Tab.Split orientation="horizontal" {...extra} />);
  implementsDataComponent((extra) => <Tab.Split orientation="horizontal" {...extra} />, "Tab/Split");
  implementsRef((extra) => <Tab.Split orientation="horizontal" {...extra} />, HTMLDivElement);
});

describe("Tab.Group", () => {
  it("활성 여부를 data-active 로 드러낸다", () => {
    const { container } = render(<Tab.Group isActive>내용</Tab.Group>);

    expect(container.querySelector('[data-component="Tab/Group"]')).toHaveAttribute("data-active", "");
  });

  it("size 를 주면 형제 사이에서 그만큼 차지한다", () => {
    const { container } = render(<Tab.Group size={65}>내용</Tab.Group>);

    expect(container.querySelector('[data-component="Tab/Group"]')).toHaveStyle({ flexBasis: "65%" });
  });

  implementsClassName((extra) => <Tab.Group {...extra}>내용</Tab.Group>);
  implementsDataComponent((extra) => <Tab.Group {...extra}>내용</Tab.Group>, "Tab/Group");
  implementsRef((extra) => <Tab.Group {...extra}>내용</Tab.Group>, HTMLDivElement);
});

describe("Tab.Strip", () => {
  it("탭 목록을 tablist 로 그리고, 고르면 탭 id 하나만 받는다", () => {
    const onItemSelect = vi.fn();
    render(<Tab.Strip items={ITEMS} activeItemId="a" onItemSelect={onItemSelect} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /B/ }));

    expect(onItemSelect).toHaveBeenCalledWith("b");
  });

  it("activeItemId 를 안 주면 스스로 기억한다", () => {
    render(<Tab.Strip items={ITEMS} />);
    expect(screen.getByRole("tab", { name: /A/ })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: /B/ }));

    expect(screen.getByRole("tab", { name: /B/ })).toHaveAttribute("aria-selected", "true");
  });

  it("다른 띠에서 끌어온 탭도 같은 길로 들어온다 — 꽂을 자리를 탭 id 로 알린다", () => {
    const onItemMove = vi.fn();
    render(<Tab.Strip items={ITEMS} activeItemId="a" onItemMove={onItemMove} />);

    const dataTransfer = { getData: () => "바깥탭", dropEffect: "move" };
    fireEvent.drop(screen.getByRole("tablist"), { dataTransfer, clientX: 0 });

    // 이 띠에 없던 탭이라 목록 끝에 꽂힌다.
    expect(onItemMove).toHaveBeenCalledWith("바깥탭", null);
  });

  it("onItemMove 가 없으면 탭을 끌 수 없다", () => {
    const { rerender } = render(<Tab.Strip items={ITEMS} activeItemId="a" />);
    expect(screen.getByRole("tab", { name: /A/ })).not.toHaveAttribute("draggable", "true");

    rerender(<Tab.Strip items={ITEMS} activeItemId="a" onItemMove={() => undefined} />);
    expect(screen.getByRole("tab", { name: /A/ })).toHaveAttribute("draggable", "true");
  });

  implementsClassName((extra) => <Tab.Strip items={ITEMS} activeItemId="a" {...extra} />);
  implementsDataComponent((extra) => <Tab.Strip items={ITEMS} activeItemId="a" {...extra} />, "Tab/Strip");
  implementsRef((extra) => <Tab.Strip items={ITEMS} activeItemId="a" {...extra} />, HTMLDivElement);
});

describe("Tab.Panel", () => {
  it("role=tabpanel 을 알아서 채운다", () => {
    render(<Tab.Panel aria-label="내용">본문</Tab.Panel>);

    expect(screen.getByRole("tabpanel", { name: "내용" })).toHaveTextContent("본문");
  });

  implementsClassName((extra) => <Tab.Panel {...extra}>본문</Tab.Panel>);
  implementsDataComponent((extra) => <Tab.Panel {...extra}>본문</Tab.Panel>, "Tab/Panel");
  implementsRef((extra) => <Tab.Panel {...extra}>본문</Tab.Panel>, HTMLDivElement);
});

describe("Tab.Sash", () => {
  it("가로로 놓였으면 방향키가 좌우고, 이동량을 px 로 알린다", () => {
    const onResize = vi.fn();
    render(<Tab.Sash orientation="horizontal" onResize={onResize} />);

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    expect(onResize).toHaveBeenCalledWith(24);

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });
    expect(onResize).toHaveBeenCalledWith(-24);
  });

  it("세로로 놓였으면 위아래 방향키만 듣는다", () => {
    const onResize = vi.fn();
    render(<Tab.Sash orientation="vertical" onResize={onResize} />);

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    expect(onResize).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowDown" });
    expect(onResize).toHaveBeenCalledWith(24);
  });

  it("끄는 방향과 가름선의 방향은 서로 직각이다", () => {
    render(<Tab.Sash orientation="horizontal" />);

    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("disabled 면 초점도 못 받고 방향키도 안 듣는다", () => {
    const onResize = vi.fn();
    render(<Tab.Sash orientation="horizontal" disabled onResize={onResize} />);

    const sash = screen.getByRole("separator");
    fireEvent.keyDown(sash, { key: "ArrowRight" });

    expect(onResize).not.toHaveBeenCalled();
    expect(sash).toHaveAttribute("tabindex", "-1");
  });

  implementsClassName((extra) => <Tab.Sash orientation="horizontal" {...extra} />);
  implementsDataComponent((extra) => <Tab.Sash orientation="horizontal" {...extra} />, "Tab/Sash");
  implementsRef((extra) => <Tab.Sash orientation="horizontal" {...extra} />, HTMLDivElement);
});

describe("Tab.Item", () => {
  it("미리보기 탭은 data-preview 로 표시한다", () => {
    render(<Tab.Item item={item("a", "A", { isPreview: true })} />);

    expect(screen.getByText("A")).toHaveAttribute("data-preview", "");
  });

  it("저장 안 한 탭은 닫기 버튼 자리에 점을 하나 더 얹는다", () => {
    const slotSizeOf = (isDirty: boolean) => {
      const { unmount } = render(<Tab.Item item={item("a", "A", { isDirty })} onItemClose={() => undefined} />);
      const size = screen.getByRole("button", { name: "A 닫기" }).parentElement?.childElementCount ?? 0;
      unmount();
      return size;
    };

    expect(slotSizeOf(true)).toBe(slotSizeOf(false) + 1);
  });

  implementsClassName((extra) => <Tab.Item item={ITEMS[0]!} {...extra} />);
  implementsDataComponent((extra) => <Tab.Item item={ITEMS[0]!} {...extra} />, "Tab/Item");
  implementsRef((extra) => <Tab.Item item={ITEMS[0]!} {...extra} />, HTMLDivElement);
});
