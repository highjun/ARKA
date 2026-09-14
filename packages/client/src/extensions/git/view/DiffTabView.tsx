import { useViewModel } from "#core/viewmodel";
import { Spinner } from "@primer/react";
import { Blankslate } from "@primer/react/experimental";
import { DiffView } from "../component/DiffView";
import { SourceControlViewModelToken } from "../viewmodel/ISourceControlViewModel";

/**
 * diff 탭. 어느 변경인지는 탭 id(`staged:path` / `wt:path`)가 말한다. `openDiff`는 멱등이라 렌더마다 부른다.
 * unified diff를 줄 단위로 색만 칠한다 — 나란히 보기는 에디터가 diff를 받을 때(백로그).
 */
export const DiffTabView = ({ tabId }: { readonly tabId: string }) => {
  const viewModel = useViewModel(SourceControlViewModelToken);
  viewModel.openDiff(tabId);
  const diff = viewModel.diffOf(tabId);

  if (diff.loading && diff.text === "") {
    return (
      <Blankslate>
        <Blankslate.Visual>
          <Spinner size="medium" srText="diff를 읽는 중" />
        </Blankslate.Visual>
      </Blankslate>
    );
  }
  if (diff.failure !== null) {
    return (
      <Blankslate>
        <Blankslate.Heading as="h2">diff를 읽지 못했다</Blankslate.Heading>
        <Blankslate.Description>{diff.failure}</Blankslate.Description>
      </Blankslate>
    );
  }
  if (diff.text === "") {
    return (
      <Blankslate>
        <Blankslate.Heading as="h2">차이가 없다</Blankslate.Heading>
      </Blankslate>
    );
  }
  return <DiffView data-component="DiffTabView" text={diff.text} />;
};
