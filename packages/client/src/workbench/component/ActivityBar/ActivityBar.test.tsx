import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { ActivityBar } from "./ActivityBar";
import type { SidebarRow } from "./ActivityBar";

const TOP: SidebarRow[] = [
  { id: "explorer", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
];

const BOTTOM: SidebarRow[] = [{ id: "settings", iconId: "settingsGear", title: "설정" }];

/** 위·아래를 다 갖춘 한 벌. 하네스가 루트에 props 를 꽂을 수 있게 children 으로만 짠다. */
const 한벌 = (extra: Record<string, unknown> = {}) => (
  <ActivityBar {...extra}>
    <ActivityBar.Top items={TOP} activeId="explorer" />
    <ActivityBar.Bottom items={BOTTOM} />
  </ActivityBar>
);

describe("ActivityBar", () => {
  it("클릭 시 onSelect 가 그 id 로 호출된다", () => {
    const onSelect = vi.fn();
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} onSelect={onSelect} />
      </ActivityBar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onSelect).toHaveBeenCalledWith("search");
  });

  it("활성은 activeId 하나가 정한다 — aria-pressed 로 드러난다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} activeId="explorer" />
      </ActivityBar>,
    );

    expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
  });

  it("아래 묶음은 활성이 되지 않는다 — 같은 id 를 위의 activeId 로 줘도 눌린 꼴이 아니다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} activeId="settings" />
        <ActivityBar.Bottom items={BOTTOM} />
      </ActivityBar>,
    );

    expect(screen.getByRole("button", { name: "설정" })).toHaveAttribute("aria-pressed", "false");
  });

  it("아래 묶음도 제 onSelect 로 간다 — 위와 통로가 따로다", () => {
    const onTop = vi.fn();
    const onBottom = vi.fn();
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} onSelect={onTop} />
        <ActivityBar.Bottom items={BOTTOM} onSelect={onBottom} />
      </ActivityBar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "설정" }));

    expect(onBottom).toHaveBeenCalledWith("settings");
    expect(onTop).not.toHaveBeenCalled();
  });

  it("아래 묶음을 안 넣으면 그 자리도 안 잡는다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} />
      </ActivityBar>,
    );

    expect(screen.queryByRole("button", { name: "설정" })).toBeNull();
  });

  it("renderItemMenu 를 주면 우클릭에 그 메뉴가 뜬다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} renderItemMenu={(item) => <span>{item.title} 숨기기</span>} />
      </ActivityBar>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "검색" }));

    expect(screen.getByText("검색 숨기기")).toBeInTheDocument();
  });

  implementsDataComponent((extra) => 한벌(extra), "ActivityBar");
  implementsClassName((extra) => 한벌(extra));
  implementsRef((extra) => 한벌(extra), HTMLElement);
  implementsNoA11yViolations(() => 한벌());
});
