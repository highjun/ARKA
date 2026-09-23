import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { TitleBar } from "./TitleBar";
import * as stories from "./TitleBar.stories";

const { Default } = composeStories(stories);

describe("TitleBar", () => {
  implementsClassName((extra) => <TitleBar {...extra} />);
  implementsDataComponent((extra) => <TitleBar {...extra} />, "TitleBar");
  implementsRef((extra) => <TitleBar {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <TitleBar brand="ARKA" actions={<button type="button">알림</button>} />);

  it("`Default` 스토리는 세 자리를 다 그린다", () => {
    render(<Default />);

    expect(screen.getByText("ARKA")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "명령 팔레트 열기" })).toBeInTheDocument();
    expect(screen.getByText("2026-09-20 11:18(a1b2c3d)")).toBeInTheDocument();
  });

  it("가운데를 비워도 좌우가 남는다", () => {
    render(<TitleBar brand="ARKA" actions={<button type="button">알림</button>} />);

    expect(screen.getByText("ARKA")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "명령 팔레트 열기" })).not.toBeInTheDocument();
  });

  it("세 자리를 다 안 줘도 그려진다", () => {
    const { container } = render(<TitleBar />);

    expect(container.querySelector('[data-component="TitleBar"]')).toBeInTheDocument();
  });
});
