import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { ModeToggle } from "./ModeToggle";

const values = ["light", "dark"] as const;
const children = ["☀", "🌙"] as const;

describe("ModeToggle", () => {
  implementsClassName((extra) => (
    <ModeToggle aria-label="전환" values={values} value="light" onValueChange={vi.fn()} {...extra}>
      {children}
    </ModeToggle>
  ));
  implementsDataComponent(
    (extra) => (
      <ModeToggle aria-label="전환" values={values} value="light" onValueChange={vi.fn()} {...extra}>
        {children}
      </ModeToggle>
    ),
    "ModeToggle",
  );
  implementsRef(
    (extra) => (
      <ModeToggle aria-label="전환" values={values} value="light" onValueChange={vi.fn()} {...extra}>
        {children}
      </ModeToggle>
    ),
    HTMLButtonElement,
  );
  implementsNoA11yViolations(() => (
    <ModeToggle aria-label="전환" values={values} value="light" onValueChange={vi.fn()}>
      {children}
    </ModeToggle>
  ));

  it("현재 값을 aria-pressed/data-state로 드러낸다", () => {
    const { container: lightContainer } = render(
      <ModeToggle aria-label="전환" values={values} value="light" onValueChange={vi.fn()}>
        {children}
      </ModeToggle>,
    );
    expect(lightContainer.querySelector("button")).toHaveAttribute("aria-pressed", "false");
    expect(lightContainer.querySelector("button")).toHaveAttribute("data-state", "light");

    const { container: darkContainer } = render(
      <ModeToggle aria-label="전환" values={values} value="dark" onValueChange={vi.fn()}>
        {children}
      </ModeToggle>,
    );
    expect(darkContainer.querySelector("button")).toHaveAttribute("aria-pressed", "true");
    expect(darkContainer.querySelector("button")).toHaveAttribute("data-state", "dark");
  });

  it("클릭하면 다음 값으로 순환한다", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ModeToggle aria-label="전환" values={values} value="light" onValueChange={onValueChange}>
        {children}
      </ModeToggle>,
    );

    fireEvent.click(container.querySelector("button") as HTMLButtonElement);
    expect(onValueChange).toHaveBeenCalledWith("dark");
  });

  it("disabled 면 클릭해도 값이 바뀌지 않는다", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ModeToggle aria-label="전환" values={values} value="light" onValueChange={onValueChange} disabled>
        {children}
      </ModeToggle>,
    );

    fireEvent.click(container.querySelector("button") as HTMLButtonElement);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  /**
   * `IconButton`은 툴팁이 있으면(비활성화가 아닌 한) `aria-label`을 버튼에 직접 싣지 않고
   * `aria-labelledby`로 툴팁 텍스트를 가리킨다(`@primer/react` `Button/IconButton.js` 확인) —
   * 그래서 속성을 직접 보는 대신 접근성 이름 계산 규칙을 그대로 따르는 `getByRole`로 검증한다.
   */
  it("labels 를 넘기면 현재 인덱스에 맞는 라벨을 접근성 이름으로 쓴다", () => {
    render(
      <ModeToggle values={values} value="dark" onValueChange={vi.fn()} labels={["라이트로 전환", "다크로 전환"]}>
        {children}
      </ModeToggle>,
    );

    expect(screen.getByRole("button", { name: "다크로 전환" })).toBeInTheDocument();
  });

  it("labels 도 aria-label 도 없으면 마지막 안전망 라벨을 쓴다 — 접근성 이름 없이 렌더되면 안 된다", () => {
    render(
      <ModeToggle values={values} value="light" onValueChange={vi.fn()}>
        {children}
      </ModeToggle>,
    );

    expect(screen.getByRole("button", { name: "전환" })).toBeInTheDocument();
  });

  it("defaultValue 만 주면(uncontrolled) 클릭 시 내부적으로 값이 바뀐다", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ModeToggle aria-label="전환" values={values} defaultValue="light" onValueChange={onValueChange}>
        {children}
      </ModeToggle>,
    );

    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button).toHaveAttribute("data-state", "light");

    fireEvent.click(button);
    expect(onValueChange).toHaveBeenCalledWith("dark");
    expect(button).toHaveAttribute("data-state", "dark");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("value 도 defaultValue 도 없으면 values[0] 을 초기값으로 쓴다", () => {
    const { container } = render(
      <ModeToggle aria-label="전환" values={values} onValueChange={vi.fn()}>
        {children}
      </ModeToggle>,
    );

    expect(container.querySelector("button")).toHaveAttribute("data-state", "light");
  });
});
