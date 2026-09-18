import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FileTreeRow, IDirectoryTreeViewModel } from "../viewmodel/IDirectoryTreeViewModel";
import type { IFileContentViewModel } from "../viewmodel/IFileContentViewModel";
import { DirectoryTreeView } from "./DirectoryTreeView";

/**
 * 고정된 VM을 꽂는다 — 실물은 마운트에 워크스페이스를 읽고 `fs.watch`를 건다. 우클릭 메뉴는
 * 진짜 `CommandService`를 빈 채로 준다(커맨드가 없으면 메뉴에 뜰 것도 없다) — 이 컴포넌트는
 * 레지스트리의 실제 모양을 훑으므로 흉내로는 부족하다.
 */
const viewModel = (state: Partial<IDirectoryTreeViewModel>): IDirectoryTreeViewModel => ({
  dispose: () => undefined,
  rows: [],
  expandedIds: [],
  selectedIds: [],
  status: "loaded",
  failure: null,
  start: () => undefined,
  setFolderExpanded: () => undefined,
  setSelection: () => undefined,
  findRow: () => undefined,
  createEntry: () => Promise.resolve(),
  renameEntry: () => Promise.resolve(),
  removeEntry: () => Promise.resolve(),
  removeEntries: () => Promise.resolve(),
  moveEntry: () => Promise.resolve(""),
  startWatching: () => undefined,
  stopWatching: () => undefined,
  contextTarget: null,
  contextTargets: [],
  setContextTarget: () => undefined,
  editingId: undefined,
  requestNewFile: () => undefined,
  requestNewFolder: () => undefined,
  requestRename: () => undefined,
  onEditCommit: () => undefined,
  onEditCancel: () => undefined,
  deleteTargets: [],
  requestDelete: () => undefined,
  confirmDelete: () => undefined,
  cancelDelete: () => undefined,
  failureNotice: null,
  dismissFailureNotice: () => undefined,
  openFile: () => undefined,
  pinFile: () => undefined,
  retargetTabs: () => undefined,
  ...state,
});

const fileContentViewModel: IFileContentViewModel = {
  dispose: () => undefined,
  rows: {},
  onDidChange: () => ({ dispose: () => undefined }),
  reveals: {},
  revealAt: () => undefined,
  openFile: () => Promise.resolve(true),
  editFile: () => undefined,
  saveFile: () => undefined,
  retargetOpenFile: () => undefined,
  startWatching: () => undefined,
  stopWatching: () => undefined,
};

const ROWS: readonly FileTreeRow[] = [
  {
    id: "packages",
    name: "packages",
    type: "folder",
    children: [
      {
        id: "packages/client",
        name: "client",
        type: "folder",
        children: [
          {
            id: "packages/client/src",
            name: "src",
            type: "folder",
            children: [{ id: "packages/client/src/main.tsx", name: "main.tsx", type: "file" }],
          },
          { id: "packages/client/package.json", name: "package.json", type: "file" },
        ],
      },
      { id: "packages/server", name: "server", type: "folder", disabled: true },
    ],
  },
  { id: "docs", name: "docs", type: "folder", loading: true },
  { id: "CONVENTIONS.md", name: "CONVENTIONS.md", type: "file" },
  { id: "package.json", name: "package.json", type: "file" },
];

const meta = {
  title: "filesystem/DirectoryTreeView",
  component: DirectoryTreeView,
} satisfies Meta<typeof DirectoryTreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (state: Partial<IDirectoryTreeViewModel>): Story => ({
  decorators: [
    (Story) => {
      const container = new Container("story");
      container.register("arka.filesystem.directoryTreeViewModel", "singleton", () => viewModel(state));
      container.register("arka.filesystem.fileContentViewModel", "singleton", () => fileContentViewModel);
      container.register(
        "arka.commands",
        "singleton",
        () =>
          new CommandService({
            overridesStore: { load: () => ({}), save: () => undefined },
            reportError: () => undefined,
          }),
      );
      return (
        <ContainerProvider container={container.createChild("view")}>
          <div style={{ height: 520, width: 320 }}>
            <Story />
          </div>
        </ContainerProvider>
      );
    },
  ],
});

export const Default: Story = story({
  rows: ROWS,
  expandedIds: ["packages", "packages/client"],
  selectedIds: ["CONVENTIONS.md"],
});

/** 워크스페이스가 정말 비었을 때 — 읽는 중과 달라야 한다. */
export const Empty: Story = story({ status: "loaded" });

/** 아직 루트를 읽는 중 — 행이 없는 이유가 다르므로 스피너가 뜬다. */
export const Loading: Story = story({ status: "loading" });

/** 루트를 읽지 못했다 — 트리 자체가 뜨지 않는 유일한 경우다. */
export const Error: Story = story({ status: "error", failure: "워크스페이스를 읽지 못했다 — ENOENT" });

/** 이름을 인라인으로 고치는 중 — 행 자체가 입력칸이 된다(모달이 아니다). */
export const Editing: Story = story({ rows: ROWS, expandedIds: ["packages"], editingId: "CONVENTIONS.md" });

/** 여러 항목을 지우기 직전의 확인 — 폴더가 섞이면 문구가 달라진다. */
export const DeleteConfirm: Story = story({
  rows: ROWS,
  expandedIds: ["packages"],
  deleteTargets: [
    { id: "packages", name: "packages", type: "folder" },
    { id: "package.json", name: "package.json", type: "file" },
  ],
});

/** 조작이 실패해 안내를 띄운 상태. */
export const FailureNotice: Story = story({ rows: ROWS, failureNotice: "같은 이름이 이미 있다 — EEXIST" });
