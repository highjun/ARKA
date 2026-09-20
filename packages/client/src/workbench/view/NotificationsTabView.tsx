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

const Row = ({ item, onDismiss }: { readonly item: Notification; readonly onDismiss: () => void }) => (
  <li className={styles["row"]} data-severity={item.severity} data-unread={item.isRead ? undefined : ""}>
    <Icon iconId={GLYPH[item.severity satisfies Severity]} size="sm" className={styles["glyph"]} />
    <span className={styles["text"]}>
      <Text size="medium" tone={item.isRead ? "muted" : "default"}>
        {item.message}
      </Text>
      <Text size="small" tone="muted">
        {formatAgo(item.at, Date.now())}
      </Text>
    </span>
    <IconButton
      variant="invisible"
      size="small"
      aria-label="알림 지우기"
      onClick={onDismiss}
      icon={() => <Icon iconId="close" size="sm" />}
    />
  </li>
);

/**
 * 쌓인 알림을 열어 보는 탭. 제목 줄의 종이 이것을 연다.
 *
 * **여는 순간 다 읽음이다** — 줄마다 읽음을 누르게 하면 할 일이 하나 더 생긴다. 그 처리는
 * 여는 명령(`shell.openNotifications`)이 한다 — `view/`는 효과를 못 쓴다(→ ADR 0007).
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
            <Row key={item.id} item={item} onDismiss={() => notifications.dismiss(item.id)} />
          ))}
        </ul>
      )}
    </div>
  );
});
