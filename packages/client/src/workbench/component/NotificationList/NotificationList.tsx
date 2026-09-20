import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { IconButton } from "#component/IconButton";
import { Icon } from "#component/Icon";
import { Text } from "#component/Text";
import type { IconId } from "#component/Icon";
import styles from "./NotificationList.module.css";

type NotificationListItem = {
  readonly id: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
};

export interface NotificationListProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly items: readonly NotificationListItem[];
  readonly onDismiss?: (id: string) => void;
}

const ICON: Record<NotificationListItem["severity"], IconId> = { info: "bell", warning: "warning", error: "error" };

export const NotificationList = ({ items, onDismiss, className, ref, ...props }: NotificationListProps) => {
  if (items.length === 0) return null;
  return (
    <div
      ref={ref}
      {...props}
      data-component="NotificationList"
      role="region"
      aria-label="알림"
      className={clsx(className, styles["root"])}
    >
      {items.map((item) => (
        <div key={item.id} role="status" data-severity={item.severity} className={styles["item"]}>
          <Icon iconId={ICON[item.severity]} size="sm" />
          <Text size="small" className={styles["message"]}>
            {item.message}
          </Text>
          <IconButton
            variant="invisible"
            size="small"
            aria-label="알림 닫기"
            icon={() => <Icon iconId="close" size="sm" />}
            onClick={() => onDismiss?.(item.id)}
          />
        </div>
      ))}
    </div>
  );
};
