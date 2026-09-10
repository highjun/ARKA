import type { HTMLAttributes, ReactNode } from 'react';
import { assembleCompound } from '#utils/assembleCompound';
import { mergeClassNames } from '#utils/mergeClassNames';
import styles from './Message.module.css';
import { Timestamp } from '#components/common/Timestamp';

/** 정렬과 색만 가른다 — `system`은 양쪽 어디에도 붙지 않는다. */
export type MessageRole = 'user' | 'agent' | 'system';

const isImageSource = (avatar?: unknown): avatar is string =>
  typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:'));

const getRoleLabel = (role: MessageRole) => {
  if (role === 'user') return 'User';
  if (role === 'agent') return 'Agent';
  return 'System';
};

const getAvatarLabel = (role: MessageRole) => {
  if (role === 'user') return 'U';
  if (role === 'agent') return 'AI';
  return 'SYS';
};

/** `style`을 막는다 — 말풍선의 폭과 색은 토큰이 정한다. */
export interface MessageRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'children'> {
  /** 메시지 발신 주체 — 아바타 초기값·라벨 표시를 결정한다. */
  readonly role: MessageRole;
  /** 발신 시각(epoch ms). 없으면 타임스탬프 자리를 빈 상태로 남겨 레이아웃을 유지한다. */
  readonly timestamp?: number;
  /** 아바타에 표시할 콘텐츠. `http(s)://`·`data:` 로 시작하는 문자열이면 이미지로, 그 외엔 그대로 렌더한다(기본값은 역할별 이니셜). */
  readonly avatar?: ReactNode | string;
  /** 메시지 본문. */
  readonly children?: ReactNode;
}

const Root = ({ role, timestamp, avatar, children, className, ...props }: MessageRootProps) => {
  const roleLabel = getRoleLabel(role);
  const avatarLabel = getAvatarLabel(role);

  return (
    <article {...props} data-role={role} data-component="Message" className={mergeClassNames(className, styles['root'])}>
      <div className={styles['headerRow']}>
        <span data-role={role} className={styles['avatar']} aria-hidden="true">
          {isImageSource(avatar) ? <img src={avatar} alt="" className={styles['avatarImage']} /> : (avatar ?? avatarLabel)}
        </span>
        <div className={styles['meta']}>
          <div className={styles['roleLabel']}>{roleLabel}</div>
          <div className={styles['timestampRow']}>
            {typeof timestamp === 'number' ? (
              <Timestamp epoch={timestamp} mode="datetime" format="HH:mm" />
            ) : (
              <span className={styles['timestampPlaceholder']}>&nbsp;</span>
            )}
          </div>
        </div>
      </div>
      <div className={styles['body']}>{children}</div>
    </article>
  );
};
Root.displayName = 'Message';

export type { MessageRootProps as MessageProps };
export const Message = assembleCompound('Message', Root, {});
