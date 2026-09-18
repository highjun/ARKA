import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useSessionList } from "./useSessionList";
import styles from "./SessionList.module.css";
import { SessionListItem } from "./Item";
import type { StatusIndicatorStatus } from "../StatusIndicator";

/** 목록이 그리는 데 필요한 최소 정보. 대화 내용은 여기 없다. */
export interface AgentSession {
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

/** `children`을 막는다 — 항목은 `sessions`로만 들어온다. */
export interface SessionListProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** 표시할 세션 목록. */
  readonly sessions: readonly AgentSession[];
  /** 넘기면 controlled, 안 넘기면 `defaultActiveId`로 컴포넌트가 자체 관리한다. */
  readonly activeId?: string;
  /** uncontrolled 모드의 시작 활성 세션. */
  readonly defaultActiveId?: string;
  /** 활성 세션이 바뀔 때마다 호출된다(controlled 여부와 무관). */
  readonly onActiveChange?: (session: AgentSession) => void;
  /** 활성 세션의 id만 필요할 때 쓴다(controlled 여부와 무관) — 세션 객체 전체가 필요하면
   * `onActiveChange`를 쓴다. */
  readonly onActiveIdChange?: (activeId: string) => void;
  /** 세션이 하나도 없을 때 보여줄 안내. */
  readonly emptyLabel?: ReactNode;
  /**
   * 머리는 그리지 않는다 — 커널이 사이드바 패널을 두르고 제목·액션을 놓는다(`SidebarContentDescriptor`).
   * 보관 세션을 거르는 것도 부르는 쪽 몫이다(거르는 토글이 그 머리에 산다). 2026-09-18 까지 있던
   * 제 머리 경로(제목 + 필터 메뉴 + 생성 버튼)는 앱에서 쓰이지 않아 걷었다.
   */
}

/**
 * 에이전트 세션 목록 — 세션 행(`SessionList.Item`)들을 그린다. 활성 세션 선택은
 * `useSessionList`가 controlled/uncontrolled 하이브리드로 관리하며, disabled 세션은 선택되지 않는다.
 */
const SessionListRoot = ({
  sessions,
  activeId,
  defaultActiveId,
  onActiveChange,
  onActiveIdChange,
  emptyLabel = "세션이 없습니다.",
  className,
  ...props
}: SessionListProps) => {
  const { activeId: currentActiveId, selectSession } = useSessionList({
    activeId,
    defaultActiveId,
    onActiveChange,
    onActiveIdChange,
  });
  const visibleSessions = sessions;

  const body =
    visibleSessions.length === 0 ? (
      <div className={styles["empty"]}>{emptyLabel}</div>
    ) : (
      <div role="listbox" aria-label="Agent sessions" className={styles["list"]}>
        {visibleSessions.map((session) => (
          <SessionListItem
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
    );

  return (
    <div className={clsx(className, styles["root"])} {...props} data-component="SessionList">
      {body}
    </div>
  );
};

/** 부품 이름이 `SessionList<부품>`인 것은 react-docgen이 최상위 export만 보기 때문이다. */
export const SessionList = Object.assign(SessionListRoot, { Item: SessionListItem });
