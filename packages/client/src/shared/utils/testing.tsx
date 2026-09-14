import { createRef } from "react";
import type { ReactElement, Ref } from "react";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "./axe";

/**
 * 컴포넌트의 정형 계약(→ ADR 0010)을 함수로 만든 것 — primer/react의
 * `utils/testing.tsx`(`implementsClassName`)가 `describe` 안에서 `it()`을 직접 생성해 호출 한 줄로
 * 끝내는 패턴을 그대로 가져와 data-component·ref·axe까지 넓혔다.
 *
 * `Component`를 직접 받지 않고 필요한 extra prop만 받아 엘리먼트를 반환하는 함수를 받는다 —
 * 필수 prop이 있는 컴포넌트(예: `FileTree`의 `items`)도 클로저 안에서 채워 넣으면 되므로,
 * `Component: ComponentType<Record<string, unknown>>` 였던 예전 시그니처가 필수 prop이 하나라도
 * 있으면 컴파일이 안 되던 문제가 없다.
 */

const TEST_ID = "testing-tsx-target";

/** `it()` 하나를 만든다 — 부르는 쪽의 `describe` 안에서 부른다. */
export function implementsClassName(
  renderElement: (extra: { className: string; "data-testid": string }) => ReactElement,
): void {
  it("넘긴 className 을 그대로 싣는다", () => {
    render(renderElement({ className: "test-class", "data-testid": TEST_ID }));
    expect(screen.getByTestId(TEST_ID)).toHaveClass("test-class");
  });
}

/** `it()` **둘**을 만든다 — 이름이 실리는지와, prop으로 덮어쓰이지 않는지. */
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

/**
 * `ref`가 실제 DOM 원소에 닿는지 본다 — React 19부터 `ref`는 보통 prop이라 전달 경로가
 * 래퍼가 아니라 스프레드다(→ ADR 0008). `elementType`은 생성자다 — `instanceof`로 보므로
 * `HTMLDivElement`처럼 넘긴다.
 */
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

/** 예외 옵션을 받지 않는다 — 규칙을 빼야 하면 `expectNoA11yViolations`를 직접 부른다. */
export function implementsNoA11yViolations(renderElement: () => ReactElement): void {
  it("axe 접근성 위반이 없다", async () => {
    const { container } = render(renderElement());
    await expectNoA11yViolations(container);
  });
}
