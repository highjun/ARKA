import type { HTMLAttributes, MouseEvent, Ref } from 'react';
import { clsx } from 'clsx';
import { ActionList } from '@primer/react';
import { Icon } from '#component/Icon';
import type { IconId } from '#component/Icon';
import { Text } from '#component/Text';
import styles from './ChangeList.module.css';

/** 목록의 행 하나 — 어떤 파일이 어떻게 바뀌었나. 스테이지 여부는 목록이 안다. */
interface ChangeListEntry {
  /** 워크스페이스 기준 경로 — 행의 이름이자 `key`다. */
  readonly path: string;
  /** 한 글자 상태표. `M`·`A`·`D`·`R`·`U`. 색은 CSS가 이 값으로 고른다. */
  readonly badge: string;
}

/** 행마다 하나씩, 머리글에 하나 붙는 같은 동작 — 스테이지하거나 해제한다. */
interface ChangeListAction {
  /** 접근성 이름에 들어가는 동사(`'스테이지'`·`'해제'`). */
  readonly label: string;
  /** 버튼에 그릴 아이콘. */
  readonly iconId: IconId;
  /** 머리글 버튼 — 목록 전체에 적용한다. 행이 없으면 버튼이 안 뜬다. */
  readonly onAll: () => void;
  /** 행 버튼 — 그 경로에만 적용한다. */
  readonly onOne: (path: string) => void;
}

/** 행 하나. 목록 밖에서 단독으로 쓰는 일은 없지만 스토리·테스트가 이 단위를 본다. */
interface ChangeListItemProps {
  /** 그릴 행. */
  readonly entry: ChangeListEntry;
  /** 행에 붙는 동작. */
  readonly action: ChangeListAction;
  /** 행을 고르면 호출된다 — 보통 diff를 연다. */
  readonly onSelect: (entry: ChangeListEntry) => void;
}

/** `children`·`role`·`onSelect`를 가로챈다 — 행은 `entries`가 정하고 `onSelect`는 고른 행을 준다. */
export interface ChangeListProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children' | 'role' | 'onSelect'> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLUListElement>;
  /** 머리글 문구(`'스테이지된 변경'`). 개수는 옆에 자동으로 붙는다. */
  readonly heading: string;
  /** 그릴 행들. 비면 머리글만 남고 전체 적용 버튼이 사라진다. */
  readonly entries: readonly ChangeListEntry[];
  /** 머리글·행에 붙는 동작. */
  readonly action: ChangeListAction;
  /** 행을 고르면 호출된다. */
  readonly onSelect: (entry: ChangeListEntry) => void;
}

/**
 * 변경 파일 한 줄 — 상태표·경로·동작 버튼.
 *
 * 상태표를 클래스로 가르지 않고 `data-badge`로 드러낸다 — 어느 색을 쓸지는 스타일 결정이라
 * CSS가 속성 선택자로 받는다(→ ADR 0008).
 *
 * 버튼은 `TrailingVisual`이 아니라 **`TrailingAction`**에 둔다. 행 자체가 누를 수 있는 것이라
 * 그 안에 버튼을 넣으면 "누를 수 있는 것 안에 누를 수 있는 것"이 되어 보조기술이 둘을 구별하지
 * 못한다(axe `nested-interactive`). `TrailingAction`은 Primer가 그 자리를 행의 활성 영역 **밖**에
 * 두려고 만든 부품이다.
 */
const ChangeListItem = ({ entry, action, onSelect }: ChangeListItemProps) => (
  <ActionList.Item onSelect={() => onSelect(entry)}>
    <ActionList.LeadingVisual>
      <span className={styles['badge']} data-badge={entry.badge}>
        {entry.badge}
      </span>
    </ActionList.LeadingVisual>
    <span className={styles['path']}>{entry.path}</span>
    <ActionList.TrailingAction
      label={`${entry.path} ${action.label}`}
      icon={() => <Icon iconId={action.iconId} size="sm" />}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        action.onOne(entry.path);
      }}
    />
  </ActionList.Item>
);

/**
 * 한 묶음의 변경 파일 목록 — 머리글에 개수와 "전부" 버튼, 아래에 행들.
 *
 * 머리글의 "전부" 버튼은 `GroupHeading.TrailingAction`이 든다 — 전에는 `div`로 머리글을 감싸
 * 버튼을 옆에 두었는데, 그 `div`가 묶음의 `ul`에 직접 들어가 "리스트는 `li`만 담아야 한다"는
 * 규칙을 깼다(axe `list`).
 *
 * 자기 `ActionList`를 낸다. 묶음을 하나의 `ActionList` 안에 나란히 두지 않는 것은, 그러면 이
 * 컴포넌트가 "특정 부모 안에서만 쓸 수 있는 조각"이 되어 단독으로 그릴 수 없기 때문이다 —
 * 묶음마다 `ul`이 하나씩 나오는 것은 시맨틱으로도 맞다.
 */
const ChangeListRoot = ({ heading, entries, action, onSelect, className, ref, ...props }: ChangeListProps) => (
  <ActionList ref={ref} {...props} data-component="ChangeList" className={clsx(className, styles['root'])}>
    <ActionList.Group>
      <ActionList.GroupHeading as="h3">
        {heading}{' '}
        <Text size="small" tone="muted">
          {entries.length}
        </Text>
        {entries.length > 0 ? (
          <ActionList.GroupHeading.TrailingAction
            label={`${heading} 전부 ${action.label}`}
            icon={() => <Icon iconId={action.iconId} size="sm" />}
            onClick={action.onAll}
          />
        ) : null}
      </ActionList.GroupHeading>
      {entries.map((entry) => (
        <ChangeListItem key={entry.path} entry={entry} action={action} onSelect={onSelect} />
      ))}
    </ActionList.Group>
  </ActionList>
);

/** 부품 이름이 `ChangeList<부품>`인 것은 react-docgen이 최상위 export만 보기 때문이다. */
export const ChangeList = Object.assign(ChangeListRoot, { Item: ChangeListItem });
