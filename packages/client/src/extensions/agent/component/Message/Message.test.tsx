import { render, screen } from "@testing-library/react";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { Message } from "./Message";

describe("Message", () => {
  implementsClassName((extra) => <Message {...extra} author="user" />);
  implementsDataComponent((extra) => <Message {...extra} author="user" />, "Message");
  implementsRef<HTMLElement>((extra) => <Message {...extra} author="user" />, HTMLElement);
  implementsNoA11yViolations(() => <Message author="user">본문</Message>);

  it("role 에 따라 기본 아바타 이니셜과 라벨을 보여준다", () => {
    render(
      <Message author="agent" data-testid="message">
        안녕하세요
      </Message>,
    );
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("avatar 가 이미지 URL 이면 이미지로 렌더한다", () => {
    const { container } = render(
      <Message author="user" avatar="https://example.com/avatar.png">
        본문
      </Message>,
    );
    // 아바타 이미지는 장식 목적(`alt=""`)이라 접근성 트리에서 role="img"로 노출되지 않는다 —
    // `getByRole` 대신 DOM 쿼리로 직접 확인한다.
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("avatar 가 문자열/이미지가 아니면 그대로 렌더한다", () => {
    render(
      <Message author="user" avatar="X">
        본문
      </Message>,
    );
    expect(screen.getByText("X")).toBeInTheDocument();
  });

  it("timestamp 가 없으면 시각 대신 빈 자리를 유지한다", () => {
    render(<Message author="system">본문</Message>);
    expect(screen.queryByText(/\d{2}:\d{2}/u)).not.toBeInTheDocument();
  });

  it("children 을 본문으로 렌더한다", () => {
    render(<Message author="user">본문 내용</Message>);
    expect(screen.getByText("본문 내용")).toBeInTheDocument();
  });
});
