import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Blankslate } from "@primer/react/experimental";
import { Icon } from "#ui/Icon";
import { IconButton } from "#ui/IconButton";
import { Text } from "#ui/Text";
import type { Notification, Severity } from "../model/INotifications";
import styles from "./NotificationsTabView.module.css";

const GLYPH = { info: "bell", warning: "warning", error: "error" } as const;

export const formatAgo = (at: number, now: number): string => {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${String(minutes)}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}시간 전`;
  return `${String(Math.floor(hours / 24))}일 전`;
};

const Row = ({
  item,
  onRead,
  onDismiss,
}: {
  readonly item: Notification;
  readonly onRead: () => void;
  readonly onDismiss: () => void;
}) => {
  const body = (
    <>
      <Text size="medium" tone={item.isRead ? "muted" : "default"}>
        {item.message}
      </Text>
      <Text size="small" tone="muted">
        {formatAgo(item.at, Date.now())}
      </Text>
    </>
  );

  return (
    <li className={styles["row"]} data-severity={item.severity} data-unread={item.isRead ? undefined : ""}>
      <Icon iconId={GLYPH[item.severity satisfies Severity]} size="sm" className={styles["glyph"]} />
      {item.isRead ? (
        <span className={styles["text"]}>{body}</span>
      ) : (
        <button type="button" className={styles["read"]} onClick={onRead}>
          {body}
        </button>
      )}
      <IconButton
        variant="invisible"
        size="small"
        aria-label="알림 지우기"
        onClick={onDismiss}
        icon={() => <Icon iconId="close" size="sm" />}
      />
    </li>
  );
};

export const NotificationsTabView = observer(() => {
  const notifications = useViewModel("arka.workbench.notificationViewModel");
  const { items } = notifications;

  return (
    <div data-component="NotificationsTabView" className={styles["root"]}>
      <div className={styles["toolbar"]}>
        <Text size="small" tone="muted">
          {items.length === 0 ? "온 것이 없다" : `${String(items.length)}건`}
        </Text>
        {items.length === 0 ? null : (
          <button type="button" className={styles["clear"]} onClick={() => notifications.clear()}>
            모두 지우기
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <Blankslate>
          <Blankslate.Heading>온 것이 없다</Blankslate.Heading>
          <Blankslate.Description>알림이 오면 여기 쌓인다. 제목 줄의 종이 안 읽은 수를 든다.</Blankslate.Description>
        </Blankslate>
      ) : (
        <ul className={styles["rows"]}>
          {[...items].reverse().map((item) => (
            <Row
              key={item.id}
              item={item}
              onRead={() => notifications.markRead(item.id)}
              onDismiss={() => notifications.dismiss(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
});
