import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#utils/testing";
import { CommandCenter } from "./CommandCenter";
import * as stories from "./CommandCenter.stories";

const { Default } = composeStories(stories);

describe("CommandCenter", () => {
  implementsClassName((extra) => <CommandCenter value="project" {...extra} />);
  implementsDataComponent((extra) => <CommandCenter value="project" {...extra} />, "CommandCenter");
  implementsRef((extra) => <CommandCenter value="project" {...extra} />, HTMLButtonElement);
  implementsNoA11yViolations(() => <CommandCenter value="project" />);

  it("`Default` 스토리는 값을 적는다", () => {
    render(<Default />);

    expect(screen.getByRole("button", { name: "명령 팔레트 열기" })).toHaveTextContent("project");
  });

  it("누르면 알린다 — 여는 것은 받는 쪽이 한다", () => {
    const onClick = vi.fn();
    render(<CommandCenter value="project" onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "명령 팔레트 열기" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("읽어 주는 이름은 값이 아니라 하는 일이다", () => {
    render(<CommandCenter value="project" />);

    expect(screen.queryByRole("button", { name: "project" })).not.toBeInTheDocument();
  });
});
