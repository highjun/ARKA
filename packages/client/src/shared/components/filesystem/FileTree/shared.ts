/**
 * `FileTree`의 다중선택 로직 — React·DOM을 모르는 순수 함수로 뽑는다. 플랫폼 분기·범위 경계·
 * 앵커 폴백·disabled 제외처럼 실제로 틀리기 쉬운 부분이 전부 여기 있어서, 여기가 녹색이면
 * `FileTree.tsx`는 이 함수들을 부르는 배선일 뿐이다.
 *
 * VSCode(`listWidget.ts`)의 `isSelectionSingleChangeEvent`/`isSelectionRangeChangeEvent`와
 * 같은 규칙을 따른다 — mac은 `metaKey`가 토글, 그 외는 `ctrlKey`가 토글. `shiftKey`는 항상 범위.
 */

export interface SelectableRow {
  readonly id: string;
  readonly disabled?: boolean;
}

export type SelectionIntent = 'replace' | 'toggle' | 'range';

/** `navigator.platform`을 여기서만 읽는다 — 나머지는 이 값을 인자로 받아 테스트에서 양쪽을 다 본다. */
export const isApplePlatform = (): boolean =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/iu.test(navigator.platform ?? navigator.userAgent ?? '');

export const selectionIntentOf = (
  event: { readonly metaKey: boolean; readonly ctrlKey: boolean; readonly shiftKey: boolean },
  apple: boolean = isApplePlatform(),
): SelectionIntent => {
  if (event.shiftKey) return 'range';
  if (apple ? event.metaKey : event.ctrlKey) return 'toggle';
  return 'replace';
};

const withoutDisabled = (order: readonly SelectableRow[], ids: readonly string[]): readonly string[] => {
  const disabledIds = new Set(order.filter((row) => row.disabled).map((row) => row.id));
  return ids.filter((id) => !disabledIds.has(id));
};

export interface NextSelectionInput {
  readonly intent: SelectionIntent;
  readonly current: readonly string[];
  readonly order: readonly SelectableRow[];
  readonly anchorId: string | undefined;
  readonly targetId: string;
}

export interface NextSelectionResult {
  readonly ids: readonly string[];
  readonly anchorId: string;
}

/**
 * 클릭 한 번의 결과로 나올 다음 선택 집합과 다음 앵커를 계산한다.
 *
 * - `replace`: 대상 하나로 교체, 앵커도 대상으로.
 * - `toggle`: 대상이 이미 선택돼 있으면 제거, 아니면 추가. 앵커도 대상으로(VSCode와 동일 — 다음
 *   Shift+클릭은 방금 토글한 자리부터 범위를 잰다).
 * - `range`: 앵커가 없거나(첫 조작) `order`에서 사라졌으면(접혀서 안 보이게 됨) 대상을 앵커로 삼고
 *   그 자리부터 잰다 — VSCode의 `if (!anchor) setAnchor(focus)`와 같다. 있으면 앵커~대상 구간을
 *   `order`(= "지금 화면에 보이는 순서") 기준으로 자른다.
 */
export const nextSelection = ({ intent, current, order, anchorId, targetId }: NextSelectionInput): NextSelectionResult => {
  if (intent === 'replace') return { ids: [targetId], anchorId: targetId };

  if (intent === 'toggle') {
    const ids = current.includes(targetId) ? current.filter((id) => id !== targetId) : [...current, targetId];
    return { ids, anchorId: targetId };
  }

  const anchorIndex = anchorId === undefined ? -1 : order.findIndex((row) => row.id === anchorId);
  const effectiveAnchorId = anchorIndex >= 0 ? anchorId! : targetId;
  const effectiveAnchorIndex = anchorIndex >= 0 ? anchorIndex : order.findIndex((row) => row.id === targetId);
  const targetIndex = order.findIndex((row) => row.id === targetId);
  const min = Math.min(effectiveAnchorIndex, targetIndex);
  const max = Math.max(effectiveAnchorIndex, targetIndex);
  const rangeIds = order.slice(min, max + 1).map((row) => row.id);

  return { ids: withoutDisabled(order, rangeIds), anchorId: effectiveAnchorId };
};

/** 보이는 행 전부(disabled 제외) — Ctrl/Cmd+A. */
export const selectAll = (order: readonly SelectableRow[]): readonly string[] =>
  withoutDisabled(order, order.map((row) => row.id));

/**
 * 대상이 이미 선택 안에 있으면 선택 전체를, 아니면 대상 하나만 돌려준다 — "우클릭 메뉴의 대상 =
 * 지금 하이라이트된 것"이 항상 참이 되도록 선택을 정규화한다. 우클릭(1라운드)과 drag start(3라운드)가
 * 이 함수를 공유한다.
 */
export const selectionIncluding = (current: readonly string[], targetId: string): readonly string[] =>
  current.includes(targetId) ? current : [targetId];

/** `compactFolderChains`가 받아들이는 최소 모양 — `FileTree.tsx`의 `FileTreeItem`과 구조가 같다. */
export interface CompactableItem {
  readonly id: string;
  readonly name: string;
  readonly type: 'folder' | 'file';
  readonly children?: readonly CompactableItem[];
}

/**
 * VSCode의 `explorer.compactFolders`와 같다 — 폴더가 자식으로 폴더 하나만(파일 없이) 가진 체인을
 * `부모/자식/손자` 한 행으로 합친다.
 *
 * 병합된 행은 **체인의 마지막(terminal) 폴더 그 자체**로 취급한다(`id`·`loading`·`children` 전부
 * terminal 것을 그대로 쓰고 `name`만 이어붙인 경로로 바꾼다) — 실제로 펼치고 접고 로딩 표시가
 * 뜨는 대상이 바로 그 terminal이기 때문이다. 체인 중간 폴더는 압축 전에도 자식이 정확히 하나뿐이라
 * 별도 행으로 그려질 이유가 없다 — 그래서 압축하면 아예 별개 행으로 나타나지 않는다(펼쳐도
 * 마찬가지 — VSCode도 중간 세그먼트를 독립 행으로 보여주지 않는다).
 *
 * 아직 자식을 안 읽어온 폴더(`children === undefined`)는 조건 자체를 평가할 수 없어 압축 대상이
 * 아니다 — 그 자식이 나중에 도착하면(정확히 폴더 하나면) 그때 압축된다.
 */
export const compactFolderChains = <T extends CompactableItem>(items: readonly T[]): readonly T[] =>
  items.map((item) => {
    if (item.type !== 'folder' || item.children === undefined) return item;

    const segments = [item.name];
    let terminal: CompactableItem = item;
    while (
      terminal.type === 'folder' &&
      terminal.children !== undefined &&
      terminal.children.length === 1 &&
      terminal.children[0]!.type === 'folder'
    ) {
      terminal = terminal.children[0]!;
      segments.push(terminal.name);
    }

    const compactedChildren = terminal.children === undefined ? undefined : compactFolderChains(terminal.children);
    if (segments.length === 1) return { ...item, children: compactedChildren } as T;
    return { ...(terminal as T), name: segments.join('/'), children: compactedChildren };
  });
