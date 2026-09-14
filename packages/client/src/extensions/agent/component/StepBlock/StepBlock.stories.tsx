import type { Meta, StoryObj } from "@storybook/react-vite";
import { StepBlock } from "./index";
import type { StepBlockThinkingProps, StepBlockToolProps } from "./index";

const meta = {
  title: "agent/StepBlock",
  component: StepBlock,
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
  // `kind`별 필드는 여기 두지 않는다 — 메타 args는 모든 스토리에 합쳐지므로 다른 kind로 새어 나간다.
  args: { status: "done", defaultExpanded: true },
} satisfies Meta<typeof StepBlock>;

export default meta;

/** props가 `kind` 판별 유니온이라 `StoryObj<typeof meta>`는 never로 무너진다 — kind별로 스토리 타입을 나눈다. */
type ThinkingStory = StoryObj<Meta<StepBlockThinkingProps>>;
type ToolStory = StoryObj<Meta<StepBlockToolProps>>;

const THINKING_SUMMARY = "빌드 로그를 보니 tsconfig의 paths와 vite alias가 어긋난다. 두 설정을 맞추면 해결될 것이다.";

export const Default: ThinkingStory = { args: { kind: "thinking", summary: THINKING_SUMMARY } };
export const ThinkingCollapsed: ThinkingStory = {
  args: { kind: "thinking", summary: THINKING_SUMMARY, defaultExpanded: false },
};
export const ThinkingRunning: ThinkingStory = {
  args: { kind: "thinking", summary: THINKING_SUMMARY, status: "running" },
};
/** 생각이 비어도 펼친다 — 비어 있다는 사실 자체가 보여줄 내용이다. */
export const ThinkingEmpty: ThinkingStory = { args: { kind: "thinking" } };
export const Tool: ToolStory = {
  args: { kind: "tool", toolId: "readFile", toolInput: { path: "src/main.ts" }, toolOutput: { ok: true, bytes: 1284 } },
};
export const ToolRunning: ToolStory = {
  args: { kind: "tool", toolId: "runTests", status: "running", toolInput: { filter: "contract" } },
};
export const ToolError: ToolStory = {
  args: {
    kind: "tool",
    toolId: "writeFile",
    status: "error",
    toolInput: { path: "src/missing/dir.ts" },
    toolOutput: { error: "ENOENT: no such file or directory" },
  },
};
/** 입력·출력이 둘 다 없으면 펼쳐지지 않는다. */
export const ToolNoBody: ToolStory = { args: { kind: "tool", toolId: "listFiles" } };
