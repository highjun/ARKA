import { createRef } from "react";
import type { ReactElement, Ref } from "react";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "./axe";

const TEST_ID = "testing-tsx-target";

export function implementsClassName(
  renderElement: (extra: { className: string; "data-testid": string }) => ReactElement,
): void {
  it("넘긴 className 을 그대로 싣는다", () => {
    render(renderElement({ className: "test-class", "data-testid": TEST_ID }));
    expect(screen.getByTestId(TEST_ID)).toHaveClass("test-class");
  });
}

export function implementsDataComponent(
  renderElement: (extra: { "data-testid": string; "data-component"?: string }) => ReactElement,
  name: string,
): void {
  it("data-component 로 컴포넌트 이름을 노출한다", () => {
    render(renderElement({ "data-testid": TEST_ID }));
    expect(screen.getByTestId(TEST_ID)).toHaveAttribute("data-component", name);
  });

  it("data-component 는 prop 으로 오버라이드되지 않는다", () => {
    render(renderElement({ "data-testid": TEST_ID, "data-component": `Custom${name}` }));
    expect(screen.getByTestId(TEST_ID)).toHaveAttribute("data-component", name);
  });
}

export function implementsRef<T>(
  renderElement: (extra: { ref: Ref<T> }) => ReactElement,
  elementType: new () => T,
): void {
  it("ref 로 실제 엘리먼트에 접근할 수 있다", () => {
    const ref = createRef<T>();
    render(renderElement({ ref }));
    expect(ref.current).toBeInstanceOf(elementType);
  });
}

export function implementsNoA11yViolations(renderElement: () => ReactElement): void {
  it("axe 접근성 위반이 없다", async () => {
    const { container } = render(renderElement());
    await expectNoA11yViolations(container);
  });
}
