import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Blankslate } from "@primer/react/experimental";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Text } from "#component/Text";
import type { Notification, Severity } from "../model/INotifications";
import styles from "./NotificationsTabView.module.css";

/** 무게마다 글리프가 다르다 — 색은 CSS가 `data-severity`로 고른다. */
const GLYPH = { info: "bell", warning: "warning", error: "error" } as const;

/**
 * 상대 시각. **분 아래로는 안 센다** — 알림에서 초는 읽는 사람에게 뜻이 없다.
 * 순수 함수로 둬서 지금 시각을 밖에서 넣는다(테스트가 붙잡을 수 있게).
 */
export const formatAgo = (at: number, now: number): string => {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${String(minutes)}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}시간 전`;
  return `${String(Math.floor(hours / 24))}일 전`;
};

/**
 * 줄 하나. **안 읽은 것만 누를 수 있다** — 읽은 줄에 아무 일도 안 하는 단추를 두면 초점만
 * 늘고 하는 일이 없다. 누르는 이름은 메시지 그대로다(메일함과 같다).
 */
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

/**
 * 쌓인 알림을 열어 보는 탭. 제목 줄의 종이 이것을 연다.
 *
 * **누른 것이 읽은 것이다** — 여는 것만으로 다 읽음이 되면 안 본 것이 배지에서 사라진다.
 */
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
