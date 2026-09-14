import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { ActivityBar } from "./ActivityBar";
import type { ActivityBarItem } from "./ActivityBar";

const ITEMS: ActivityBarItem[] = [
  { id: "explorer", iconId: "files", label: "탐색기", isActive: true },
  { id: "search", iconId: "search", label: "검색" },
];

describe("ActivityBar", () => {
  it("클릭 시 onSelect 가 그 id 로 호출된다", () => {
    const onSelect = vi.fn();
    render(<ActivityBar items={ITEMS} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onSelect).toHaveBeenCalledWith("search");
  });

  it("활성 항목에 aria-pressed 를 붙인다", () => {
    render(<ActivityBar items={ITEMS} onSelect={() => {}} />);

    expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
  });

  implementsDataComponent((extra) => <ActivityBar items={ITEMS} onSelect={() => {}} {...extra} />, "ActivityBar");

  implementsClassName((extra) => <ActivityBar items={ITEMS} onSelect={() => {}} {...extra} />);
  implementsRef((extra) => <ActivityBar items={ITEMS} onSelect={() => {}} {...extra} />, HTMLElement);
  implementsNoA11yViolations(() => <ActivityBar items={ITEMS} onSelect={() => {}} />);

  describe("State", () => {
    const UNCONTROLLED_ITEMS: ActivityBarItem[] = [
      { id: "explorer", iconId: "files", label: "탐색기" },
      { id: "search", iconId: "search", label: "검색" },
    ];

    it("onSelect 없이도 렌더된다 — 필수가 아니다", () => {
      render(<ActivityBar items={UNCONTROLLED_ITEMS} />);

      expect(screen.getByRole("button", { name: "탐색기" })).toBeInTheDocument();
    });

    it("defaultActiveId가 uncontrolled 시작값이 된다", () => {
      render(<ActivityBar items={UNCONTROLLED_ITEMS} defaultActiveId="search" />);

      expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "true");
    });

    it("uncontrolled 모드에서 클릭한 항목이 활성 상태가 된다", () => {
      render(<ActivityBar items={UNCONTROLLED_ITEMS} defaultActiveId="explorer" />);

      fireEvent.click(screen.getByRole("button", { name: "검색" }));

      expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "false");
    });

    it("activeId를 넘기면(controlled) 클릭해도 onActiveIdChange 없이는 강조가 안 바뀐다", () => {
      render(<ActivityBar items={UNCONTROLLED_ITEMS} activeId="explorer" />);

      fireEvent.click(screen.getByRole("button", { name: "검색" }));

      expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
    });

    it("item.isActive가 있으면 내부 상태 계산보다 우선한다", () => {
      render(
        <ActivityBar
          items={[
            { id: "explorer", iconId: "files", label: "탐색기", isActive: true },
            { id: "search", iconId: "search", label: "검색" },
          ]}
        />,
      );

      expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
    });
  });
});
