import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { SessionList } from "./SessionList";
import type { AgentSession } from "./SessionList";

const SESSIONS: AgentSession[] = [
  { id: "a", title: "첫 세션" },
  { id: "b", title: "둘째 세션", disabled: true },
];

describe("SessionList", () => {
  implementsClassName((extra) => <SessionList sessions={SESSIONS} {...extra} />);
  implementsDataComponent((extra) => <SessionList sessions={SESSIONS} {...extra} />, "SessionList");
  implementsRef<HTMLDivElement>((extra) => <SessionList sessions={SESSIONS} {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <SessionList sessions={SESSIONS} />);

  describe("Markup", () => {
    it('세션 목록을 role="listbox"로 그린다', () => {
      render(<SessionList sessions={SESSIONS} />);

      expect(screen.getByRole("listbox", { name: "Agent sessions" })).toBeInTheDocument();
      expect(screen.getByText("첫 세션")).toBeInTheDocument();
    });

    it("세션이 없으면 안내 문구로 대체된다", () => {
      render(<SessionList sessions={[]} />);

      expect(screen.getByText("세션이 없습니다.")).toBeInTheDocument();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("emptyLabel을 커스터마이즈할 수 있다", () => {
      render(<SessionList sessions={[]} emptyLabel="비어 있음" />);

      expect(screen.getByText("비어 있음")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("세션을 클릭하면 선택을 알린다", () => {
      const onActiveChange = vi.fn();
      render(<SessionList sessions={SESSIONS} onActiveChange={onActiveChange} />);

      fireEvent.click(screen.getByText("첫 세션"));

      expect(onActiveChange).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    });

    it("disabled 세션은 클릭해도 선택되지 않는다", () => {
      const onActiveChange = vi.fn();
      render(<SessionList sessions={SESSIONS} onActiveChange={onActiveChange} />);

      fireEvent.click(screen.getByText("둘째 세션"));

      expect(onActiveChange).not.toHaveBeenCalled();
    });
  });

  describe("State", () => {
    it("defaultActiveId가 uncontrolled 시작값이 된다", () => {
      render(<SessionList sessions={SESSIONS} defaultActiveId="a" />);

      expect(screen.getByText("첫 세션").closest('[role="option"]')).toHaveAttribute("aria-selected", "true");
    });

    it("activeId를 넘기면(controlled) 클릭해도 onActiveChange 없이는 강조가 안 바뀐다", () => {
      render(<SessionList sessions={SESSIONS} activeId="a" />);

      fireEvent.click(screen.getByText("둘째 세션"));

      expect(screen.getByText("첫 세션").closest('[role="option"]')).toHaveAttribute("aria-selected", "true");
    });

    it("uncontrolled 모드에서 클릭한 세션이 활성 상태가 된다", () => {
      const sessions: AgentSession[] = [
        { id: "a", title: "첫 세션" },
        { id: "c", title: "셋째 세션" },
      ];
      render(<SessionList sessions={sessions} />);

      fireEvent.click(screen.getByText("셋째 세션"));

      expect(screen.getByText("셋째 세션").closest('[role="option"]')).toHaveAttribute("aria-selected", "true");
    });
  });
});
