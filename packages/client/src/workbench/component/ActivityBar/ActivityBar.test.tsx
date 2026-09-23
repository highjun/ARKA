import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { ActivityBar } from "./index";
import type { ActivityBarItem } from "./index";

const TOP: ActivityBarItem[] = [
  { id: "explorer", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
];

const BOTTOM: ActivityBarItem[] = [{ id: "settings", iconId: "settingsGear", title: "설정" }];

const bar = (extra: Record<string, unknown> = {}) => (
  <ActivityBar {...extra}>
    <ActivityBar.Top items={TOP} activeId="explorer" />
    <ActivityBar.Bottom items={BOTTOM} />
  </ActivityBar>
);

describe("ActivityBar", () => {
  it("이름표를 안 주면 `활동 막대`로 읽힌다 — 주면 그것을 쓴다", () => {
    const { rerender } = render(bar());
    expect(screen.getByRole("navigation", { name: "활동 막대" })).toBeInTheDocument();

    rerender(bar({ "aria-label": "왼쪽 막대" }));

    expect(screen.getByRole("navigation", { name: "왼쪽 막대" })).toBeInTheDocument();
  });

  implementsDataComponent((extra) => bar(extra), "ActivityBar");
  implementsClassName((extra) => bar(extra));
  implementsRef((extra) => bar(extra), HTMLElement);
  implementsNoA11yViolations(() => bar());
});

describe("ActivityBar.Top", () => {
  it("누르면 onItemClick 이 그 id 로 불린다", () => {
    const onItemClick = vi.fn();
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} onItemClick={onItemClick} />
      </ActivityBar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onItemClick).toHaveBeenCalledWith("search");
  });

  it("눌린 것은 최대 하나다 — activeId 하나가 정하고 aria-pressed 로 드러난다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} activeId="explorer" />
      </ActivityBar>,
    );

    expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
  });

  it("목록에 없는 activeId 면 아무것도 안 눌린다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} activeId="없는활동" />
      </ActivityBar>,
    );

    for (const item of TOP) {
      expect(screen.getByRole("button", { name: item.title })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("비제어면 제가 들고 있는다 — 누르면 눌리고, 같은 것을 다시 누르면 접힌다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} />
      </ActivityBar>,
    );
    const search = screen.getByRole("button", { name: "검색" });
    expect(search).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(search);
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
  });

  it("비제어는 defaultActiveId 에서 시작한다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} defaultActiveId="search" />
      </ActivityBar>,
    );

    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "true");
  });

  it("제어면 activeId 만 따른다 — 눌러도 제멋대로 안 바뀐다", () => {
    const onItemClick = vi.fn();
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} activeId="explorer" onItemClick={onItemClick} />
      </ActivityBar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(onItemClick).toHaveBeenCalledWith("search");
    expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "탐색기" })).toHaveAttribute("aria-pressed", "true");
  });

  implementsClassName((extra) => <ActivityBar.Top items={TOP} {...extra} />);
  implementsDataComponent((extra) => <ActivityBar.Top items={TOP} {...extra} />, "ActivityBar/Top");
  implementsRef((extra) => <ActivityBar.Top items={TOP} {...extra} />, HTMLDivElement);
});

describe("ActivityBar.Bottom", () => {
  it("눌린 상태가 없다 — aria-pressed 를 아예 안 단다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} activeId="settings" />
        <ActivityBar.Bottom items={BOTTOM} />
      </ActivityBar>,
    );

    expect(screen.getByRole("button", { name: "설정" })).not.toHaveAttribute("aria-pressed");
  });

  it("제 onItemClick 으로 간다 — 위와 통로가 따로다", () => {
    const onTop = vi.fn();
    const onBottom = vi.fn();
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} onItemClick={onTop} />
        <ActivityBar.Bottom items={BOTTOM} onItemClick={onBottom} />
      </ActivityBar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "설정" }));

    expect(onBottom).toHaveBeenCalledWith("settings");
    expect(onTop).not.toHaveBeenCalled();
  });

  it("아래 묶음을 안 넣으면 그 자리도 안 잡는다", () => {
    render(
      <ActivityBar>
        <ActivityBar.Top items={TOP} />
      </ActivityBar>,
    );

    expect(screen.queryByRole("button", { name: "설정" })).toBeNull();
  });

  implementsClassName((extra) => <ActivityBar.Bottom items={BOTTOM} {...extra} />);
  implementsDataComponent((extra) => <ActivityBar.Bottom items={BOTTOM} {...extra} />, "ActivityBar/Bottom");
  implementsRef((extra) => <ActivityBar.Bottom items={BOTTOM} {...extra} />, HTMLDivElement);
});
