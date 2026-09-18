import { useViewModel } from "#core/viewmodel";
import { Button, Spinner, TextInput } from "@primer/react";
import { Text } from "#component/Text";
import { SearchResultList } from "../component/SearchResultList";
import styles from "./SearchView.module.css";

/**
 * 사이드바의 검색 패널. 결과를 누르면 그 파일을 그 줄·열로 연다.
 */
export const SearchView = ({
  onFileOpen,
}: {
  readonly onFileOpen: (path: string, position?: { readonly line: number; readonly column: number }) => void;
}) => {
  const viewModel = useViewModel("arka.search.viewModel");
  return (
    <div data-component="SearchView" className={styles["root"]}>
      <form
        className={styles["form"]}
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit();
        }}
      >
        <TextInput
          block
          aria-label="검색어"
          placeholder="찾을 내용"
          value={viewModel.query}
          onChange={(event) => viewModel.setQuery(event.target.value)}
        />
        <div className={styles["options"]}>
          <Button
            type="button"
            size="small"
            variant={viewModel.caseSensitive ? "primary" : "default"}
            aria-pressed={viewModel.caseSensitive}
            aria-label="대소문자 구분"
            onClick={() => viewModel.toggleCaseSensitive()}
          >
            Aa
          </Button>
          <Button
            type="button"
            size="small"
            variant={viewModel.regex ? "primary" : "default"}
            aria-pressed={viewModel.regex}
            aria-label="정규식"
            onClick={() => viewModel.toggleRegex()}
          >
            .*
          </Button>
        </div>
      </form>
      <div className={styles["summary"]}>
        {viewModel.searching ? <Spinner size="small" srText="찾는 중" /> : null}
        <Text size="small" tone={viewModel.failure === null ? "muted" : "danger"}>
          {viewModel.failure ?? viewModel.summary}
        </Text>
      </div>
      <div className={styles["results"]}>
        <SearchResultList
          files={viewModel.rows}
          onSelect={(path, match) => onFileOpen(path, { line: match.line, column: match.column })}
        />
      </div>
    </div>
  );
};
