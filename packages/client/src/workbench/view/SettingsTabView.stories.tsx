import { createContainer, singleton } from '#core/di';
import { ViewModelProvider } from '#core/viewmodel';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsViewModelToken } from '../viewmodel/ISettingsViewModel';
import type { ISettingsViewModel } from '../viewmodel/ISettingsViewModel';
import { SettingsTabView } from './SettingsTabView';

/**
 * 고정된 VM을 꽂는다 — 실물은 `IStorage`를 읽고 `<html data-theme>`을 건드리므로, 스토리가
 * 스토리북 전체의 테마·밀도를 바꿔 다른 스토리의 그림까지 흔든다.
 */
const viewModel = (state: Partial<ISettingsViewModel>): ISettingsViewModel => ({
  theme: 'light',
  density: 'auto',
  agentConfirmWrites: true,
  setTheme: () => undefined,
  setDensity: () => undefined,
  setAgentConfirmWrites: () => undefined,
  ...state,
});

const meta = {
  title: 'workbench/SettingsTabView',
  component: SettingsTabView,
} satisfies Meta<typeof SettingsTabView>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (state: Partial<ISettingsViewModel>): Story => ({
  decorators: [
    (Story) => {
      const container = createContainer('story');
      container.register(SettingsViewModelToken, singleton(() => viewModel(state)));
      return (
        <ViewModelProvider container={container.createScope('view')}>
          <div style={{ width: 560 }}>
            <Story />
          </div>
        </ViewModelProvider>
      );
    },
  ],
});

export const Default: Story = story({});

/** 세 섹션이 모두 기본값이 아닌 쪽으로 넘어간 모습 — 선택 표시가 실제로 따라가는지 본다. */
export const AllChanged: Story = story({ theme: 'dark', density: 'touch', agentConfirmWrites: false });

/** 밀도를 촘촘하게 — 이 값이 `--arka-row-height`를 통해 FileTree 같은 목록의 행 높이를 정한다. */
export const Compact: Story = story({ density: 'compact' });
