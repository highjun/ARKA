import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { KeybindingTable } from "./KeybindingTable";
import type { KeybindingRow } from "./KeybindingTable";

const ROWS: KeybindingRow[] = [
  { actionId: "workbench.action.toggleSidebar", label: "사이드바 토글", keybinding: "ctrl+b", isConflicting: false },
  { actionId: "filesystem.rename", label: "이름 바꾸기", keybinding: "f2", isConflicting: false },
];

/** 표의 구조와 키 표시가 계약대로인지 본다. */
describe("KeybindingTable", () => {
  it("줄마다 키·이름·id 를 그린다", () => {
    render(<KeybindingTable rows={ROWS} />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("사이드바 토글")).toBeInTheDocument();
    expect(screen.getByText("filesystem.rename")).toBeInTheDocument();
  });

  it("키를 `+`로 갈라 kbd 로 하나씩 그린다 — 첫 글자를 올려 적는다", () => {
    const { container } = render(<KeybindingTable rows={ROWS} />);

    const keys = [...container.querySelectorAll("kbd")].map((node) => node.textContent);
    expect(keys).toEqual(["Ctrl", "B", "F2"]);
  });

  it("충돌하는 줄은 표시가 붙는다", () => {
    render(<KeybindingTable rows={[{ ...ROWS[0]!, isConflicting: true }]} />);

    expect(screen.getByText("충돌")).toBeInTheDocument();
    expect(screen.getAllByRole("row")[1]).toHaveAttribute("data-conflicting", "");
  });

  it("줄이 없으면 머리만 남는다", () => {
    render(<KeybindingTable rows={[]} />);

    expect(screen.getAllByRole("row")).toHaveLength(1);
  });

  implementsClassName((extra) => <KeybindingTable rows={ROWS} {...extra} />);
  implementsDataComponent((extra) => <KeybindingTable rows={ROWS} {...extra} />, "KeybindingTable");
  implementsRef<HTMLTableElement>((extra) => <KeybindingTable rows={ROWS} {...extra} />, HTMLTableElement);
  implementsNoA11yViolations(() => <KeybindingTable rows={ROWS} />);
});
