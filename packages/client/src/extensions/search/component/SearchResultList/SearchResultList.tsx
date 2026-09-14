import type { HTMLAttributes, Ref } from "react";
import { clsx } from "clsx";
import { ActionList } from "@primer/react";
import { Text } from "#component/Text";
import styles from "./SearchResultList.module.css";

/** 한 파일 안에서 찾은 자리 하나. */
interface SearchResultMatch {
  /** 1부터 세는 줄 번호 — 행 앞에 그대로 보인다. */
  readonly line: number;
  /** 1부터 세는 열 번호 — 보이지 않지만 열 때 쓴다. */
  readonly column: number;
  /** 그 줄의 내용. 앞뒤 공백은 목록이 떼어 낸다. */
  readonly preview: string;
}

/** 파일 하나와 그 안의 자리들 — 머리글이 파일, 행이 자리다. */
interface SearchResultFile {
  /** 워크스페이스 기준 경로. 머리글 문구이자 `key`다. */
  readonly path: string;
  /** 그 파일에서 찾은 자리들. */
  readonly matches: readonly SearchResultMatch[];
}

/** 자리 한 줄. 목록 밖에서 단독으로 쓰지는 않지만 스토리·테스트가 이 단위를 본다. */
interface SearchResultListItemProps {
  /** 그릴 자리. */
  readonly match: SearchResultMatch;
  /** 자리를 고르면 호출된다 — 보통 파일을 그 줄·열로 연다. */
  readonly onSelect: (match: SearchResultMatch) => void;
}

/** `children`·`onSelect`를 가로챈다 — 행은 `files`가 정하고 `onSelect`는 고른 자리를 준다. */
export interface SearchResultListProps extends Omit<
  HTMLAttributes<HTMLUListElement>,
  "children" | "role" | "onSelect"
> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLUListElement>;
  /** 파일별로 묶인 결과. 비면 아무것도 그리지 않는다 — 빈 상태 문구는 쓰는 쪽이 낸다. */
  readonly files: readonly SearchResultFile[];
  /** 자리를 고르면 그 파일 경로와 함께 호출된다. */
  readonly onSelect: (path: string, match: SearchResultMatch) => void;
}

/** 찾은 자리 한 줄 — 줄 번호와 그 줄의 내용. */
const SearchResultListItem = ({ match, onSelect }: SearchResultListItemProps) => (
  <ActionList.Item onSelect={() => onSelect(match)}>
    <ActionList.LeadingVisual>
      <Text size="small" tone="muted">
        {match.line}
      </Text>
    </ActionList.LeadingVisual>
    <span className={styles["preview"]}>{match.preview.trim()}</span>
  </ActionList.Item>
);

/**
 * 검색 결과 — 파일마다 머리글 하나와 그 아래 찾은 자리들.
 *
 * 파일 묶음 전부를 하나의 `ActionList`에 담는다 — 검색 결과는 "한 목록"이고 파일이 그 안의
 * 구분이다(`ChangeList`는 묶음마다 따로 쓰이므로 자기 목록을 낸다).
 */
const SearchResultListRoot = ({ files, onSelect, className, ref, ...props }: SearchResultListProps) => (
  <ActionList ref={ref} {...props} data-component="SearchResultList" className={clsx(className, styles["root"])}>
    {files.map((file) => (
      <ActionList.Group key={file.path}>
        <ActionList.GroupHeading as="h3">{file.path}</ActionList.GroupHeading>
        {file.matches.map((match) => (
          <SearchResultListItem
            key={`${String(match.line)}:${String(match.column)}`}
            match={match}
            onSelect={(selected) => onSelect(file.path, selected)}
          />
        ))}
      </ActionList.Group>
    ))}
  </ActionList>
);

/** 부품 이름이 `SearchResultList<부품>`인 것은 react-docgen이 최상위 export만 보기 때문이다. */
export const SearchResultList = Object.assign(SearchResultListRoot, { Item: SearchResultListItem });
