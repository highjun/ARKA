import { useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { assembleCompound } from '#utils/assembleCompound';
import { mergeClassNames } from '#utils/mergeClassNames';
import { useSessionList } from './useSessionList';
import styles from './SessionList.module.css';
import { IconButton } from '@primer/react';
import { Icon } from '#components/common/Icon';
import { SidebarLayout } from '#components/shell/SidebarLayout';
import { Menu } from '#components/shell/Menu';
import { SessionRow } from '#components/agent/SessionRow';
import type { StatusIndicatorStatus } from '#components/agent/StatusIndicator';

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

export interface AgentSessionItem {
  readonly id: string;
  readonly title: string;
  readonly excerpt?: string;
  readonly status?: StatusIndicatorStatus;
  readonly unread?: number | null;
  readonly timestamp?: number;
  readonly disabled?: boolean;
  /** true면 보관된 세션 — 기본으로는 목록에서 숨겨지고, 헤더의 필터를 켜면 나타난다. */
  readonly archived?: boolean;
}

export interface SessionListRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 표시할 세션 목록. */
  readonly sessions: readonly AgentSessionItem[];
  /** 넘기면 controlled, 안 넘기면 `defaultActiveId`로 컴포넌트가 자체 관리한다. */
  readonly activeId?: string;
  /** uncontrolled 모드의 시작 활성 세션. */
  readonly defaultActiveId?: string;
  /** 활성 세션이 바뀔 때마다 호출된다(controlled 여부와 무관). */
  readonly onActiveChange?: (session: AgentSessionItem) => void;
  /** 활성 세션의 id만 필요할 때 쓴다(controlled 여부와 무관) — 세션 객체 전체가 필요하면
   * `onActiveChange`를 쓴다. */
  readonly onActiveIdChange?: (activeId: string) => void;
  /** 세션이 하나도 없을 때 보여줄 안내. */
  readonly emptyLabel?: ReactNode;
  /** 목록 상단 제목. */
  readonly heading?: ReactNode;
  /** 넘기면 헤더에 세션 생성 버튼이 나타난다. */
  readonly onCreateSession?: () => void;
  /** 세션 생성 버튼의 접근성 라벨. */
  readonly createLabel?: string;
  /** 주어지면 헤더에 "..." 더보기 메뉴가 나타난다 — `Menu.Item` 모양의 children을 그대로
   * `Menu.Content`에 넣는다(Shell의 `panelActions`와 같은 관용구). */
  readonly moreActions?: ReactNode;
}

/**
 * 에이전트 세션 목록 — 헤더(제목 + 생성 버튼)와 세션 행(`SessionRow`)들을 그린다. 활성 세션 선택은
 * `useSessionList`가 controlled/uncontrolled 하이브리드로 관리하며, disabled 세션은 선택되지 않는다.
 */
const Root = ({
  sessions,
  activeId,
  defaultActiveId,
  onActiveChange,
  onActiveIdChange,
  emptyLabel = '세션이 없습니다.',
  heading = 'Sessions',
  onCreateSession,
  createLabel = '새 세션 만들기',
  moreActions,
  className,
  ...props
}: SessionListRootProps) => {
  const { activeId: currentActiveId, selectSession } = useSessionList({ activeId, defaultActiveId, onActiveChange, onActiveIdChange });
  const [showArchived, setShowArchived] = useState(false);
  const visibleSessions = showArchived ? sessions : sessions.filter((session) => !session.archived);

  const actions = (
    <>
      <Menu>
        <Menu.Trigger asChild>
          <IconButton variant="invisible" size="small" aria-label="세션 필터" icon={() => <Icon iconId="archive" size="sm" />} />
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item onSelect={() => setShowArchived((current) => !current)}>
            {showArchived ? <Icon iconId="check" size="sm" /> : null}
            보관된 세션 표시
          </Menu.Item>
        </Menu.Content>
      </Menu>
      {onCreateSession ? (
        <IconButton variant="invisible" size="small" aria-label={createLabel} onClick={onCreateSession} icon={() => <Icon iconId="add" size="sm" />} />
      ) : null}
      {hasContent(moreActions) ? (
        <Menu>
          <Menu.Trigger asChild>
            <IconButton variant="invisible" size="small" aria-label="더 보기" icon={() => <Icon iconId="ellipsis" size="sm" />} />
          </Menu.Trigger>
          <Menu.Content>{moreActions}</Menu.Content>
        </Menu>
      ) : null}
    </>
  );

  return (
    <div className={mergeClassNames(className, styles['root'])} {...props} data-component="SessionList">
      <SidebarLayout title={<span className={styles['heading']}>{heading}</span>} actions={actions}>
        {visibleSessions.length === 0 ? (
          <div className={styles['empty']}>{emptyLabel}</div>
        ) : (
          <div role="listbox" aria-label="Agent sessions" className={styles['list']}>
            {visibleSessions.map((session) => (
              <SessionRow
                key={session.id}
                title={session.title}
                excerpt={session.excerpt}
                status={session.status}
                timestamp={session.timestamp}
                unread={session.unread}
                isActive={session.id === currentActiveId}
                disabled={session.disabled}
                onSelect={() => selectSession(session)}
              />
            ))}
          </div>
        )}
      </SidebarLayout>
    </div>
  );
};
Root.displayName = 'SessionList';

export type { SessionListRootProps as SessionListProps };
export const SessionList = assembleCompound('SessionList', Root, {});
