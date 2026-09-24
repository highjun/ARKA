import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#lib/testing";
import { TextEditor } from "./TextEditor";

describe("TextEditor", () => {
  implementsClassName((extra) => <TextEditor path="a.ts" content="const a = 1;" {...extra} />);
  implementsDataComponent((extra) => <TextEditor path="a.ts" content="const a = 1;" {...extra} />, "TextEditor");
  implementsRef<HTMLElement>((extra) => <TextEditor path="a.ts" content="const a = 1;" {...extra} />, HTMLElement);
  implementsNoA11yViolations(() => <TextEditor path="a.ts" content="const a = 1;" />);

  it("경로를 레이블과 머리글에 쓴다", () => {
    render(<TextEditor path="a/b.ts" content="const a = 1;" />);

    expect(screen.getByRole("region", { name: "a/b.ts" })).toBeDefined();
    expect(screen.getByText("a/b.ts")).toBeDefined();
  });

  it("chrome 을 data-chrome 속성으로 노출한다", () => {
    const { container } = render(<TextEditor path="a.ts" content="x" chrome="none" />);

    expect(container.querySelector('[data-component="TextEditor"]')).toHaveAttribute("data-chrome", "none");
  });

  it("검색 버튼이 항상 있다", () => {
    render(<TextEditor path="a.ts" content="const a = 1;" />);

    expect(screen.getByRole("button", { name: "파일 안에서 찾기" })).toBeDefined();
  });

  describe("저장", () => {
    it("읽기 전용이면 저장 버튼이 없다", () => {
      render(<TextEditor path="a.ts" content="const a = 1;" />);

      expect(screen.queryByRole("button", { name: /저장/u })).toBeNull();
    });

    it("편집 가능하면 저장 버튼이 있다", () => {
      render(<TextEditor path="a.ts" content="const a = 1;" readOnly={false} onChange={() => {}} />);

      expect(screen.getByRole("button", { name: "저장" })).toBeDefined();
    });

    it("저장할 게 없으면(isDirty=false) 저장 버튼이 잠긴다", () => {
      render(<TextEditor path="a.ts" content="x" readOnly={false} onChange={() => {}} isDirty={false} />);

      expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    });

    it("저장할 게 있으면(isDirty=true) 저장 버튼을 누를 수 있고 onSave 가 불린다", () => {
      const onSave = vi.fn();
      render(
        <TextEditor path="a.ts" content="x" readOnly={false} onChange={() => {}} onSave={onSave} isDirty={true} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "저장" }));

      expect(onSave).toHaveBeenCalledOnce();
    });

    it("저장 중이면 버튼이 잠기고 라벨이 바뀐다", () => {
      render(
        <TextEditor path="a.ts" content="x" readOnly={false} onChange={() => {}} isDirty={true} isSaving={true} />,
      );

      expect(screen.getByRole("button", { name: "저장하는 중" })).toBeDisabled();
    });
  });

  describe("로딩", () => {
    it("loading=false(기본)면 오버레이가 없다", () => {
      render(<TextEditor path="a.ts" content="x" />);

      expect(screen.queryByText("읽는 중")).toBeNull();
    });

    it("loading=true면 본문 위에 Circular Progress 오버레이가 뜬다", () => {
      render(<TextEditor path="a.ts" content="x" loading={true} />);

      expect(screen.getByText("읽는 중")).toBeInTheDocument();
    });
  });
});

describe("revealAt", () => {
  it("요청한 줄로 커서를 옮기고 같은 seq는 다시 적용하지 않는다", async () => {
    const { rerender } = render(
      <TextEditor path="a.ts" content={"one\ntwo\nthree"} revealAt={{ line: 2, column: 2, seq: 1 }} />,
    );
    const textbox = await screen.findByRole("textbox");
    expect(textbox.querySelector(".cm-activeLine")?.textContent).toBe("two");
    rerender(<TextEditor path="a.ts" content={"one\ntwo\nthree"} revealAt={{ line: 3, column: 1, seq: 2 }} />);
    expect(textbox.querySelector(".cm-activeLine")?.textContent).toBe("three");
  });

  it("내용이 늦게 와도 그 줄이 생기면 간다", async () => {
    const { rerender } = render(
      <TextEditor path="a.ts" content="" loading revealAt={{ line: 3, column: 1, seq: 1 }} />,
    );
    rerender(<TextEditor path="a.ts" content={"one\ntwo\nthree"} revealAt={{ line: 3, column: 1, seq: 1 }} />);
    const textbox = await screen.findByRole("textbox");
    expect(textbox.querySelector(".cm-activeLine")?.textContent).toBe("three");
  });
});
