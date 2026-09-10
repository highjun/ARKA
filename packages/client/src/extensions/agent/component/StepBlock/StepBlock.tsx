import { forwardRef } from 'react';
import type { FormEvent, HTMLAttributes, ReactNode } from 'react';
import { assembleCompound } from '#utils/assembleCompound';
import { useControlledState } from '#utils/useControlledState';
import { mergeClassNames } from '#utils/mergeClassNames';
import styles from './StepBlock.module.css';
import { Details } from '@primer/react';
import { Icon } from '#components/common/Icon';
import { StatusIndicator } from '../StatusIndicator';
import type { StatusIndicatorStatus } from '../StatusIndicator';

// `StepBlockBaseProps`처럼 공유 베이스 인터페이스로 뽑지 않는다 — `ui/props-extends-html-attributes`
/**
 * 각 Props 인터페이스가 `HTMLAttributes` 계열을 **직접** 상속한다 — 간접 상속은 검사가 못 따라간다.
 * `Tab.tsx`의 `TabGroupProps`도 같은 선례다. 필드 넷이 두 인터페이스에 중복되지만 그만큼 안전하다.
 */
export interface StepBlockThinkingProps extends Omit<HTMLAttributes<HTMLDetailsElement>, 'title' | 'children' | 'onToggle'> {
  /** `'thinking'`이면 사고 과정 블록(점선 테두리) — 본문이 비어도 펼쳐진다. */
  readonly kind: 'thinking';
  /** 실행 상태. 헤더의 `StatusIndicator`에 반영된다. 기본값 `'done'`. */
  readonly status?: StatusIndicatorStatus;
  /** 펼침 여부. 넘기면 controlled, 안 넘기면 `defaultExpanded` 로 컴포넌트가 자체 관리한다. */
  readonly expanded?: boolean;
  /** uncontrolled 모드의 초깃값. 기본값 `false`. */
  readonly defaultExpanded?: boolean;
  /** 펼침 상태가 바뀔 때마다 호출된다(controlled 여부와 무관). */
  readonly onExpandedChange?: (expanded: boolean) => void;
  /** 헤더에 표시할 제목. 기본값 `'생각 중'`. */
  readonly title?: ReactNode;
  /**
   * 펼쳤을 때 보여줄 생각 내용. `kind='tool'`과 달리 본문이 없어도 펼친다 — 생각이 비어 있다는
   * 사실 자체가 보여줄 내용이라서. 없으면 `emptyLabel` 을 대신 보여준다.
   */
  readonly summary?: ReactNode;
  /** `summary` 가 없을 때 보여줄 안내 문구. 기본값 `'생각 내용이 없습니다.'`. */
  readonly emptyLabel?: ReactNode;
}

/** `<details>`라 펼침 상태를 브라우저가 든다 — `onToggle`을 가로채 그 변화를 알린다. */
export interface StepBlockToolProps extends Omit<HTMLAttributes<HTMLDetailsElement>, 'title' | 'children' | 'onToggle'> {
  /** `'tool'`이면 도구 실행 블록(실선 테두리) — 입력/출력이 둘 다 없으면 펼쳐지지 않는다. */
  readonly kind: 'tool';
  /** 실행 상태. 헤더의 `StatusIndicator`에 반영된다. 기본값 `'done'`. */
  readonly status?: StatusIndicatorStatus;
  /** 펼침 여부. 넘기면 controlled, 안 넘기면 `defaultExpanded` 로 컴포넌트가 자체 관리한다. */
  readonly expanded?: boolean;
  /** uncontrolled 모드의 초깃값. 기본값 `false`. */
  readonly defaultExpanded?: boolean;
  /** 펼침 상태가 바뀔 때마다 호출된다(controlled 여부와 무관). */
  readonly onExpandedChange?: (expanded: boolean) => void;
  /** 실행된 도구의 식별자. 헤더에 노출된다. */
  readonly toolId: string;
  /** 도구 호출 입력. JSON으로 직렬화해 본문에 보여준다. */
  readonly toolInput?: unknown;
  /** 도구 실행 출력. JSON으로 직렬화해 본문에 보여준다. */
  readonly toolOutput?: unknown;
}

