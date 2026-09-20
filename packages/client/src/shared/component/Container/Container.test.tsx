import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { Container } from "./Container";

describe("Container", () => {
  it("children 을 스크롤하는 원소 안에 렌더링하고 ref 도 거기에 넘긴다", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Container ref={ref}>content</Container>);

    expect(screen.getByText("content")).toBeInTheDocument();
    expect(ref.current).toContainElement(screen.getByText("content"));
  });

  implementsClassName((extra) => <Container {...extra}>content</Container>);
  implementsDataComponent((extra) => <Container {...extra}>content</Container>, "Container");
  implementsNoA11yViolations(() => <Container>content</Container>);
  implementsRef((extra) => <Container {...extra}>content</Container>, HTMLDivElement);

  it("chrome 을 data-chrome 으로 노출한다", () => {
    const { container } = render(<Container chrome="none">content</Container>);

    expect(container.querySelector('[data-chrome="none"]')).toBeInTheDocument();
  });

  describe('scroll="none"', () => {
    it("자르지 않는다 — overflow 를 켜지 않는 축이다", () => {
      const { container } = render(<Container scroll="none">content</Container>);

      expect(container.querySelector('[data-scroll="none"]')).toBe(screen.getByText("content"));
    });

    it("ref 를 그 원소에 직접 꽂는다", () => {
      const ref = createRef<HTMLDivElement>();

      render(
        <Container ref={ref} scroll="none">
          content
        </Container>,
      );

      expect(ref.current).toContainElement(screen.getByText("content"));
    });

    it('data-scroll="none" 을 노출한다', () => {
      const { container } = render(<Container scroll="none">content</Container>);

      expect(container.querySelector('[data-scroll="none"]')).toBeInTheDocument();
    });

    implementsClassName((extra) => (
      <Container scroll="none" {...extra}>
        content
      </Container>
    ));
    implementsDataComponent(
      (extra) => (
        <Container scroll="none" {...extra}>
          content
        </Container>
      ),
      "Container",
    );
    implementsNoA11yViolations(() => <Container scroll="none">content</Container>);
  });
});
