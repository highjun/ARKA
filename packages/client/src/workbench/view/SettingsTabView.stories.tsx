import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ISettingsViewModel } from "../viewmodel/ISettingsViewModel";
import { SettingsTabView } from "./SettingsTabView";

/** 실제 `SettingsViewModel` 대신 고정된 줄을 꽂는다 — 이 층에서 볼 것은 "주어진 줄을 어떻게 그리는가"다. */
const viewModel = (state: Partial<ISettingsViewModel>): ISettingsViewModel => ({
  dispose: () => undefined,
  rows: [
    { id: "workbench.density", title: "밀도", type: "enum", value: "auto", options: ["auto", "compact", "touch"] },
    { id: "editor.wordWrap", title: "줄 바꿈", type: "boolean", value: true },
    { id: "editor.tabSize", title: "탭 너비", type: "number", value: 2 },
    { id: "editor.fontFamily", title: "글꼴", type: "string", value: "monospace" },
  ],
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

/** 네 가지 `type`이 각각 어떻게 그려지는지. */
export const Default: Story = story({});
/** 등록된 스키마가 없으면 빈 화면이다. */
export const Empty: Story = story({ rows: [] });
