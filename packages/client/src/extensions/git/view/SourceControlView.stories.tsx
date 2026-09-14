import { createContainer, singleton } from "#core/di";
import { ViewModelProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SourceControlViewModelToken } from "../viewmodel/ISourceControlViewModel";
import type { ChangeRow, ISourceControlViewModel } from "../viewmodel/ISourceControlViewModel";
import { SourceControlView } from "./SourceControlView";

/** 고정된 VM을 꽂는다 — 실물은 마운트에 `git status`를 읽어서 VRT가 찍는 그림이 워크스페이스에 따라 달라진다. */
const viewModel = (state: Partial<ISourceControlViewModel>): ISourceControlViewModel => ({
  onMount: () => undefined,
  onDispose: () => undefined,
  repository: true,
  branch: "restructure/client-microkernel-prestage",
  loading: false,
  staged: [],
  unstaged: [],
  message: "",
  canCommit: false,
  failure: null,
  lastCommit: null,
  refresh: () => undefined,
  setMessage: () => undefined,
  stage: () => undefined,
  unstage: () => undefined,
  stageAll: () => undefined,
  unstageAll: () => undefined,
  commit: () => undefined,
  openDiff: () => undefined,
  diffOf: () => ({ loading: false, text: "", failure: null }),
  ...state,
});

const meta = {
  title: "git/SourceControlView",
  component: SourceControlView,
  args: { onOpenTab: () => undefined },
} satisfies Meta<typeof SourceControlView>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (state: Partial<ISourceControlViewModel>): Story => ({
  decorators: [
    (Story) => {
      const container = createContainer("story");
      container.register(
        SourceControlViewModelToken,
        singleton(() => viewModel(state)),
      );
      return (
        <ViewModelProvider container={container.createScope("view")}>
          <div style={{ height: 520, width: 320 }}>
            <Story />
          </div>
        </ViewModelProvider>
      );
    },
  ],
});

const STAGED: readonly ChangeRow[] = [
  { path: "CONVENTIONS.md", badge: "M", staged: true },
  { path: "docs/REVIEW_CHECKLIST.md", badge: "A", staged: true },
];
const UNSTAGED: readonly ChangeRow[] = [
  { path: "packages/client/.storybook/main.ts", badge: "M", staged: false },
  { path: "packages/client/src/extensions/git/view/SourceControlView.tsx", badge: "M", staged: false },
  { path: "docs/USER_NOTE.md", badge: "D", staged: false },
];

export const Default: Story = story({
  staged: STAGED,
  unstaged: UNSTAGED,
  message: "소스 제어 패널에 스토리를 붙인다",
  canCommit: true,
});

/** 저장소이긴 한데 바뀐 것이 없을 때 — "변경 없음"이 뜬다. */
export const Empty: Story = story({});

export const Loading: Story = story({ loading: true, staged: STAGED });

export const Error: Story = story({ unstaged: UNSTAGED, failure: "fatal: not a valid object name HEAD" });

/** 워크스페이스가 Git 저장소가 아닐 때는 패널 전체가 안내 한 줄로 바뀐다. */
export const NotRepository: Story = story({ repository: false });

/** 커밋 직후 — 해시 앞 7자를 보여준다. */
export const Committed: Story = story({ unstaged: UNSTAGED, lastCommit: "ab90700" });
