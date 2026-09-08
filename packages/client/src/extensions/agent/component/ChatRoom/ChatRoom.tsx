import type { HTMLAttributes, ReactNode } from 'react';
import { assembleCompound } from '#utils/assembleCompound';
import { mergeClassNames } from '#utils/mergeClassNames';
import styles from './ChatRoom.module.css';
import { IconButton } from '@primer/react';
import { Icon } from '#components/common/Icon';
import { SidebarLayout } from '#components/layout/SidebarLayout';
import { InputComposer } from '../InputComposer';
import { Message } from '../Message';
import { StatusIndicator } from '../StatusIndicator';
import type { MessageRole } from '../Message';
import type { InputComposerMode } from '../InputComposer';
import type { StatusIndicatorStatus } from '../StatusIndicator';

/** 채팅방 로그에 표시할 메시지 한 건. */
export interface ChatRoomMessage {
  /** 메시지 고유 id — 리스트 렌더링의 `key`로도 쓰인다. */
  readonly id: string;
  /** 메시지 발화자 역할. */
  readonly role: MessageRole;
  /** 발화 시각(ms epoch) — 상대 시간 표시에 쓰인다. */
  readonly timestamp?: number;
  /** 아바타 — 커스텀 노드 또는 이미지 URL 문자열. */
  readonly avatar?: ReactNode | string;
  /** 메시지 본문. */
  readonly content?: ReactNode;
}

export interface ChatRoomRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
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

const Root = ({
  title = 'Agent chat',
  status = 'running',
  messages = [],
  children,
  composer,
  mode,
  defaultMode,
  onModeChange,
  emptyLabel = '아직 메시지가 없습니다.',
  onEdit,
  onArchive,
  onSetting,
  actions,
  className,
  ...props
}: ChatRoomRootProps) => {
  const isEmpty = messages.length === 0;
  const defaultActions = (
    <>
      <IconButton variant="invisible" size="small" aria-label="Edit chat" onClick={onEdit} icon={() => <Icon iconId="pencil" size="sm" />} />
      <IconButton variant="invisible" size="small" aria-label="Archive chat" onClick={onArchive} icon={() => <Icon iconId="archive" size="sm" />} />
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
    <section className={mergeClassNames(className, styles['root'])} {...props} data-component="ChatRoom">
      <SidebarLayout
        title={
          <div className={styles['titleGroup']}>
            <StatusIndicator status={status} />
            <div className={styles['title']}>{title}</div>
          </div>
        }
        actions={actions ?? defaultActions}
      >
        <div role="log" aria-live="polite" className={styles['log']}>
          {children ??
            (isEmpty ? (
              <div className={styles['empty']}>{emptyLabel}</div>
            ) : (
              messages.map((message) => (
                <Message key={message.id} role={message.role} timestamp={message.timestamp} avatar={message.avatar}>
                  {message.content}
                </Message>
              ))
            ))}
        </div>
        <div className={styles['composerSlot']}>
          {composer ?? <InputComposer mode={mode} defaultMode={defaultMode} onModeChange={onModeChange} />}
        </div>
      </SidebarLayout>
    </section>
  );
};
Root.displayName = 'ChatRoom';

export type { ChatRoomRootProps as ChatRoomProps };
export const ChatRoom = assembleCompound('ChatRoom', Root, {});
