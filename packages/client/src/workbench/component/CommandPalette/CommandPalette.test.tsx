import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { implementsDataComponent, implementsRef, implementsNoA11yViolations } from "#utils/testing";
import { CommandPalette } from "./CommandPalette";
import type { CommandRow } from "./CommandPalette";

const ROWS: CommandRow[] = [
  { id: "a", label: "새 파일", keybinding: "" },
  { id: "b", label: "새 폴더", keybinding: "" },
  { id: "c", label: "테마 전환", keybinding: "ctrl+j" },
];

/** 검색어는 제어다 — 타이핑을 보려면 바깥이 상태를 든다. */
const Typing = () => {
  const [query, setQuery] = useState("");
  return <CommandPalette open query={query} onQueryChange={setQuery} rows={ROWS} />;
};

describe("CommandPalette", () => {
  it("열려 있으면 입력창과 항목이 보인다", () => {
    render(<CommandPalette open query="" rows={ROWS} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("새 파일")).toBeInTheDocument();
    expect(screen.getByText("테마 전환")).toBeInTheDocument();
  });

  it("닫혀 있으면 아무것도 안 보인다", () => {
    render(<CommandPalette open={false} query="" rows={ROWS} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("항목을 고르면 그 id로 onSelect가 불린다", () => {
    const onSelect = vi.fn();
    render(<CommandPalette open query="" rows={ROWS} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("새 폴더"));

    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("입력하면 onQueryChange 가 불리고, 검색어와 맞는 게 없으면 그렇게 말한다", () => {
    render(<Typing />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "존재하지않는검색어" } });

    expect(screen.getByRole("combobox")).toHaveValue("존재하지않는검색어");
    expect(screen.getByText("결과가 없다.")).toBeInTheDocument();
  });

  it("keybinding 이 있으면 키마다 kbd 로 보인다 — 첫 글자를 올려 적는다", () => {
    render(<CommandPalette open query="" rows={ROWS} />);

    expect(screen.getByText("Ctrl").closest("kbd")).toBeInTheDocument();
    expect(screen.getByText("J").closest("kbd")).toBeInTheDocument();
    expect(document.querySelectorAll("kbd")).toHaveLength(2);
  });

  implementsDataComponent((extra) => <CommandPalette open query="" rows={ROWS} {...extra} />, "CommandPalette");

  // `implementsClassName`은 못 쓴다 — `className`은 `[cmdk-dialog]`에 실리는데,
  // `data-testid`(ref와 동일)는 `[cmdk-root]`에 실려 서로 다른 노드다(ui/test-implements-helpers,
  // 의도된 예외 — draft 상태라 warn에 머문다).
  it("넘긴 className 을 그대로 싣는다", () => {
    render(<CommandPalette open query="" rows={ROWS} className="extra" />);

    expect(document.querySelector("[cmdk-dialog]")?.className).toContain("extra");
  });

  implementsRef((extra) => <CommandPalette open query="" rows={ROWS} {...extra} />, HTMLDivElement);

  implementsNoA11yViolations(() => <CommandPalette open query="" rows={ROWS} />);
});
