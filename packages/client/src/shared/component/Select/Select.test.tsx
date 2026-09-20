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
    <Select.Trigger value="모델" />
    <Select.Content>
      <Select.Item value="opus">Opus</Select.Item>
      <Select.Item value="sonnet">Sonnet</Select.Item>
    </Select.Content>
  </Select>
);

describe("Select", () => {
  it("트리거를 누르면 열린다(비제어)", () => {
    render(<Demo />);

    expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument();
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

  it("selected 를 주면 루트 값과 상관없이 그 줄의 checked 가 정해진다", () => {
    render(
      <Select open value="opus">
        <Select.Trigger value="모델" />
        <Select.Content>
          <Select.Item value="opus" selected={false}>
            Opus
          </Select.Item>
        </Select.Content>
      </Select>,
    );

    expect(screen.getByRole("menuitemradio", { name: "Opus" })).toHaveAttribute("aria-checked", "false");
  });

  it("트리거에 value 를 안 주면 루트가 든 값을 적는다", () => {
    render(
      <Select value="sonnet">
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="sonnet">Sonnet</Select.Item>
        </Select.Content>
      </Select>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("sonnet");
  });

  const Shell = (extra: Record<string, unknown>) => (
    <Select open>
      <Select.Trigger value="모델" />
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
