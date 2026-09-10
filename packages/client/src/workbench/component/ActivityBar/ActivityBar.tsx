import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { useControlledState } from '#utils/useControlledState';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './ActivityBar.module.css';
import { Container } from '#components/layout/Container';
import { Icon } from '#components/common/Icon';
import { IconButton } from '#components/common/IconButton';
import { ContextMenu } from '#components/common/ContextMenu';
import type { IconId } from '#components/common/Icon';

/** 세로 막대의 아이콘 하나. `isActive`를 직접 주면 `activeId` 계산을 건너뛴다. */
export interface ActivityBarItem {
  readonly id: string;
  readonly iconId: IconId;
  readonly label: string;
  /** 개별 항목의 활성 여부를 직접 정한다 — 안 넘기면 `activeId`/`defaultActiveId` 기준으로 계산된다. */
  readonly isActive?: boolean;
}

/** `onSelect`를 가로챈다 — 표준 `onSelect`가 아니라 항목 선택이다. */
export interface ActivityBarRootProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** 세로로 나열할 아이콘 항목들. */
  readonly items: readonly ActivityBarItem[];
  /** 항목을 클릭하면 그 id와 함께 호출된다(선택) — controlled/uncontrolled 여부와 무관하게 항상 불린다. */
  readonly onSelect?: (id: string) => void;
  /** 활성 항목 id. 넘기면 controlled, 안 넘기면 `defaultActiveId` 로 컴포넌트가 자체 관리한다. */
  readonly activeId?: string;
  /** uncontrolled 모드의 초깃값. */
  readonly defaultActiveId?: string;
  /** 활성 항목이 바뀔 때마다 호출된다(controlled 여부와 무관). */
  readonly onActiveIdChange?: (id: string) => void;
  /** 주어지면 아이콘이 우클릭에 반응해 이 결과를 `ContextMenu.Content`로 띄운다 — 없으면 지금처럼 아무 일도 없다(옵트인). */
  readonly renderItemContextMenu?: (item: ActivityBarItem) => ReactNode;
}

/**
 * VSCode의 활동 표시줄(Activity Bar) — 세로 아이콘 레일. `Sidebar`(도킹 패널)와는 별개의 개념이라
 * 독립 컴포넌트다: `Sidebar`는 이 컴포넌트가 존재하는지조차 모른다. 하나만 눌린 상태(`aria-pressed`)를
 * 유지하고, 고르면 id 를 알려준다.
 *
 * `nav`는 순수 시맨틱 래퍼로만 남는다 — 실제 스크롤(활동이 많아 세로로 넘칠 때)은 안쪽
 * `Container`가 맡는다. 아이콘들의 flex 배치(`.rail`)는 `Container`의 `className`이 아니라
 * children 안쪽에 있어야 한다 — `Container`의 `className`은 바깥 chrome 박스에 붙지, 실제로
 * 스크롤되는 Viewport 안 배치까지 건드리지 않는다.
 */
const Root = forwardRef<HTMLElement, ActivityBarRootProps>(
  ({ items, onSelect, activeId, defaultActiveId = '', onActiveIdChange, renderItemContextMenu, className, ...props }, ref) => {
    const [currentActiveId, setActiveId] = useControlledState({ value: activeId, defaultValue: defaultActiveId, onChange: onActiveIdChange });
    const handleSelect = (id: string) => {
      setActiveId(id);
      onSelect?.(id);
    };

    return (
      <nav ref={ref} {...props} data-component="ActivityBar" className={clsx(className, styles['nav'])}>
        <Container chrome="none" className={styles['container']}>
          <div className={styles['rail']}>
            {items.map((item) => {
              const isActive = item.isActive ?? item.id === currentActiveId;

              return renderItemContextMenu ? (
                <ContextMenu key={item.id}>
                  <ContextMenu.Trigger className={styles['itemContextMenuTrigger']}>
                    <IconButton
                      variant={isActive ? 'default' : 'invisible'}
                      size="medium"
                      aria-label={item.label}
                      aria-pressed={isActive}
                      onClick={() => handleSelect(item.id)}
                      icon={() => <Icon iconId={item.iconId} size="lg" />}
                    />
                  </ContextMenu.Trigger>
                  <ContextMenu.Content>{renderItemContextMenu(item)}</ContextMenu.Content>
                </ContextMenu>
              ) : (
                <IconButton
                  key={item.id}
                  variant={isActive ? 'default' : 'invisible'}
                  size="medium"
                  aria-label={item.label}
                  aria-pressed={isActive}
                  onClick={() => handleSelect(item.id)}
                  icon={() => <Icon iconId={item.iconId} size="lg" />}
                />
              );
            })}
          </div>
        </Container>
      </nav>
    );
  },
);

export type { ActivityBarRootProps as ActivityBarProps };
export const ActivityBar = assembleCompound('ActivityBar', Root, {});
