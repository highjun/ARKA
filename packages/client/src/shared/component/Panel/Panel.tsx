import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import styles from './Panel.module.css';

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

/**
 * 머리의 빽빽함. 기본값 `'comfortable'`.
 *
 * `'compact'`는 VS Code 탐색기 머리처럼 낮고 좁다 — 사이드바처럼 세로가 귀한 자리에 쓴다.
 */
type PanelDensity = 'comfortable' | 'compact';

/** `children`을 막는다 — 슬롯이 정해져 있어 아무 자식이나 받지 않는다. */
export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** 머리의 빽빽함. */
  readonly density?: PanelDensity;
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 헤더에 표시할 제목 — 아이콘 접두어 등을 조합할 수 있도록 문자열이 아니라 `ReactNode`다. */
  readonly title?: ReactNode;
  /** 헤더 오른쪽에 놓을 액션(버튼·`Menu` 등) — 어떤 조합이든 소비처가 직접 조립해 넘긴다. */
  readonly actions?: ReactNode;
  /** 본문. */
  readonly children?: ReactNode;
}

/**
 * "제목 + 액션" 헤더와 본문, 고정된 2영역 레이아웃 — 컴파운드가 아니라 `Container`와 같은 단일
 * props 컴포넌트로 간다(header/body가 재배치·반복될 이유가 없어 컴파운드로 얻는 이득이 없다).
 * `title`·`actions` 둘 다 없으면 헤더 행 자체를 렌더하지 않는다(`Shell`의 `panelTitle`/
 * `panelActions` 없을 때 규칙과 같다).
 */
export const Panel = ({ title, actions, children, density = 'comfortable', className, ref, ...props }: PanelProps) => {
  const hasHeader = title !== undefined || hasContent(actions);

  return (
    <div ref={ref} {...props} data-density={density} data-component="Panel" className={clsx(className, styles['root'])}>
      {hasHeader ? (
        <header className={styles['header']}>
          <div className={styles['title']}>{title}</div>
          {hasContent(actions) ? <div className={styles['actions']}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={styles['body']}>{children}</div>
    </div>
  );
};

