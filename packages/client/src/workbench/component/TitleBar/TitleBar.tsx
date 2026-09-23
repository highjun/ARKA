import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { CounterLabel } from "@primer/react";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { ModeToggle } from "#component/ModeToggle";
import styles from "./TitleBar.module.css";
import { Palette, PaletteField } from "./Palette";
import type { CommandRow } from "./Palette";

export interface TitleBarProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  readonly ref?: Ref<HTMLDivElement>;

  readonly brandName: string;
  readonly brandIconSrc?: string;

  readonly paletteOpen?: boolean;
  readonly paletteQuery?: string;
  readonly paletteRows?: readonly CommandRow[];
  readonly paletteKeybinding?: string;
  readonly palettePlaceholder?: string;
  readonly onPaletteOpenChange?: (open: boolean) => void;
  readonly onPaletteQueryChange?: (query: string) => void;
  readonly onPaletteSelect?: (actionId: string) => void;

  readonly buildTimestamp?: string;
  readonly buildSha?: string;

  readonly notificationCount?: number;
  readonly onNotificationsOpen?: () => void;

  readonly sidebarVisible?: boolean;
  readonly onSidebarToggle?: () => void;
  readonly bottomOpen?: boolean;
  readonly onBottomToggle?: () => void;
  readonly colorMode?: "light" | "dark";
  readonly onColorModeToggle?: () => void;
}

export const TitleBar = ({
  brandName,
  brandIconSrc,
  paletteOpen = false,
  paletteQuery = "",
  paletteRows = [],
  paletteKeybinding,
  palettePlaceholder,
  onPaletteOpenChange,
  onPaletteQueryChange,
  onPaletteSelect,
  buildTimestamp,
  buildSha,
  notificationCount = 0,
  onNotificationsOpen,
  sidebarVisible = false,
  onSidebarToggle,
  bottomOpen = false,
  onBottomToggle,
  colorMode = "light",
  onColorModeToggle,
  className,
  ref,
  ...props
}: TitleBarProps) => {
  const field = { placeholder: palettePlaceholder, keybinding: paletteKeybinding, onOpenChange: onPaletteOpenChange };

  return (
    <div ref={ref} {...props} data-component="TitleBar" className={clsx(className, styles["root"])}>
      <div data-component="TitleBar/Brand" className={styles["brand"]}>
        {brandIconSrc === undefined ? null : (
          <img src={brandIconSrc} alt="" width={20} height={20} className={styles["brandIcon"]} />
        )}
        <span className={styles["brandName"]}>{brandName}</span>
      </div>

      <PaletteField {...field} />

      <div data-component="TitleBar/Actions" className={styles["actions"]}>
        {buildTimestamp === undefined ? null : (
          <div
            data-component="TitleBar/Build"
            className={styles["build"]}
            title={buildSha === undefined ? buildTimestamp : `${buildTimestamp} (${buildSha})`}
          >
            <span className={styles["buildLine"]}>{buildTimestamp}</span>
            {buildSha === undefined ? null : <span className={styles["buildLine"]}>{buildSha}</span>}
          </div>
        )}

        <PaletteField {...field} compact />

        {onNotificationsOpen === undefined ? null : (
          <span className={styles["bell"]}>
            <IconButton
              variant="invisible"
              size="small"
              aria-label={notificationCount === 0 ? "알림" : `안 읽은 알림 ${String(notificationCount)}건`}
              onClick={onNotificationsOpen}
              icon={() => <Icon iconId="bell" size="sm" />}
            />
            {notificationCount === 0 ? null : (
              <CounterLabel scheme="primary" className={styles["bellBadge"]}>
                {notificationCount}
              </CounterLabel>
            )}
          </span>
        )}

        {onSidebarToggle === undefined ? null : (
          <ModeToggle
            size="small"
            values={["hidden", "visible"]}
            labels={["사이드바 열기", "사이드바 닫기"]}
            value={sidebarVisible ? "visible" : "hidden"}
            onValueChange={() => onSidebarToggle()}
          >
            {[
              <Icon key="off" iconId="layoutSidebarLeftOff" size="sm" />,
              <Icon key="on" iconId="layoutSidebarLeft" size="sm" />,
            ]}
          </ModeToggle>
        )}

        {onBottomToggle === undefined ? null : (
          <ModeToggle
            size="small"
            values={["closed", "open"]}
            labels={["아래 창 열기", "아래 창 닫기"]}
            value={bottomOpen ? "open" : "closed"}
            onValueChange={() => onBottomToggle()}
          >
            {[<Icon key="off" iconId="layoutPanelOff" size="sm" />, <Icon key="on" iconId="layoutPanel" size="sm" />]}
          </ModeToggle>
        )}

        {onColorModeToggle === undefined ? null : (
          <ModeToggle
            size="small"
            values={["light", "dark"]}
            labels={["어둡게 전환", "밝게 전환"]}
            value={colorMode}
            onValueChange={() => onColorModeToggle()}
          >
            {[<Icon key="light" iconId="sun" size="sm" />, <Icon key="dark" iconId="moon" size="sm" />]}
          </ModeToggle>
        )}
      </div>

      <Palette
        open={paletteOpen}
        query={paletteQuery}
        rows={paletteRows}
        onOpenChange={onPaletteOpenChange}
        onQueryChange={onPaletteQueryChange}
        onSelect={onPaletteSelect}
      />
    </div>
  );
};