const formatBody = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/**
 * `kind`로 판별되는 유니온 — `Tab.tsx`의 `TabProps`(Split/Group 판별)와 같은 기존 패턴이다.
 * `title`(ReactNode, 선택)과 `toolId`(string, 필수)는 타입·필수 여부가 달라 하나로 합치지
 * 않는다.
 */
export type StepBlockRootProps = StepBlockThinkingProps | StepBlockToolProps;

/**
 * `@primer/react`의 `Details`(네이티브 `<details>`)를 직접 쓴다 — arka-ui `Collapsible`은
 * props가 닫혀 있어(`data-component`도, 그 외 `HTMLAttributes`도 포워딩하지 않는다) 그대로
 * 감싸면 이 컴포넌트가 지켜야 하는 계약(`data-component-exposed`·`props-extends-html-attributes`)을
 * 못 채운다 — 옛 `ToolBlock`이 바깥에 래퍼 `div`를 하나 더 씌워 우회하던 이유이기도 했다.
 * `ThinkingBlock`이 이미 쓰던 방식(`useControlledState` + `Details`)을 그대로 가져와 두
 * 컴포넌트를 합치면서 그 우회 래퍼를 없앤다.
 */
const Root = forwardRef<HTMLDetailsElement, StepBlockRootProps>((props, ref) => {
  const { status = 'done', expanded, defaultExpanded = false, onExpandedChange, className, ...rest } = props;
  const [isExpanded, setExpanded] = useControlledState({ value: expanded, defaultValue: defaultExpanded, onChange: onExpandedChange });
  const handleToggle = (event: FormEvent<HTMLDetailsElement>) => setExpanded(event.currentTarget.open);

  if (rest.kind === 'thinking') {
    // `kind`는 분기용 판별 필드일 뿐 DOM에 흘려보내면 안 되는 값이라(항상 값이 있어
    // `undefined` spread로 자연 소거되는 `Tab.tsx`의 `tree?: never`와 달리) 의도적으로 버린다.
    const { kind: _kind, title = '생각 중', summary, emptyLabel = '생각 내용이 없습니다.', ...detailsProps } = rest;

    return (
      <Details
        {...detailsProps}
        ref={ref}
        open={isExpanded}
        onToggle={handleToggle}
        data-kind="thinking"
        data-component="StepBlock"
        className={mergeClassNames(className, styles['root'])}
      >
        <Details.Summary className={styles['trigger']}>
          <span data-chevron className={styles['chevron']}>
            <Icon iconId="chevronRight" size="sm" />
          </span>
          <span className={styles['header']}>
            <span className={styles['title']}>{title}</span>
            <StatusIndicator status={status} />
          </span>
        </Details.Summary>
        <div className={styles['content']}>{summary ?? emptyLabel}</div>
      </Details>
    );
  }

  // 위 `kind='thinking'` 분기와 같은 이유로 판별 필드를 의도적으로 버린다.
  const { kind: _kind, toolId, toolInput, toolOutput, ...detailsProps } = rest;
  const hasBody = toolInput !== undefined || toolOutput !== undefined;

  return (
    <Details
      {...detailsProps}
      ref={ref}
      open={hasBody && isExpanded}
      onToggle={handleToggle}
      data-kind="tool"
      data-component="StepBlock"
      className={mergeClassNames(className, styles['root'])}
    >
      <Details.Summary className={styles['trigger']}>
        <span data-chevron className={styles['chevron']}>
          <Icon iconId="chevronRight" size="sm" />
        </span>
        <span className={styles['header']}>
          <span className={mergeClassNames(undefined, styles['title'], styles['toolId'])}>{toolId}</span>
          <StatusIndicator status={status} />
        </span>
      </Details.Summary>
      {hasBody ? (
        <div className={styles['content']}>
          {toolInput !== undefined ? <pre className={styles['body']}>{formatBody(toolInput)}</pre> : null}
          {toolOutput !== undefined ? <pre className={styles['output']}>{formatBody(toolOutput)}</pre> : null}
        </div>
      ) : null}
    </Details>
  );
});
Root.displayName = 'StepBlock';

export type { StepBlockRootProps as StepBlockProps };
export const StepBlock = assembleCompound('StepBlock', Root, {});
