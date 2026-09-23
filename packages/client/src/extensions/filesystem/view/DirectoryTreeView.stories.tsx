import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FileTreeRow, IDirectoryTreeViewModel } from "../viewmodel/IDirectoryTreeViewModel";
import type { IFileContentViewModel } from "../viewmodel/IFileContentViewModel";
import { DirectoryTreeView } from "./DirectoryTreeView";

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
  startWatching: () => undefined,
  stopWatching: () => undefined,
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
