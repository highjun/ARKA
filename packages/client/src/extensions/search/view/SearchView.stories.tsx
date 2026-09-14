import { createContainer, singleton } from "#core/di";
import { ViewModelProvider } from "#core/viewmodel";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchViewModelToken } from "../viewmodel/ISearchViewModel";
import type { ISearchViewModel } from "../viewmodel/ISearchViewModel";
import { SearchView } from "./SearchView";

/**
 * 실제 `SearchViewModel` 대신 고정된 VM을 꽂는다 — 이 층에서 볼 것은 "주어진 상태를 어떻게
 * 그리는가"이고, 디바운스와 비동기 검색이 끼면 VRT가 찍는 순간마다 그림이 달라진다.
 */
const viewModel = (state: Partial<ISearchViewModel>): ISearchViewModel => ({
  query: "",
  regex: false,
  caseSensitive: false,
  searching: false,
  rows: [],
  summary: "",
  failure: null,
  setQuery: () => undefined,
  toggleRegex: () => undefined,
  toggleCaseSensitive: () => undefined,
  submit: () => undefined,
  onDispose: () => undefined,
  ...state,
});

const withViewModel = (state: Partial<ISearchViewModel>) => {
  const container = createContainer("story");
  container.register(
    SearchViewModelToken,
    singleton(() => viewModel(state)),
  );
  return container.createScope("view");
};

const meta = {
  title: "search/SearchView",
  component: SearchView,
  args: { onFileOpen: () => undefined },
} satisfies Meta<typeof SearchView>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (state: Partial<ISearchViewModel>): Story => ({
  decorators: [
    (Story) => (
      <ViewModelProvider container={withViewModel(state)}>
        <div style={{ height: 480, width: 320 }}>
          <Story />
        </div>
      </ViewModelProvider>
    ),
  ],
});

export const Default: Story = story({
  query: "useViewModel",
  summary: "2개 파일에서 3개",
  rows: [
    {
      path: "src/workbench/view/ShellView.tsx",
      matches: [
        { line: 6, column: 10, preview: "import { useViewModel } from '#core/viewmodel';" },
        { line: 74, column: 21, preview: "  const viewModel = useViewModel(ShellViewModelToken);" },
      ],
    },
    {
      path: "src/extensions/search/view/SearchView.tsx",
      matches: [{ line: 11, column: 21, preview: "  const viewModel = useViewModel(SearchViewModelToken);" }],
    },
  ],
});

/** 검색어는 있는데 걸린 것이 없을 때 — 검색 전(요약이 빈 문자열)과 구분되어야 한다. */
export const Empty: Story = story({ query: "zzzz", summary: "0개 파일에서 0개" });

export const Loading: Story = story({ query: "useViewModel", searching: true });

export const Error: Story = story({ query: "[", regex: true, failure: "정규식이 올바르지 않습니다." });

/** 옵션 두 개가 모두 켜진 상태 — 눌린 버튼이 눌리지 않은 것과 구분되는지 본다. */
export const OptionsOn: Story = story({
  query: "Search.*View",
  regex: true,
  caseSensitive: true,
  summary: "1개 파일에서 1개",
});
