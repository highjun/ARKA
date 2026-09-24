import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#lib/testing";
import { TitleBar } from "./index";
import * as stories from "./TitleBar.stories";

const { Default } = composeStories(stories);

describe("TitleBar", () => {
  implementsClassName((extra) => <TitleBar brandName="ARKA" {...extra} />);
  implementsDataComponent((extra) => <TitleBar brandName="ARKA" {...extra} />, "TitleBar");
  implementsRef((extra) => <TitleBar brandName="ARKA" {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <TitleBar brandName="ARKA" onNotificationsOpen={() => undefined} />);

  it("`Default` 스토리는 제품 이름·빌드 표시·진입구를 다 그린다", () => {
    render(<Default />);

    expect(screen.getByText("ARKA")).toBeInTheDocument();
    expect(screen.getByText("2026-09-20 11:18")).toBeInTheDocument();
    expect(screen.getByText("a1b2c3d")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "명령 팔레트 열기" }).length).toBe(2);
  });

  it("이름만 줘도 그려진다 — 콜백을 안 준 자리는 비운다", () => {
    render(<TitleBar brandName="ARKA" />);

    expect(screen.getByText("ARKA")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "알림" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /사이드바/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /아래 창/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /전환/u })).not.toBeInTheDocument();
  });

  it("마크는 줄 때만 그리고 읽어 주지 않는다", () => {
    const { container, rerender } = render(<TitleBar brandName="ARKA" />);
    expect(container.querySelector("img")).toBeNull();

    rerender(<TitleBar brandName="ARKA" brandIconSrc="/arka-mark.svg" />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});

describe("TitleBar — 팔레트", () => {
  it("진입구는 문구와 단축키를 적고, 누르면 열어 달라고 알린다", () => {
    const onPaletteOpenChange = vi.fn();
    render(<TitleBar brandName="ARKA" paletteKeybinding="ctrl+k" onPaletteOpenChange={onPaletteOpenChange} />);

    const field = screen.getAllByRole("button", { name: "명령 팔레트 열기" })[0]!;
    expect(field).toHaveTextContent("커맨드 검색...");
    expect(screen.getByText("Ctrl")).toBeInTheDocument();

    fireEvent.click(field);

    expect(onPaletteOpenChange).toHaveBeenCalledWith(true);
  });

  it("열려 있으면 다이얼로그에 항목이 뜬다", () => {
    render(
      <TitleBar brandName="ARKA" paletteOpen paletteRows={[{ id: "a", label: "새 파일", keybinding: "ctrl+n" }]} />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("새 파일")).toBeInTheDocument();
  });
});

describe("TitleBar — 빌드 표시", () => {
  it("시각과 SHA를 두 줄로 적고 한 줄로 합쳐 title 에 남긴다", () => {
    const { container } = render(<TitleBar brandName="ARKA" buildTimestamp="2026-09-20 11:18" buildSha="a1b2c3d" />);

    expect(container.querySelector('[data-component="TitleBar/Build"]')).toHaveAttribute(
      "title",
      "2026-09-20 11:18 (a1b2c3d)",
    );
  });

  it("시각이 없으면 아예 안 그린다", () => {
    const { container } = render(<TitleBar brandName="ARKA" />);

    expect(container.querySelector('[data-component="TitleBar/Build"]')).toBeNull();
  });
});

describe("TitleBar — 알림", () => {
  it("안 읽은 수를 이름과 배지로 알린다", () => {
    const onNotificationsOpen = vi.fn();
    const { rerender } = render(<TitleBar brandName="ARKA" onNotificationsOpen={onNotificationsOpen} />);
    expect(screen.getByRole("button", { name: "알림" })).toBeInTheDocument();

    rerender(<TitleBar brandName="ARKA" notificationCount={3} onNotificationsOpen={onNotificationsOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "안 읽은 알림 3건" }));

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(onNotificationsOpen).toHaveBeenCalledOnce();
  });
});

describe("TitleBar — 토글 셋", () => {
  it("사이드바 토글 하나가 여닫는다 — 보이면 눌린 꼴이고 이름이 닫기로 바뀐다", () => {
    const onSidebarToggle = vi.fn();
    const { rerender } = render(<TitleBar brandName="ARKA" onSidebarToggle={onSidebarToggle} />);
    expect(screen.getByRole("button", { name: "사이드바 열기" })).toHaveAttribute("aria-pressed", "false");

    rerender(<TitleBar brandName="ARKA" sidebarVisible onSidebarToggle={onSidebarToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "사이드바 닫기" }));

    expect(screen.getByRole("button", { name: "사이드바 닫기" })).toHaveAttribute("aria-pressed", "true");
    expect(onSidebarToggle).toHaveBeenCalledOnce();
  });

  it("아래 창 토글도 같은 꼴이다", () => {
    const onBottomToggle = vi.fn();
    render(<TitleBar brandName="ARKA" bottomOpen onBottomToggle={onBottomToggle} />);

    const button = screen.getByRole("button", { name: "아래 창 닫기" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);

    expect(onBottomToggle).toHaveBeenCalledOnce();
  });

  it("테마 토글은 지금 모드를 눌린 꼴로 알린다", () => {
    const onColorModeToggle = vi.fn();
    render(<TitleBar brandName="ARKA" colorMode="dark" onColorModeToggle={onColorModeToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "밝게 전환" }));

    expect(onColorModeToggle).toHaveBeenCalledOnce();
  });
});
