import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsNoA11yViolations,
  implementsRef,
} from "#utils/testing";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("문단·강조·목록을 요소로 그린다", () => {
    render(<Markdown source={"**굵게** 그리고 보통\n\n- 하나\n- 둘"} />);

    expect(screen.getByText("굵게").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("GFM 표와 체크박스를 그린다 — remark-gfm 이 켜져 있다", () => {
    render(<Markdown source={"| 열 |\n| --- |\n| 값 |\n\n- [x] 끝"} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("펜스 코드는 CodeBlock 으로 그린다 — 복사 버튼이 함께 온다", () => {
    render(<Markdown source={"```typescript\nconst a = 1;\n```"} />);

    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("인라인 코드는 CodeBlock 이 아니라 code 원소다", () => {
    render(<Markdown source={"`foo` 는 인라인이다"} />);

    expect(screen.getByText("foo").tagName).toBe("CODE");
    expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();
  });

  it("원문 HTML 을 실행하지 않는다 — 태그가 글자로 남는다", () => {
    const { container } = render(<Markdown source={"<script>alert(1)</script> 뒤 문단"} />);

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/alert\(1\)/u)).toBeInTheDocument();
  });

  implementsClassName((extra) => <Markdown source="본문" {...extra} />);
  implementsDataComponent((extra) => <Markdown source="본문" {...extra} />, "Markdown");
  implementsRef<HTMLDivElement>((extra) => <Markdown source="본문" {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <Markdown source={"# 제목\n\n문단"} />);
});
