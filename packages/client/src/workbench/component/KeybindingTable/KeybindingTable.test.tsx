import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { KeybindingTable } from "./KeybindingTable";

const ROWS = [
  { id: "1", keys: ["Ctrl", "B"], label: "사이드바 토글", commandId: "workbench.action.toggleSidebar" },
  { id: "2", keys: ["F2"], label: "이름 바꾸기", commandId: "filesystem.rename" },
];

/** 표의 구조와 키 표시가 계약대로인지 본다. */
describe("KeybindingTable", () => {
  it("줄마다 키·이름·id 를 그린다", () => {
    render(<KeybindingTable rows={ROWS} />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("사이드바 토글")).toBeInTheDocument();
    expect(screen.getByText("filesystem.rename")).toBeInTheDocument();
  });

  it("키를 kbd 로 하나씩 그린다 — 키보드 입력의 정본 태그다", () => {
    const { container } = render(<KeybindingTable rows={ROWS} />);

    const keys = [...container.querySelectorAll("kbd")].map((node) => node.textContent);
    expect(keys).toEqual(["Ctrl", "B", "F2"]);
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
