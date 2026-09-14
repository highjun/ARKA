import type { Ref } from 'react';
import { buildClassNames } from './TabContext';
import { TabHeader } from './Header';
import { StripItems, StripMenu, StripRootImpl } from './Strip';
import type { TabStripProps } from './Strip';
import { GroupImpl } from './Group';
import type { TabGroupProps } from './Group';
import { SplitRootImpl } from './Split';
import type { TabSplitProps } from './Split';

const StripRoot = ({ className, ...props }: TabStripProps) => (
  <StripRootImpl {...props} classNames={buildClassNames()} className={className} />
);

/** 탭 헤더들을 가로로 늘어놓는 띠 — 넘치면 스크롤하고, 다 안 보이는 탭은 오버플로 메뉴로 묶는다. */
export const TabStrip = Object.assign(StripRoot, { Items: StripItems, Menu: StripMenu });

/**
 * Strip과 활성 탭의 내용(`children`)을 세로로 붙인 패널 하나 — 분할이 없을 때 `Tab`이 렌더하는
 * 기본 단위.
 *
 * `data-component` 는 여기서 리터럴로 정한다 — 실제 DOM에 닿는 자리(`GroupImpl`)가 하나뿐이라
 * 다른 컴포넌트와 같은 자리다.
 */
export const TabGroup = ({ className, chrome, ref, ...props }: TabGroupProps) => (
  <GroupImpl {...props} ref={ref} classNames={buildClassNames()} className={className} data-chrome={chrome ?? 'bordered'} data-component="Tab" />
);
TabGroup.displayName = 'Tab.Group';

/**
 * TabSplit 은 leaf 하나뿐일 때와 branch 가 있을 때 렌더되는 태그가 다르다(`section`/`div`) —
 * `SplitRootImpl`이 안다.
 */
export const TabSplit = ({ className, chrome, ref, ...props }: TabSplitProps) => (
  <SplitRootImpl {...props} ref={ref} classNames={buildClassNames()} className={className} data-chrome={chrome ?? 'bordered'} data-component="Tab" />
);
TabSplit.displayName = 'Tab.Split';

/**
 * `tree`를 주면 분할, 주지 않고 `tabItems`/`activeTab`을 주면 단일 그룹으로 동작한다. 두 모양이
 * 한 컴포넌트인 이유는 쓰는 쪽이 분할 여부를 런타임에 바꾸기 때문이다.
 */
export type TabProps = (TabSplitProps | (TabGroupProps & { tree?: never })) & {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
};

/** `tree`가 있으면 분할을, 없으면 단일 그룹을 그린다. */
export const TabRoot = ({ ref, ...props }: TabProps) =>
  props.tree ? <TabSplit {...props} ref={ref} /> : <TabGroup {...props} ref={ref} />;
TabRoot.displayName = 'Tab';

/**
 * 부품을 `Object.assign`으로 네임스페이스에 붙인다. 부품 함수의 이름이 `Tab<부품>`인 것은
 * react-docgen-typescript가 파일의 최상위 export만 컴포넌트로 인식해서다 — Docs 페이지의
 * 서브컴포넌트 Props 표가 그 이름으로 붙는다(2026-09-06 실측).
 */
export const Tab = Object.assign(TabRoot, { Header: TabHeader, Strip: TabStrip, Group: TabGroup, Split: TabSplit });

/**
 * 공개 표면은 이 파일이 낸다 — 부품이 파일로 갈렸어도 밖에서 보는 자리는 `Tab` 하나다.
 */
export type { SplitDropPosition, SplitEdgeDropPosition, StripDropPosition, TabChrome, TabDropZone, TabGroupItem, TabId, TabItem, TabSplitOrientation } from './shared';
export type { TabHeaderProps } from './Header';
export type { TabStripProps } from './Strip';
export type { TabGroupProps } from './Group';
export type { TabSplitProps, TabTreeLeaf, TabTreeNode, TabTreeSplit } from './Split';
