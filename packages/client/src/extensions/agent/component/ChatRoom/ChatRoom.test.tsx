import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { ChatRoom } from "./ChatRoom";
import type { ChatRoomMessage } from "./ChatRoom";

const MESSAGES: ChatRoomMessage[] = [
  { id: "m1", author: "user", content: "안녕하세요" },
  { id: "m2", author: "agent", content: "무엇을 도와드릴까요?" },
];

describe("ChatRoom", () => {
  implementsClassName((extra) => <ChatRoom {...extra} />);
  implementsDataComponent((extra) => <ChatRoom {...extra} />, "ChatRoom");
  implementsRef<HTMLElement>((extra) => <ChatRoom {...extra} />, HTMLElement);
  implementsNoA11yViolations(() => <ChatRoom />);

  it("messages를 로그 영역에 순서대로 렌더한다", () => {
    render(<ChatRoom messages={MESSAGES} />);
    const log = screen.getByRole("log");

    expect(log).toHaveTextContent("안녕하세요");
    expect(log).toHaveTextContent("무엇을 도와드릴까요?");
  });

  it("messages가 비어 있으면 emptyLabel을 보여준다", () => {
    render(<ChatRoom messages={[]} emptyLabel="대화를 시작해보세요." />);

    expect(screen.getByText("대화를 시작해보세요.")).toBeInTheDocument();
  });

  it("children을 넘기면 messages 대신 그 children을 렌더한다", () => {
    render(
      <ChatRoom messages={MESSAGES}>
        <div>커스텀 로그</div>
      </ChatRoom>,
    );

    expect(screen.getByText("커스텀 로그")).toBeInTheDocument();
    expect(screen.queryByText("안녕하세요")).not.toBeInTheDocument();
  });

  it("title과 status를 헤더에 반영한다", () => {
    render(<ChatRoom title="결제 오류 분석" status="error" />);

    expect(screen.getByText("결제 오류 분석")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "오류" })).toBeInTheDocument();
  });

  it("편집/보관/설정 버튼 클릭 시 각각의 콜백이 호출된다", () => {
    const onEdit = vi.fn();
    const onArchive = vi.fn();
    const onSetting = vi.fn();
    render(<ChatRoom onEdit={onEdit} onArchive={onArchive} onSetting={onSetting} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Chat settings" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onSetting).toHaveBeenCalledTimes(1);
  });

  it("actions를 넘기면 편집/보관/설정 기본 버튼 3개 대신 그 노드로 완전히 교체된다", () => {
    render(<ChatRoom actions={<button type="button">내보내기</button>} />);

    expect(screen.getByRole("button", { name: "내보내기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit chat" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive chat" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chat settings" })).not.toBeInTheDocument();
  });

  it("composer를 넘기면 기본 InputComposer 대신 그 노드를 렌더한다", () => {
    render(<ChatRoom composer={<div>커스텀 입력 영역</div>} />);

    expect(screen.getByText("커스텀 입력 영역")).toBeInTheDocument();
  });

  it("mode/defaultMode/onModeChange를 기본 InputComposer로 그대로 전달한다", () => {
    const onModeChange = vi.fn();
    render(<ChatRoom defaultMode="plan" onModeChange={onModeChange} />);

    expect(screen.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Action" }));

    expect(onModeChange).toHaveBeenCalledWith("action");
  });
});
