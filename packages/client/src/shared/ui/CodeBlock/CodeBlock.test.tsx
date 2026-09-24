import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#lib/testing";
import { CodeBlock } from "./CodeBlock";

describe("CodeBlock", () => {
  describe("Markup", () => {
    it("모든 줄에 번호를 붙이고 구문 토큰에 data-token 을 단다", () => {
      const { container } = render(
        <CodeBlock content={"const x = 1;\nreturn x;"} language="ts" fileName="example.ts" />,
      );

      expect(screen.getByText("ts")).toBeInTheDocument();
      expect(screen.getByText("example.ts")).toBeInTheDocument();
      expect(container.querySelector('[data-language="ts"]')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-token="keyword"]').length).toBeGreaterThan(0);
    });

    it('language 를 생략하면 "text" 가 기본값이다', () => {
      render(<CodeBlock content="hello" />);

      expect(screen.getByText("text")).toBeInTheDocument();
    });

    implementsClassName((extra) => <CodeBlock content="hello" {...extra} />);
    implementsDataComponent((extra) => <CodeBlock content="hello" {...extra} />, "CodeBlock");
    implementsRef((extra) => <CodeBlock content="hello" {...extra} />, HTMLElement);
    implementsNoA11yViolations(() => <CodeBlock content="const x = 1;" language="ts" />);
  });

  describe("State", () => {
    it("복사 버튼을 누르면 복사됨 상태가 되었다가 다시 원래대로 돌아온다", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });

      render(<CodeBlock content="code" language="ts" />);

      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

      await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
      expect(writeText).toHaveBeenCalledWith("code");

      await waitFor(() => expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument(), {
        timeout: 2000,
      });
      vi.unstubAllGlobals();
    });
  });
});
