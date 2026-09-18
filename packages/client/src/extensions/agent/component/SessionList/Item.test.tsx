import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { SessionListItem } from "./Item";

describe("SessionListItem", () => {
  implementsClassName((extra) => <SessionListItem title="세션" {...extra} />);
  implementsDataComponent((extra) => <SessionListItem title="세션" {...extra} />, "SessionList.Item");
  implementsRef<HTMLDivElement>((extra) => <SessionListItem title="세션" {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => (
    <div role="listbox" aria-label="Agent sessions">
      <SessionListItem title="세션" />
    </div>
  ));

  it('role="option" 과 aria-label 로 제목을 노출한다', () => {
    render(<SessionListItem title="결제 버그 조사" />);

    expect(screen.getByRole("option", { name: "결제 버그 조사" })).toBeInTheDocument();
  });

  it("isActive 가 aria-selected 에 그대로 반영된다", () => {
    render(<SessionListItem title="세션" isActive />);

    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true");
  });

  it("클릭하면 onSelect 가 호출된다", () => {
    const onSelect = vi.fn();
    render(<SessionListItem title="세션" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("option"));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("Enter/Space 로 선택된다", () => {
    const onSelect = vi.fn();
    render(<SessionListItem title="세션" onSelect={onSelect} />);
    const row = screen.getByRole("option");

    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });

    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("disabled 면 클릭·키보드 선택이 무시되고 tabIndex 가 -1, aria-disabled 가 true 다", () => {
    const onSelect = vi.fn();
    render(<SessionListItem title="세션" disabled onSelect={onSelect} />);
    const row = screen.getByRole("option");

    fireEvent.click(row);
    fireEvent.keyDown(row, { key: "Enter" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(row).toHaveAttribute("tabIndex", "-1");
    expect(row).toHaveAttribute("aria-disabled", "true");
  });

  it("unread 가 없거나 0 이하면 배지를 숨긴다", () => {
    const { rerender } = render(<SessionListItem title="세션" />);
    expect(screen.queryByText(/^\d+\+?$/u)).not.toBeInTheDocument();

    rerender(<SessionListItem title="세션" unread={0} />);
    expect(screen.queryByText(/^\d+\+?$/u)).not.toBeInTheDocument();
  });

  it('unread 가 99 를 넘으면 "99+" 로 캡핑된다', () => {
    render(<SessionListItem title="세션" unread={140} />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("unread 가 정상 범위면 그대로 표시된다", () => {
    render(<SessionListItem title="세션" unread={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("timestamp 가 없으면 타임스탬프 자리를 렌더하지 않는다", () => {
    const { container } = render(<SessionListItem title="세션" />);

    expect(container.querySelector("time")).not.toBeInTheDocument();
  });

  it("timestamp 가 있으면 상대 시각으로 렌더한다 — 포맷 규칙은 utils/time 테스트 책임", () => {
    const { container } = render(<SessionListItem title="세션" timestamp={Date.now() - 60_000} />);

    expect(container.querySelector("time")).toHaveTextContent("1분 전");
  });
});
