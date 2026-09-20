import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { Sidebar } from "./Sidebar";
import * as stories from "./Sidebar.stories";

/**
 * 스토리를 그대로 가져다 단정한다(→ ADR 0010). 그림과 테스트가 **같은 입력**을 보므로, 스토리가
 * 낡으면 테스트가 알려준다 — 값을 두 곳에 적어 두면 한쪽만 고쳐지는 일이 생긴다.
 */
const { Compact, NoHeader } = composeStories(stories);

describe("Sidebar", () => {
  implementsClassName((extra) => <Sidebar {...extra}>content</Sidebar>);
  implementsDataComponent((extra) => <Sidebar {...extra}>content</Sidebar>, "Sidebar");
  implementsRef((extra) => <Sidebar {...extra}>content</Sidebar>, HTMLDivElement);
  implementsNoA11yViolations(() => (
    <Sidebar>
      <Sidebar.Header title="Sessions" actions={<button type="button">더 보기</button>} />
      <Sidebar.Body>content</Sidebar.Body>
    </Sidebar>
  ));

  it("`NoHeader` 스토리는 머리 행을 그리지 않는다", () => {
    const { container } = render(<NoHeader />);

    expect(container.querySelector("header")).toBeNull();
  });

  it("`Compact` 스토리는 `data-density`에 compact를 싣는다", () => {
    render(<Compact />);

    expect(screen.getByText("탐색기").closest('[data-component="Sidebar"]')).toHaveAttribute("data-density", "compact");
  });

  it("본문을 렌더한다", () => {
    render(
      <Sidebar>
        <Sidebar.Body>본문 내용</Sidebar.Body>
      </Sidebar>,
    );

    expect(screen.getByText("본문 내용")).toBeInTheDocument();
  });

  it("title과 actions를 둘 다 넘기면 머리에 함께 뜬다", () => {
    render(
      <Sidebar>
        <Sidebar.Header title="Sessions" actions={<button type="button">더 보기</button>} />
        <Sidebar.Body>본문</Sidebar.Body>
      </Sidebar>,
    );

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });

  it("title만 넘기면 actions 없이 머리가 뜬다", () => {
    render(
      <Sidebar>
        <Sidebar.Header title="Sessions" />
      </Sidebar>,
    );

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("title과 actions가 둘 다 없으면 머리 자체가 안 뜬다", () => {
    const { container } = render(
      <Sidebar>
        <Sidebar.Header />
        <Sidebar.Body>본문</Sidebar.Body>
      </Sidebar>,
    );

    expect(container.querySelector("header")).not.toBeInTheDocument();
  });

  it("밀도를 data-density 로 드러낸다 — 값마다 어느 크기를 쓸지는 CSS가 고른다", () => {
    const { container } = render(<Sidebar density="compact">본문</Sidebar>);

    expect(container.querySelector('[data-density="compact"]')).toBeInTheDocument();
  });

  it("밀도를 안 주면 comfortable 이다", () => {
    const { container } = render(<Sidebar>본문</Sidebar>);

    expect(container.querySelector('[data-density="comfortable"]')).toBeInTheDocument();
  });

  it("부품은 제 `data-component`를 싣는다 — 그림의 부품 이름과 같은 말이다", () => {
    const { container } = render(
      <Sidebar>
        <Sidebar.Header title="Sessions" />
        <Sidebar.Body>본문</Sidebar.Body>
      </Sidebar>,
    );

    expect(container.querySelector('[data-component="Sidebar/Header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-component="Sidebar/Body"]')).toBeInTheDocument();
  });
});
