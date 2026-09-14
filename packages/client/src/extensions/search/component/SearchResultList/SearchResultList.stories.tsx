import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchResultList } from './index';

const FILES = [
  {
    path: 'packages/client/src/workbench/view/ShellView.tsx',
    matches: [
      { line: 12, column: 8, preview: "  const viewModel = useViewModel(ShellViewModelToken);" },
      { line: 184, column: 20, preview: "      {viewModel.isClientOutdated ? (" },
    ],
  },
  {
    path: 'docs/adr/0008-component-surface.md',
    matches: [{ line: 3, column: 1, preview: '## 맥락:' }],
  },
];

const meta = {
  title: 'search/SearchResultList',
  component: SearchResultList,
  args: { files: FILES, onSelect: () => undefined },
} satisfies Meta<typeof SearchResultList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 파일마다 머리글 하나, 그 아래 찾은 자리들. */
export const Default: Story = {};

/** 결과가 없으면 아무것도 그리지 않는다 — 빈 상태 문구는 쓰는 쪽이 낸다. */
export const Empty: Story = { args: { files: [] } };

/** 긴 줄은 잘린다 — 사이드바 폭이 목록 폭이다. */
export const LongPreview: Story = {
  args: {
    files: [
      {
        path: 'a.ts',
        matches: [{ line: 1, column: 1, preview: 'export const veryLongIdentifierName = someOtherVeryLongFunctionName(withArguments, andMore);' }],
      },
    ],
  },
};
