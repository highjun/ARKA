import { createRef } from "react";
import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "#lib/axe";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#lib/testing";
import { Menu } from "./Menu";

const Demo = (
  props: Omit<ComponentProps<typeof Menu>, "children"> & {
    readonly contentProps?: Partial<ComponentProps<typeof Menu.Content>>;
  },
) => (
  <Menu {...props}>
    <Menu.Trigger>더보기</Menu.Trigger>
    <Menu.Content {...props.contentProps}>
      <Menu.Item>새 파일</Menu.Item>
    </Menu.Content>
  </Menu>
);

describe("Menu", () => {
  it("opens the menu on trigger click(비제어)", () => {
    render(<Demo />);

    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "더보기" }), { button: 0 });

    expect(screen.getByRole("menuitem", { name: "새 파일" })).toBeInTheDocument();
  });

  it("open=false 로 제어하면 클릭해도 안 열린다", () => {
    render(<Demo open={false} />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "더보기" }), { button: 0 });

    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("open=true 로 제어하면 항상 열려 있다", () => {
    render(<Demo open />);

    expect(screen.getByRole("menuitem", { name: "새 파일" })).toBeInTheDocument();
  });

  it("asChild 를 켜면 트리거 자신의 태그 없이 자식(button)에 속성만 병합한다", () => {
    render(
      <Menu>
        <Menu.Trigger asChild>
          <button type="button">커스텀 버튼</button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>,
    );

    const trigger = screen.getByRole("button", { name: "커스텀 버튼" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.querySelector("button")).toBeNull();
  });

  implementsDataComponent(
    (extra) => (
      <Menu open>
        <Menu.Trigger>더보기</Menu.Trigger>
        <Menu.Content {...extra}>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
    "Menu",
  );

  implementsClassName((extra) => (
    <Menu open>
      <Menu.Trigger>더보기</Menu.Trigger>
      <Menu.Content {...extra}>
        <Menu.Item>새 파일</Menu.Item>
      </Menu.Content>
    </Menu>
  ));

  implementsRef(
    (extra) => (
      <Menu open>
        <Menu.Trigger>더보기</Menu.Trigger>
        <Menu.Content {...extra}>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
    HTMLDivElement,
  );

  it("ref 로 Content DOM 노드에 접근할 수 있다", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <Menu open>
        <Menu.Trigger>더보기</Menu.Trigger>
        <Menu.Content ref={ref}>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>,
    );

    expect(ref.current).toBe(screen.getByRole("menu"));
  });

  implementsNoA11yViolations(() => <Demo open />);

  it("axe 접근성 위반이 없다(Portal로 빠져나간 실제 내용)", async () => {
    render(<Demo open />);

    await expectNoA11yViolations(document.body);
  });

  describe('kind="context"', () => {
    it("우클릭으로 열린다(비제어)", () => {
      render(<Demo kind="context" />);

      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();

      fireEvent.contextMenu(screen.getByText("더보기"));

      expect(screen.getByRole("menuitem", { name: "새 파일" })).toBeInTheDocument();
    });

    it("open=false 로 제어하면 우클릭해도 안 열린다", () => {
      render(<Demo kind="context" open={false} />);

      fireEvent.contextMenu(screen.getByText("더보기"));

      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });

    it("open=true 로 제어하면 항상 열려 있다", () => {
      render(<Demo kind="context" open />);

      expect(screen.getByRole("menuitem", { name: "새 파일" })).toBeInTheDocument();
    });

    it("defaultOpen 이 비제어 시작값이 된다", () => {
      render(<Demo kind="context" defaultOpen />);

      expect(screen.getByRole("menuitem", { name: "새 파일" })).toBeInTheDocument();
    });

    it("Content 에 kind 가 data 속성으로 실린다 — CSS가 폭을 그것으로 가른다", () => {
      render(<Demo kind="context" open />);

      expect(screen.getByRole("menu")).toHaveAttribute("data-kind", "context");
    });

    implementsNoA11yViolations(() => <Demo kind="context" open />);
  });
});
