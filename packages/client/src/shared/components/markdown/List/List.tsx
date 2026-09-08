import { createContext, forwardRef, useContext } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './List.module.css';

export type ListVariant = 'unordered' | 'ordered' | 'checkbox';

export interface ListRootProps extends Omit<HTMLAttributes<HTMLUListElement | HTMLOListElement>, 'children'> {
  /** 목록 종류. 기본값 `'unordered'`. */
  readonly variant?: ListVariant;
  /** `List.Item` 등 목록 항목들. */
  readonly children?: ReactNode;
}

export interface ListItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'children'> {
  /** 이 항목만 체크박스로 강제 표시. */
  readonly checkbox?: boolean;
  /** 체크 여부(읽기전용, GFM 그대로 반영). */
  readonly checked?: boolean;
  /** 항목 내용. */
  readonly children?: ReactNode;
}

interface ListContextValue {
  readonly kind: ListVariant;
}

/**
 * 목록 종류를 `data-list-kind`/`data-list-item-kind` 로 드러내고 구조를 그린다 — 종류마다 어떤
 * 마커·들여쓰기를 쓸지는 스타일 결정이라 CSS 가 `data-[…]:` 로 받는다.
 *
 * Context 는 여기 있다. `Item`이 부모의 종류를 알아야 체크박스 목록에서 마커를 뺄지 정할 수
 * 있는데, 그 배선은 구조의 일부다.
 */
const ListContext = createContext<ListContextValue | null>(null);

const Root = forwardRef<HTMLUListElement | HTMLOListElement, ListRootProps>(
  ({ variant = 'unordered', className, children, ...props }, ref) => {
    const Element = variant === 'ordered' ? 'ol' : 'ul';

    return (
      <ListContext.Provider value={{ kind: variant }}>
        <Element
          ref={ref as React.Ref<HTMLOListElement>}
          {...props}
          data-list-kind={variant}
          data-component="List"
          className={clsx(className, styles['List'])}
        >
          {children}
        </Element>
      </ListContext.Provider>
    );
  },
);

/** 목록 항목 하나 — 부모 `variant`가 `checkbox`거나 자신의 `checkbox`가 true면 체크박스가 붙는다. */
const Item = forwardRef<HTMLLIElement, ListItemProps>(
  ({ checkbox = false, checked = false, className, children, ...props }, ref) => {
    const context = useContext(ListContext);
    const itemKind = checkbox || context?.kind === 'checkbox' ? 'checkbox' : 'default';

    return (
      <li
        ref={ref}
        {...props}
        data-list-item-kind={itemKind}
        data-component="List.Item"
        className={clsx(className, styles['ListItem'])}
      >
        {itemKind === 'checkbox' ? <input type="checkbox" checked={checked} disabled readOnly aria-hidden="true" /> : null}
        {children}
      </li>
    );
  },
);

export type { ListRootProps as ListProps };

/**
 * Storybook Docs 서브컴포넌트 섹션 전용 재노출 — 공개 API는 `List.Item`으로만 접근한다
 * (`index.ts`엔 안 싣는다). react-docgen-typescript가 파일의 최상위 export만 컴포넌트로
 * 인식해서, 비export 지역 함수(`Item`)엔 `__docgenInfo`가 안 붙는다(2026-09-06 실측 확인) —
 * Docs 페이지의 서브컴포넌트 Props 표를 뽑으려면 이 재노출이 필요하다.
 */
export { Item as ListItemDoc };

export const List = assembleCompound('List', Root, { Item });
