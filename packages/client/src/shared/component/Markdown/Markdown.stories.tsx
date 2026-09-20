import type { Meta, StoryObj } from "@storybook/react-vite";
import { Markdown } from "./index";

const SOURCE = [
  "# 제목",
  "",
  "문단 하나. **굵게**, *기울임*, `인라인 코드`, [링크](https://example.com).",
  "",
  "- 목록 하나",
  "- 목록 둘",
  "  - 안쪽",
  "",
  "1. 번호 하나",
  "2. 번호 둘",
  "",
  "> 인용 한 줄.",
  "",
  "```typescript",
  "const greet = (name: string) => `안녕, ${name}`;",
  "export default greet;",
  "```",
  "",
  "| 열 | 뜻 |",
  "| --- | --- |",
  "| gfm | 표가 된다 |",
  "",
  "- [x] 끝난 일",
  "- [ ] 남은 일",
].join("\n");

const meta = {
  title: "00-shared/Markdown",
  component: Markdown,
  args: { source: SOURCE },
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CodeOnly: Story = {
  args: { source: ["```json", '{ "ok": true }', "```"].join("\n") },
};

export const RawHtmlIsText: Story = {
  args: { source: "<script>alert(1)</script> 뒤에 오는 문단." },
};

export const Empty: Story = { args: { source: "" } };
