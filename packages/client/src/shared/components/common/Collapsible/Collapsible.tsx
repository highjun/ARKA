import { createContext, forwardRef, useContext } from 'react';
import type { FormEvent, HTMLAttributes } from 'react';
import { useControlledState } from '#utils/useControlledState';
import { assembleCompound } from '#utils/assembleCompound';
import { mergeClassNames } from '#utils/mergeClassNames';
import styles from './Collapsible.module.css';
import { Details } from '@primer/react';
import { Icon } from '#components/common/Icon';

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다. `Trigger`/`Content` 는 네이티브 `<details>`의 해부도가 아니라 접기 UI 라면 어디에나
 * 있는 개념이라 공개 표면에 그대로 둔다.
 */
export interface CollapsibleRootProps extends HTMLAttributes<HTMLDetailsElement> {
  /** 넘기면 controlled, 안 넘기면 `defaultOpen` 으로 컴포넌트가 자체 관리한다. */
  readonly open?: boolean;
  /** uncontrolled 모드의 초깃값. 기본값 `false`. */
  readonly defaultOpen?: boolean;
  /** 펼침 여부가 바뀔 때마다(controlled 여부 무관) 호출된다. */
  readonly onOpenChange?: (open: boolean) => void;
}

/** 눌러서 펼치고 접는 자리. 셰브론은 이쪽이 그린다 — 방향은 Context로 받는다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface CollapsibleTriggerProps extends HTMLAttributes<HTMLElement> {}

/** 접히는 본문. 접힌 동안에는 DOM에서 빠진다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface CollapsibleContentProps extends HTMLAttributes<HTMLDivElement> {}

/** `Trigger`가 펼침 여부를 알아야 chevron 방향을 고를 수 있는데(`Root`가 아니라 `Trigger`가
 * 아이콘을 그린다), 둘이 서로 다른 서브컴포넌트라 prop으로 못 넘긴다 — `List`의
 * `ListContext`와 같은 이유로 Context를 쓴다. */
const CollapsibleContext = createContext(false);

/**
 * `@primer/react`의 `Details`(네이티브 `<details>`/`<summary>`)를 아는 유일한 함수 — 이 파일에서
 * `@primer/react`를 직접 참조하는 곳은 여기뿐이다. controlled/uncontrolled 하이브리드는
 * `useControlledState`로 구현한다 — `<details open>`은 항상 그 훅이 반환한 값을 그대로
 * 반영하므로(uncontrolled에서도 React state가 단일 진실), DOM이 몰래 React state와 어긋날
 * 여지가 없다. `forwardRef` — Primer 자신의 `Details`가 forwardRef 컴포넌트라, 감싸면서 그
 * ref 접근을 잃으면 raw `Details`보다 기능이 준다.
 */
const Root = forwardRef<HTMLDetailsElement, CollapsibleRootProps>(
  ({ open, defaultOpen = false, onOpenChange, className, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = useControlledState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
    const handleToggle = (event: FormEvent<HTMLDetailsElement>) => setIsOpen(event.currentTarget.open);

    return (
      <Details ref={ref} {...props} open={isOpen} onToggle={handleToggle} data-component="Collapsible" className={className}>
        <CollapsibleContext.Provider value={isOpen}>{children}</CollapsibleContext.Provider>
      </Details>
    );
  },
);
Root.displayName = 'Collapsible.Root';

/** Primer의 `Details.Summary`도 forwardRef가 아니다(직접 확인) — 여기가 forwardRef 없는 유일한
 * 이유는 원칙 예외가 아니라 Primer 자신의 실제 관례를 그대로 따른 것이다. */
const Trigger = ({ className, children, ...props }: CollapsibleTriggerProps) => (
  <Details.Summary className={className} {...props}>
    {children}
  </Details.Summary>
);

/** Primer 의 `Details`엔 별도 Content 파츠가 없다 — 네이티브 `<details>`가 summary 뒤 자식을 이미 감춰준다. */
const Content = ({ className, children, ...props }: CollapsibleContentProps) => (
  <div className={className} {...props}>
    {children}
  </div>
);

const RootComponent = forwardRef<HTMLDetailsElement, CollapsibleRootProps>(({ className, ...props }, ref) => (
  <Root ref={ref} className={mergeClassNames(className, styles['root'])} {...props} />
));

/** 클릭하면 펼침/접힘을 토글하는 제목 줄. chevron은 펼침 여부에 따라 `chevronRight`/
 * `chevronDown`으로 아이콘 자체가 바뀐다(`FileTree`와 같은 패턴 — CSS 회전이 아니다). */
const CollapsibleTrigger = ({ className, children, ...props }: CollapsibleTriggerProps) => {
  const isOpen = useContext(CollapsibleContext);
  return (
    <Trigger className={mergeClassNames(className, styles['trigger'])} {...props}>
      <span data-chevron className={styles['chevron']}>
        <Icon iconId={isOpen ? 'chevronDown' : 'chevronRight'} size="sm" />
      </span>
      <span className={styles['title']}>{children}</span>
    </Trigger>
  );
};

/** 펼쳐졌을 때만 보이는 내용 영역. */
const CollapsibleContent = ({ className, ...props }: CollapsibleContentProps) => (
  <Content className={mergeClassNames(className, styles['content'])} {...props} />
);

export type { CollapsibleRootProps as CollapsibleProps };

/**
 * Storybook Docs 서브컴포넌트 섹션 전용 재노출 — 공개 API는 `Collapsible.Trigger` 등
 * `assembleCompound` 결과로만 접근한다(`index.ts`엔 안 싣는다). react-docgen-typescript가
 * 파일의 최상위 export만 컴포넌트로 인식해서, 비export 지역 함수엔 `__docgenInfo`가 안 붙는다
 * (2026-09-06 실측 확인) — Docs 페이지의 서브컴포넌트 Props 표를 뽑으려면 이 재노출이 필요하다.
 */
export { CollapsibleTrigger as CollapsibleTriggerDoc, CollapsibleContent as CollapsibleContentDoc };

export const Collapsible = assembleCompound('Collapsible', RootComponent, { Trigger: CollapsibleTrigger, Content: CollapsibleContent });
