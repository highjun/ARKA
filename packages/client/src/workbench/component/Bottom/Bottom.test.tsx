import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#lib/testing";
import { Bottom } from "./Bottom";
import * as stories from "./Bottom.stories";
import type { BottomItem } from "./Bottom";

const { Default } = composeStories(stories);

const ITEMS: readonly BottomItem[] = [
  { id: "problems", title: "problems" },
  { id: "terminal", title: "terminal" },
];

describe("Bottom", () => {
  implementsClassName((extra) => <Bottom {...extra}>content</Bottom>);
  implementsDataComponent((extra) => <Bottom {...extra}>content</Bottom>, "Bottom");
  implementsRef((extra) => <Bottom {...extra}>content</Bottom>, HTMLElement);
  implementsNoA11yViolations(() => (
    <Bottom>
      <Bottom.Header items={ITEMS} />
      <Bottom.Panel>content</Bottom.Panel>
    </Bottom>
  ));

  it("`Default` 스토리는 탭 줄과 본문을 함께 그린다", () => {
    render(<Default />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("Panel을 안 주면 본문 없이 띠만 그린다", () => {
    render(
      <Bottom>
        <Bottom.Header items={ITEMS} />
      </Bottom>,
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
  });

  it("`activeId`로 고른 탭만 `aria-selected`가 참이다", () => {
    render(
      <Bottom>
        <Bottom.Header items={ITEMS} activeId="terminal" />
      </Bottom>,
    );

    expect(screen.getByRole("tab", { name: "terminal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "problems" })).toHaveAttribute("aria-selected", "false");
  });

  it("`activeId`를 안 주면 누른 탭을 제 손으로 켠다", () => {
    render(
      <Bottom>
        <Bottom.Header items={ITEMS} />
      </Bottom>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "problems" }));

    expect(screen.getByRole("tab", { name: "problems" })).toHaveAttribute("aria-selected", "true");
  });

  it("줄을 누르면 그 id로 알린다", () => {
    const onItemSelect = vi.fn();
    render(
      <Bottom>
        <Bottom.Header items={ITEMS} activeId="terminal" onItemSelect={onItemSelect} />
      </Bottom>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "problems" }));

    expect(onItemSelect).toHaveBeenCalledWith("problems");
  });

  it("onClose를 안 주면 닫기 단추도 안 생긴다", () => {
    const { container } = render(
      <Bottom>
        <Bottom.Header items={ITEMS} />
      </Bottom>,
    );

    expect(container.querySelectorAll("button")).toHaveLength(ITEMS.length);
  });

  it("닫기 단추를 누르면 onClose를 부른다", () => {
    const onClose = vi.fn();
    render(
      <Bottom>
        <Bottom.Header items={ITEMS} onClose={onClose} />
      </Bottom>,
    );

    fireEvent.click(screen.getByRole("button", { name: "아래 창 닫기" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("부품은 제 `data-component`를 싣는다 — 그림의 부품 이름과 같은 말이다", () => {
    const { container } = render(
      <Bottom>
        <Bottom.Header items={ITEMS} />
        <Bottom.Panel>본문</Bottom.Panel>
      </Bottom>,
    );

    expect(container.querySelector('[data-component="Bottom/Header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-component="Bottom/Panel"]')).toBeInTheDocument();
  });
});
