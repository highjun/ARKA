import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { ChangeList } from "./ChangeList";

const ENTRIES = [
  { path: "a.ts", badge: "M" },
  { path: "b.ts", badge: "A" },
];
const action = { label: "스테이지", iconId: "add" as const, onAll: () => undefined, onOne: () => undefined };

/** 행을 고르는 것과 동작 버튼이 계약대로 동작하는지 본다. */
describe("ChangeList", () => {
  it("행을 entries 만큼 그리고 상태표를 data-badge 로 드러낸다", () => {
    render(<ChangeList heading="변경 사항" entries={ENTRIES} action={action} onSelect={() => undefined} />);

    // Primer 는 머리글도 `li`로 감싸므로 행 수를 listitem 으로 세지 않는다.
    expect(screen.getByText("a.ts")).toBeInTheDocument();
    expect(screen.getByText("b.ts")).toBeInTheDocument();
    expect(screen.getByText("M")).toHaveAttribute("data-badge", "M");
  });

  it("행을 고르면 그 행을 준다", () => {
    const onSelect = vi.fn();
    render(<ChangeList heading="변경 사항" entries={ENTRIES} action={action} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("a.ts"));

    expect(onSelect).toHaveBeenCalledWith({ path: "a.ts", badge: "M" });
  });

  it("행의 동작 버튼은 그 경로만 넘기고 행 선택을 부르지 않는다", () => {
    const onSelect = vi.fn();
    const onOne = vi.fn();
    render(<ChangeList heading="변경 사항" entries={ENTRIES} action={{ ...action, onOne }} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "b.ts 스테이지" }));

    expect(onOne).toHaveBeenCalledWith("b.ts");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("머리글 버튼은 전체에 적용한다", () => {
    const onAll = vi.fn();
    render(
      <ChangeList heading="변경 사항" entries={ENTRIES} action={{ ...action, onAll }} onSelect={() => undefined} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "변경 사항 전부 스테이지" }));

    expect(onAll).toHaveBeenCalledOnce();
  });

  it("행이 없으면 전체 적용 버튼이 안 뜬다", () => {
    render(<ChangeList heading="변경 사항" entries={[]} action={action} onSelect={() => undefined} />);

    expect(screen.queryByRole("button", { name: "변경 사항 전부 스테이지" })).not.toBeInTheDocument();
  });

  implementsClassName((extra) => (
    <ChangeList heading="변경" entries={ENTRIES} action={action} onSelect={() => undefined} {...extra} />
  ));
  implementsDataComponent(
    (extra) => <ChangeList heading="변경" entries={ENTRIES} action={action} onSelect={() => undefined} {...extra} />,
    "ChangeList",
  );
  implementsRef<HTMLUListElement>(
    (extra) => <ChangeList heading="변경" entries={ENTRIES} action={action} onSelect={() => undefined} {...extra} />,
    HTMLUListElement,
  );
  implementsNoA11yViolations(() => (
    <ChangeList heading="변경" entries={ENTRIES} action={action} onSelect={() => undefined} />
  ));
});
