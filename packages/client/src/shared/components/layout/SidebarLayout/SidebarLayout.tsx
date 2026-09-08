import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { assembleCompound } from '#utils/assembleCompound';
import { mergeClassNames } from '#utils/mergeClassNames';
import styles from './SidebarLayout.module.css';

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

export interface SidebarLayoutRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
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
const Root = forwardRef<HTMLDivElement, SidebarLayoutRootProps>(
  ({ title, actions, children, className, ...props }, ref) => {
    const hasHeader = title !== undefined || hasContent(actions);

    return (
      <div ref={ref} {...props} data-component="SidebarLayout" className={mergeClassNames(className, styles['root'])}>
        {hasHeader ? (
          <header className={styles['header']}>
            <div className={styles['title']}>{title}</div>
            {hasContent(actions) ? <div className={styles['actions']}>{actions}</div> : null}
          </header>
        ) : null}
        <div className={styles['body']}>{children}</div>
      </div>
    );
  },
);
Root.displayName = 'SidebarLayout';

export type { SidebarLayoutRootProps as SidebarLayoutProps };
export const SidebarLayout = assembleCompound('SidebarLayout', Root, {});
