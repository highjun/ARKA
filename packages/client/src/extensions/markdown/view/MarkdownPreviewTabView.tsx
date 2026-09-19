import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Banner, Spinner } from "@primer/react";
import { Blankslate } from "@primer/react/experimental";
import { Markdown } from "#component/Markdown";
import styles from "./MarkdownPreviewTabView.module.css";

/** 미리보기 탭. 어느 파일인지는 props로 받는다 — 읽기를 시작하는 것은 탭 provider의 몫이고, 여기는 그릴 뿐이다. */
export const MarkdownPreviewTabView = observer(function MarkdownPreviewTabView({ path }: { readonly path: string }) {
  const viewModel = useViewModel("arka.markdown.previewViewModel");
  const preview = viewModel.previewOf(path);

  if (preview.failure !== null) {
    return (
      <Blankslate>
        <Blankslate.Heading as="h2">미리보기를 만들지 못했다</Blankslate.Heading>
        <Blankslate.Description>{preview.failure}</Blankslate.Description>
      </Blankslate>
    );
  }
  if (preview.loading && preview.markdown === "") {
    return (
      <Blankslate>
        <Blankslate.Visual>
          <Spinner size="medium" srText="읽는 중" />
        </Blankslate.Visual>
      </Blankslate>
    );
  }
  return (
    <div className={styles["root"]} data-component="MarkdownPreviewTabView">
      {preview.truncated ? <Banner variant="warning" title="파일이 커서 앞부분만 보여 준다" layout="compact" /> : null}
      <Markdown source={preview.markdown} />
    </div>
  );
});
