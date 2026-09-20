import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { languageOf, useCodeMirrorEditor } from "./useCodeMirrorEditor";

const Fixture = ({
  path,
  content,
  readOnly = true,
  onChange,
  onSave,
}: {
  readonly path: string;
  readonly content: string;
  readonly readOnly?: boolean;
  readonly onChange?: (content: string) => void;
  readonly onSave?: () => void;
}) => {
  const { hostRef } = useCodeMirrorEditor({ path, content, readOnly, onChange, onSave });
  return <div ref={hostRef} />;
};

describe("useCodeMirrorEditor", () => {
  it("CodeMirror 를 host 엘리먼트에 붙인다", () => {
    render(<Fixture path="a/b.ts" content="const a = 1;" />);

    expect(document.querySelector(".cm-content")).not.toBeNull();
  });

  it("내용을 그린다", () => {
    render(<Fixture path="a.ts" content="const answer = 42;" />);

    expect(screen.getByText(/answer/u)).toBeDefined();
  });

  it("내용이 바뀌면 새로 만들지 않고 갈아끼운다", () => {
    const { rerender } = render(<Fixture path="a.ts" content="first" />);
    rerender(<Fixture path="a.ts" content="second" />);

    expect(screen.getByText(/second/u)).toBeDefined();
    expect(screen.queryByText(/first/u)).toBeNull();
  });

  it("빈 파일도 다룬다", () => {
    render(<Fixture path="empty.txt" content="" />);

    expect(document.querySelector(".cm-content")).not.toBeNull();
  });

  it("활성 줄과 검색 패널을 위한 확장이 붙어 있다", () => {
    render(<Fixture path="a.ts" content={"const a = 1;\nconst b = 2;\n"} />);

    expect(document.querySelector(".cm-activeLine")).not.toBeNull();
    expect(document.querySelector(".cm-gutters")).not.toBeNull();
  });

  it("코드 접기/펼치기 거터가 붙어 있다", () => {
    render(<Fixture path="a.ts" content={"function f() {\n  return 1;\n}\n"} />);

    expect(document.querySelector(".cm-foldGutter")).not.toBeNull();
  });

  it("기본은 읽기 전용이다", () => {
    render(<Fixture path="a.ts" content="const a = 1;" readOnly={true} />);

    const content = document.querySelector(".cm-content");
    expect(content?.getAttribute("contenteditable")).toBe("false");
  });

  it("readOnly=false 면 편집 가능한 DOM 이 된다", () => {
    render(<Fixture path="a.ts" content="const a = 1;" readOnly={false} onChange={() => {}} />);

    const content = document.querySelector(".cm-content");
    expect(content?.getAttribute("contenteditable")).toBe("true");
  });

  it("readOnly 가 바뀌어도 에디터 DOM 을 다시 만들지 않는다", () => {
    const { rerender } = render(<Fixture path="a.ts" content="const a = 1;" readOnly={true} />);
    const before = document.querySelector(".cm-editor");
    expect(before).not.toBeNull();

    rerender(<Fixture path="a.ts" content="const a = 1;" readOnly={false} onChange={() => {}} />);
    const after = document.querySelector(".cm-editor");

    expect(after).toBe(before);
    expect(after?.querySelector(".cm-content")?.getAttribute("contenteditable")).toBe("true");
  });
});

describe("languageOf", () => {
  it("흔한 확장자를 문법으로 옮긴다", () => {
    expect(languageOf("a.ts")).toBe("typescript");
    expect(languageOf("a.tsx")).toBe("tsx");
    expect(languageOf("a.js")).toBe("javascript");
    expect(languageOf("a.json")).toBe("json");
    expect(languageOf("README.md")).toBe("markdown");
    expect(languageOf("a.py")).toBe("python");
  });

  it("경로가 붙어 있어도 파일명만 본다", () => {
    expect(languageOf("projects/dev-kit/STATUS.md")).toBe("markdown");
  });

  it("대소문자를 가리지 않는다", () => {
    expect(languageOf("A.TS")).toBe("typescript");
  });

  it("모르는 확장자는 undefined — 강조 없이 그냥 보여준다", () => {
    expect(languageOf("a.rs")).toBeUndefined();
    expect(languageOf("LICENSE")).toBeUndefined();
  });

  it("점으로 시작하는 이름은 확장자로 치지 않는다", () => {
    expect(languageOf(".gitignore")).toBeUndefined();
  });
});
