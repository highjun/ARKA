import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { Bottom } from "./Bottom";
import * as stories from "./Bottom.stories";
import type { BottomRow } from "./Bottom";

const { Default, NoSelection } = composeStories(stories);

const TABS: readonly BottomRow[] = [
  { id: "problems", title: "PROBLEMS", iconId: "warning", isActive: false },
  { id: "terminal", title: "TERMINAL", iconId: "monitor", isActive: true },
];

describe("Bottom", () => {
  implementsClassName((extra) => <Bottom {...extra}>content</Bottom>);
  implementsDataComponent((extra) => <Bottom {...extra}>content</Bottom>, "Bottom");
  implementsRef((extra) => <Bottom {...extra}>content</Bottom>, HTMLElement);
  implementsNoA11yViolations(() => (
    <Bottom>
      <Bottom.Header tabs={TABS} />
      <Bottom.Panel>content</Bottom.Panel>
    </Bottom>
  ));

  it("`Default` 스토리는 탭 줄과 본문을 함께 그린다", () => {
    render(<Default />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("`NoSelection` 스토리는 본문 없이 띠만 그린다", () => {
    render(<NoSelection />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
  });

  it("활성 탭만 `aria-selected`가 참이다", () => {
    render(
      <Bottom>
        <Bottom.Header tabs={TABS} />
      </Bottom>,
    );

    expect(screen.getByRole("tab", { name: /TERMINAL/u })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /PROBLEMS/u })).toHaveAttribute("aria-selected", "false");
  });

  it("줄을 누르면 그 id로 알린다", () => {
    const onSelect = vi.fn();
    render(
      <Bottom>
        <Bottom.Header tabs={TABS} onSelect={onSelect} />
      </Bottom>,
    );

    fireEvent.click(screen.getByRole("tab", { name: /PROBLEMS/u }));

    expect(onSelect).toHaveBeenCalledWith("problems");
  });

  it("actions를 안 주면 그 자리도 안 생긴다", () => {
    const { container } = render(
      <Bottom>
        <Bottom.Header tabs={TABS} />
      </Bottom>,
    );

    expect(container.querySelectorAll("button")).toHaveLength(TABS.length);
  });

  it("부품은 제 `data-component`를 싣는다 — 그림의 부품 이름과 같은 말이다", () => {
    const { container } = render(
      <Bottom>
        <Bottom.Header tabs={TABS} />
        <Bottom.Panel>본문</Bottom.Panel>
      </Bottom>,
    );

    expect(container.querySelector('[data-component="Bottom/Header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-component="Bottom/Panel"]')).toBeInTheDocument();
  });
});
