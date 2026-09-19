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

const ITEMS: SidebarRow[] = [
  { id: "explorer", iconId: "files", title: "탐색기", isActive: true },
  { id: "search", iconId: "search", title: "검색", isActive: false },
];

describe("ActivityBar", () => {
  it("클릭 시 onSelect 가 그 id 로 호출된다", () => {
    const onSelect = vi.fn();
    render(<ActivityBar items={ITEMS} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onSelect).toHaveBeenCalledWith("search");
  });

  it("활성 여부는 줄이 정한다 — aria-pressed 로 드러난다", () => {
    render(<ActivityBar items={ITEMS} />);

    expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
  });

  it("맨 아래 설정 톱니를 누르면 onSettingsSelect 가 불린다 — 사이드바가 아니라 onSelect 는 안 불린다", () => {
    const onSelect = vi.fn();
    const onSettingsSelect = vi.fn();
    render(<ActivityBar items={ITEMS} onSelect={onSelect} onSettingsSelect={onSettingsSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "설정" }));

    expect(onSettingsSelect).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renderItemMenu 를 주면 우클릭에 그 메뉴가 뜬다", () => {
    render(<ActivityBar items={ITEMS} renderItemMenu={(item) => <span>{item.title} 숨기기</span>} />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "검색" }));

    expect(screen.getByText("검색 숨기기")).toBeInTheDocument();
  });

  implementsDataComponent((extra) => <ActivityBar items={ITEMS} {...extra} />, "ActivityBar");
  implementsClassName((extra) => <ActivityBar items={ITEMS} {...extra} />);
  implementsRef((extra) => <ActivityBar items={ITEMS} {...extra} />, HTMLElement);
  implementsNoA11yViolations(() => <ActivityBar items={ITEMS} />);
});
