import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ISettingsViewModel } from "../viewmodel/ISettingsViewModel";
import { SettingsTabView } from "./SettingsTabView";

const viewModel = (state: Partial<ISettingsViewModel>): ISettingsViewModel => ({
  dispose: () => undefined,
  rows: [
    {
      id: "workbench.density",
      title: "밀도",
      category: "모양",
      description: "줄 높이와 여백. auto 는 화면 폭을 보고 고른다",
      type: "enum",
      value: "auto",
      options: ["auto", "compact", "touch"],
    },
    { id: "editor.wordWrap", title: "줄 바꿈", category: "편집기", type: "boolean", value: true },
    { id: "editor.tabSize", title: "탭 너비", category: "편집기", type: "number", value: 2 },
    { id: "editor.fontFamily", title: "글꼴", category: "편집기", type: "string", value: "monospace" },
  ],
  query: "",
  setQuery: () => undefined,
  set: () => undefined,
  ...state,
});

const withViewModel = (state: Partial<ISettingsViewModel>) => {
  const container = new Container("story");
  container.register("arka.workbench.settingsViewModel", "singleton", () => viewModel(state));
  return container.createChild("view");
};

const meta = {
  title: "01-workbench/SettingsTabView",
  component: SettingsTabView,
} satisfies Meta<typeof SettingsTabView>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (state: Partial<ISettingsViewModel>): Story => ({
  decorators: [
    (Story) => (
      <ContainerProvider container={withViewModel(state)}>
        <div style={{ height: 480, width: 720 }}>
          <Story />
        </div>
      </ContainerProvider>
    ),
  ],
});

export const Default: Story = story({});
