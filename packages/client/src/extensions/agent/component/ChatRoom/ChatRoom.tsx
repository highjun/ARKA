import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./ChatRoom.module.css";
import { IconButton } from "#component/IconButton";
import { Icon } from "#component/Icon";
import { InputComposer } from "../InputComposer";
import { Message } from "../Message";
import { StatusIndicator } from "../StatusIndicator";
import type { MessageAuthor } from "../Message";
import type { InputComposerMode } from "../InputComposer";
import type { StatusIndicatorStatus } from "../StatusIndicator";

/** 채팅방 로그에 표시할 메시지 한 건. */
export interface ChatRoomMessage {
  /** 메시지 고유 id — 리스트 렌더링의 `key`로도 쓰인다. */
  readonly id: string;
  /** 메시지 발화자 역할. */
  readonly author: MessageAuthor;
  /** 발화 시각(ms epoch) — 상대 시간 표시에 쓰인다. */
  readonly timestamp?: number;
  /** 아바타 — 커스텀 노드 또는 이미지 URL 문자열. */
  readonly avatar?: ReactNode | string;
  /** 메시지 본문. */
  readonly content?: ReactNode;
}

/** `children`을 막는다 — 슬롯이 정해져 있어 아무 자식이나 받지 않는다. */
export interface ChatRoomProps extends Omit<ComponentPropsWithoutRef<"section">, "title" | "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 헤더에 표시할 채팅방 제목. */
  readonly title?: string;
  /** 헤더의 상태 인디케이터. */
  readonly status?: StatusIndicatorStatus;
  /** 로그 영역에 렌더할 메시지 목록 — `children`을 넘기면 무시된다. */
  readonly messages?: readonly ChatRoomMessage[];
  /** `messages` 대신 로그 영역을 완전히 커스터마이즈할 때 쓰는 탈출구. */
  readonly children?: ReactNode;
  /** 하단 입력 슬롯 — 안 넘기면 기본 `InputComposer`를 쓴다. `composer`로 완전히 커스텀하면
   * 무시된다(그 컴포넌트가 자기 모드를 직접 소유·관찰한다). */
  readonly composer?: ReactNode;
  /** 기본 `InputComposer`의 controlled 모드. */
  readonly mode?: InputComposerMode;
  /** 기본 `InputComposer`의 uncontrolled 초기 모드. */
  readonly defaultMode?: InputComposerMode;
  /** 기본 `InputComposer`의 모드가 바뀔 때마다(controlled 여부 무관) 호출된다. */
  readonly onModeChange?: (mode: InputComposerMode) => void;
  /** `messages`가 비었을 때 로그 영역에 보여줄 안내 문구. */
  readonly emptyLabel?: ReactNode;
  /** 편집 액션 버튼 클릭 핸들러. `actions`를 넘기면 기본 버튼 3개가 안 뜨므로 무시된다. */
  readonly onEdit?: () => void;
  /** 보관 액션 버튼 클릭 핸들러. `actions`를 넘기면 기본 버튼 3개가 안 뜨므로 무시된다. */
  readonly onArchive?: () => void;
  /** 설정 액션 버튼 클릭 핸들러. `actions`를 넘기면 기본 버튼 3개가 안 뜨므로 무시된다. */
  readonly onSetting?: () => void;
  /** 헤더 오른쪽 액션을 완전히 교체한다 — 안 넘기면 편집/보관/설정 기본 버튼 3개를 쓴다. */
  readonly actions?: ReactNode;
}

/** 헤더·로그·작성창을 세로로 쌓은 대화 한 판. 로그는 `messages` 또는 `children`으로 채운다. */
export const ChatRoom = ({
  ref,
  title = "Agent chat",
  status = "running",
  messages = [],
  children,
  composer,
  mode,
  defaultMode,
  onModeChange,
  emptyLabel = "아직 메시지가 없습니다.",
  onEdit,
  onArchive,
  onSetting,
  actions,
  className,
  ...props
}: ChatRoomProps) => {
  const isEmpty = messages.length === 0;
  const defaultActions = (
    <>
      <IconButton
        variant="invisible"
        size="small"
        aria-label="Edit chat"
        onClick={onEdit}
        icon={() => <Icon iconId="pencil" size="sm" />}
      />
      <IconButton
        variant="invisible"
        size="small"
        aria-label="Archive chat"
        onClick={onArchive}
        icon={() => <Icon iconId="archive" size="sm" />}
      />
      <IconButton
        variant="invisible"
        size="small"
        aria-label="Chat settings"
        onClick={onSetting}
        icon={() => <Icon iconId="settingsGear" size="sm" />}
      />
    </>
  );

  return (
    <section ref={ref} className={clsx(className, styles["root"])} {...props} data-component="ChatRoom">
      {/* 머리는 제가 그린다 — `Panel` 은 워크벤치의 것이라 확장이 못 쓴다(2026-09-18). 토큰은 `Panel` 머리와 같다. */}
      <header className={styles["header"]}>
        <div className={styles["titleGroup"]}>
          <StatusIndicator status={status} />
          <div className={styles["title"]}>{title}</div>
        </div>
        <div className={styles["actions"]}>{actions ?? defaultActions}</div>
      </header>
      <div className={styles["body"]}>
        <div role="log" aria-live="polite" className={styles["log"]}>
          {children ??
            (isEmpty ? (
              <div className={styles["empty"]}>{emptyLabel}</div>
            ) : (
              messages.map((message) => (
                <Message key={message.id} author={message.author} timestamp={message.timestamp} avatar={message.avatar}>
                  {message.content}
                </Message>
              ))
            ))}
        </div>
        <div className={styles["composerSlot"]}>
          {composer ?? <InputComposer mode={mode} defaultMode={defaultMode} onModeChange={onModeChange} />}
        </div>
      </div>
    </section>
  );
};
