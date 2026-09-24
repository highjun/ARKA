import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { implementsClassName, implementsDataComponent, implementsRef, implementsNoA11yViolations } from "#lib/testing";
import { Kbd } from "./Kbd";

describe("Kbd", () => {
  implementsClassName((extra) => <Kbd {...extra}>K</Kbd>);
  implementsDataComponent((extra) => <Kbd {...extra}>K</Kbd>, "Kbd");
  implementsRef((extra) => <Kbd {...extra}>K</Kbd>, HTMLElement);
  implementsNoA11yViolations(() => <Kbd>K</Kbd>);

  it("kbd 태그로 그리고 tone 기본값은 default 다", () => {
    render(<Kbd>Ctrl</Kbd>);

    const kbd = screen.getByText("Ctrl");
    expect(kbd.tagName).toBe("KBD");
    expect(kbd).toHaveAttribute("data-tone", "default");
  });

  it.each(["default", "onEmphasis"] as const)('tone="%s" 를 data 속성에 반영한다', (tone) => {
    render(<Kbd tone={tone}>K</Kbd>);

    expect(screen.getByText("K")).toHaveAttribute("data-tone", tone);
  });
});
