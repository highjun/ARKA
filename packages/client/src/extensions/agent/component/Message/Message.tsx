import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./Message.module.css";
import { Timestamp } from "#component/Timestamp";

/** 정렬과 색만 가른다 — `system`은 양쪽 어디에도 붙지 않는다. */
export type MessageAuthor = "user" | "agent" | "system";

const isImageSource = (avatar?: unknown): avatar is string =>
  typeof avatar === "string" &&
  (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("data:"));

const getAuthorLabel = (author: MessageAuthor) => {
  if (author === "user") return "User";
  if (author === "agent") return "Agent";
  return "System";
};

const getAvatarInitial = (author: MessageAuthor) => {
  if (author === "user") return "U";
  if (author === "agent") return "AI";
  return "SYS";
};

/** `children`을 막는다 — 본문은 `children` 대신 정해진 슬롯으로 받는다. */
export interface MessageProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** 루트 `article`로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 메시지 발신 주체 — 아바타 초기값·라벨 표시를 결정한다. */
  readonly author: MessageAuthor;
  /** 발신 시각(epoch ms). 없으면 타임스탬프 자리를 빈 상태로 남겨 레이아웃을 유지한다. */
  readonly timestamp?: number;
  /** 아바타에 표시할 콘텐츠. `http(s)://`·`data:` 로 시작하는 문자열이면 이미지로, 그 외엔 그대로 렌더한다(기본값은 역할별 이니셜). */
  readonly avatar?: ReactNode | string;
  /** 메시지 본문. */
  readonly children?: ReactNode;
}

/** 말풍선 한 개 — 아바타·발신자 라벨·시각을 곁들여 본문을 그린다. 정렬과 색은 `author`가 정한다. */
export const Message = ({ author, timestamp, avatar, children, className, ref, ...props }: MessageProps) => {
  const authorLabel = getAuthorLabel(author);
  const avatarLabel = getAvatarInitial(author);

  return (
    <article
      ref={ref}
      {...props}
      data-author={author}
      data-component="Message"
      className={clsx(className, styles["root"])}
    >
      <div className={styles["headerRow"]}>
        <span data-author={author} className={styles["avatar"]} aria-hidden="true">
          {isImageSource(avatar) ? (
            <img src={avatar} alt="" className={styles["avatarImage"]} />
          ) : (
            (avatar ?? avatarLabel)
          )}
        </span>
        <div className={styles["meta"]}>
          <div className={styles["authorLabel"]}>{authorLabel}</div>
          <div className={styles["timestampRow"]}>
            {typeof timestamp === "number" ? (
              <Timestamp epoch={timestamp} mode="datetime" format="HH:mm" />
            ) : (
              <span className={styles["timestampPlaceholder"]}>&nbsp;</span>
            )}
          </div>
        </div>
      </div>
      <div className={styles["body"]}>{children}</div>
    </article>
  );
};
