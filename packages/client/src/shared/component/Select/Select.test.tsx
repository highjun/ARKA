import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { Select } from "./Select";

const Demo = (props: Omit<ComponentProps<typeof Select>, "children">) => (
  <Select {...props}>
    <Select.Trigger>모델</Select.Trigger>
    <Select.Content>
      <Select.Item value="opus">Opus</Select.Item>
      <Select.Item value="sonnet">Sonnet</Select.Item>
    </Select.Content>
  </Select>
);

/** 프리미티브를 감싼 구조가 계약대로 동작하는지 본다 — 열리고, 고르면 값이 올라오고, 고른 줄에 표시가 붙는다. */
describe("Select", () => {
  it("트리거를 누르면 열린다(비제어)", () => {
    render(<Demo />);

    expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument();
    // Radix 트리거는 `pointerdown`(button 0)에서 연다 — `Menu`와 같다.
    fireEvent.pointerDown(screen.getByRole("button", { name: "모델" }), {
      button: 0,
    });

    expect(screen.getByRole("menuitemradio", { name: "Opus" })).toBeInTheDocument();
  });

  it("줄을 고르면 onValueChange 로 그 값이 올라온다", () => {
    const onValueChange = vi.fn();
    render(<Demo open onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Sonnet" }));

    expect(onValueChange).toHaveBeenCalledWith("sonnet");
  });

  it("value 로 준 줄만 checked 다", () => {
    render(<Demo open value="sonnet" />);

    expect(screen.getByRole("menuitemradio", { name: "Sonnet" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Opus" })).toHaveAttribute("aria-checked", "false");
  });

  // `Menu.test`와 같은 꼴 — `extra`를 `Content`에 바로 펼친다.
  const Shell = (extra: Record<string, unknown>) => (
    <Select open>
      <Select.Trigger>모델</Select.Trigger>
      <Select.Content {...extra}>
        <Select.Item value="opus">Opus</Select.Item>
      </Select.Content>
    </Select>
  );
  implementsClassName((extra) => <Shell {...extra} />);
  implementsDataComponent((extra) => <Shell {...extra} />, "Select");
  implementsRef((extra) => <Shell {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <Demo open />);
});
