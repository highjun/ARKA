import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#lib/testing";
import { Text } from "./Text";

describe("Text", () => {
  implementsClassName((extra) => <Text {...extra} />);
  implementsDataComponent((extra) => <Text {...extra} />, "Text");
  implementsRef((extra) => <Text {...extra} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <Text>안내 문구</Text>);

  it('size="medium", tone="default" 가 기본값이다', () => {
    render(<Text>내용</Text>);

    expect(screen.getByText("내용")).toHaveAttribute("data-text-size", "medium");
    expect(screen.getByText("내용")).toHaveAttribute("data-text-tone", "default");
  });

  it("size, tone props 를 data 속성에 반영한다", () => {
    render(
      <Text size="small" tone="muted">
        내용
      </Text>,
    );

    expect(screen.getByText("내용")).toHaveAttribute("data-text-size", "small");
    expect(screen.getByText("내용")).toHaveAttribute("data-text-tone", "muted");
  });

  it.each(["small", "medium", "large"] as const)('size="%s" 를 받는다', (size) => {
    render(<Text size={size}>내용</Text>);

    expect(screen.getByText("내용")).toHaveAttribute("data-text-size", size);
  });

  it.each(["default", "muted", "danger"] as const)('tone="%s" 를 받는다', (tone) => {
    render(<Text tone={tone}>내용</Text>);

    expect(screen.getByText("내용")).toHaveAttribute("data-text-tone", tone);
  });
});
