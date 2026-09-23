import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { PortalProvider } from "#utils/portal";
import styles from "./Shell.module.css";
import { SplitPageLayout, ThemeProvider } from "@primer/react";
import { Container } from "#component/Container";
import { Bottom } from "../Bottom";
import { Sidebar } from "../Sidebar";
import { TitleBar } from "../TitleBar";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { ActivityBar } from "../ActivityBar";
import type { BottomTab } from "../Bottom";
import type { ActivityBarItem } from "../ActivityBar";
import type { IconId } from "#component/Icon";

interface SidebarActionRow {
  readonly actionId: string;
  readonly iconId: IconId;
  readonly label: string;
}

const COLLAPSED_WIDTH = { min: "48px", default: "48px", max: "48px" } as const;
const EXPANDED_WIDTH = { min: "348px", default: "348px", max: "348px" } as const;
const RESIZABLE_DEFAULT_MIN_WIDTH = "240px";
const RESIZABLE_MAX_WIDTH = "480px";

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

const SETTINGS_ID = "shell.settings";
const SETTINGS_ROW: readonly ActivityBarItem[] = [{ id: SETTINGS_ID, title: "설정", iconId: "settingsGear" }];

export interface ShellProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly colorMode: "light" | "dark";
  readonly isNarrow?: boolean;

  readonly brand?: ReactNode;
  readonly center?: ReactNode;
  readonly actions?: ReactNode;

  readonly sidebars?: readonly ActivityBarItem[];
  readonly activeSidebarId?: string | null;
  readonly onSidebarSelect?: (id: string) => void;
  readonly onSettingsSelect?: () => void;

  readonly sidebarTitle?: string;
  readonly sidebarContent?: ReactNode;
  readonly sidebarActions?: readonly SidebarActionRow[];
  readonly onSidebarActionActivate?: (actionId: string) => void;
  readonly sidebarOpen?: boolean;
  readonly onSidebarOpenChange?: (open: boolean) => void;
  readonly sidebarResizable?: boolean;
  readonly sidebarMinWidth?: `${number}px`;
  readonly sidebarWidthStorageKey?: string;

  readonly bottoms?: readonly BottomTab[];
  readonly bottomContent?: ReactNode;
  readonly onBottomSelect?: (id: string) => void;
  readonly onSidebarToggle?: () => void;
  readonly onBottomToggle?: () => void;

  readonly children: ReactNode;
  readonly overlays?: ReactNode;
}

export const Shell = ({
  colorMode,
  isNarrow,
  brand,
  center,
  actions,
  sidebars,
  activeSidebarId,
  onSidebarSelect,
  onSettingsSelect,
  sidebarTitle,
  sidebarContent,
  sidebarActions,
  onSidebarActionActivate,
  sidebarOpen,
  onSidebarOpenChange,
  sidebarResizable,
  sidebarMinWidth,
  sidebarWidthStorageKey,
  bottoms,
  bottomContent,
  onBottomSelect,
  onSidebarToggle,
  onBottomToggle,
  children,
  overlays,
  className,
  ref,
  ...props
}: ShellProps) => {
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);
  const [uncontrolledSidebarOpen, setUncontrolledSidebarOpen] = useState(false);
  const resolvedSidebarOpen = sidebarOpen ?? uncontrolledSidebarOpen;
  const setSidebarOpen = (next: boolean) => {
    setUncontrolledSidebarOpen(next);
    onSidebarOpenChange?.(next);
  };
  const hasSidebar = sidebars !== undefined;
  const expanded = hasContent(sidebarContent);
  const hasBottom = bottoms !== undefined && bottoms.length > 0;
  const bottomOpen = hasContent(bottomContent);
  const layoutToggles = (
    <>
      {onSidebarToggle === undefined ? null : (
        <IconButton
          variant="invisible"
          size="small"
          aria-label={expanded ? "사이드바 접기" : "사이드바 펼치기"}
          aria-pressed={expanded}
          onClick={onSidebarToggle}
          icon={() => <Icon iconId="layoutSidebarLeft" size="sm" />}
        />
      )}
      {onBottomToggle === undefined || !hasBottom ? null : (
        <IconButton
          variant="invisible"
          size="small"
          aria-label={bottomOpen ? "아래 창 접기" : "아래 창 펼치기"}
          aria-pressed={bottomOpen}
          onClick={onBottomToggle}
          icon={() => <Icon iconId="layoutPanel" size="sm" />}
        />
      )}
    </>
  );

  return (
    <ThemeProvider colorMode={colorMode}>
      <div
        {...props}
        ref={ref}
        data-component="Shell"
        data-narrow={isNarrow ? "" : undefined}
        className={clsx(className, styles["root"])}
      >
        <PortalProvider container={portalRoot ?? undefined}>
          <TitleBar
            className={styles["titleBar"]}
            brand={
              <>
                {hasSidebar && (
                  <IconButton
                    variant="invisible"
                    size="small"
                    className={styles["sidebarToggle"]}
                    aria-label="사이드바 열기"
                    onClick={() => setSidebarOpen(true)}
                    icon={() => <Icon iconId="layoutSidebarLeft" size="sm" />}
                  />
                )}
                {brand}
              </>
            }
            center={center}
            actions={
              <>
                {actions}
                {layoutToggles}
              </>
            }
          />
          <SplitPageLayout className={styles["layout"]}>
            {hasSidebar && (
              <SplitPageLayout.Sidebar
                padding="none"
                divider="line"
                responsiveVariant="fullscreen"
                width={
                  !expanded
                    ? COLLAPSED_WIDTH
                    : sidebarResizable
                      ? {
                          min: sidebarMinWidth ?? RESIZABLE_DEFAULT_MIN_WIDTH,
                          default: EXPANDED_WIDTH.default,
                          max: RESIZABLE_MAX_WIDTH,
                        }
                      : EXPANDED_WIDTH
                }
                resizable={expanded && sidebarResizable}
                widthStorageKey={sidebarResizable ? sidebarWidthStorageKey : undefined}
                aria-label="사이드바"
                data-component="ShellSidebar"
                className={clsx(styles["sidebar"], resolvedSidebarOpen && styles["sidebarOpen"])}
              >
                <div className={styles["sidebarInner"]} data-state={resolvedSidebarOpen ? "open" : "closed"}>
                  <div className={styles["sidebarCloseButtonRow"]}>
                    <IconButton
                      variant="invisible"
                      size="small"
                      aria-label="사이드바 닫기"
                      onClick={() => setSidebarOpen(false)}
                      icon={() => <Icon iconId="close" size="sm" />}
                    />
                  </div>
                  <div className={styles["sidebarBody"]}>
                    <ActivityBar>
                      <ActivityBar.Top
                        items={sidebars}
                        activeId={activeSidebarId}
                        onItemClick={(id) => onSidebarSelect?.(id)}
                      />
                      <ActivityBar.Bottom items={SETTINGS_ROW} onItemClick={() => onSettingsSelect?.()} />
                    </ActivityBar>
                    {expanded && (
                      <Sidebar density="compact" className={styles["sidebarSurface"]}>
                        <Sidebar.Header
                          title={sidebarTitle}
                          actions={
                            sidebarActions !== undefined && sidebarActions.length > 0 ? (
                              <>
                                {sidebarActions.map((action) => (
                                  <IconButton
                                    key={action.actionId}
                                    variant="invisible"
                                    size="small"
                                    aria-label={action.label}
                                    onClick={() => onSidebarActionActivate?.(action.actionId)}
                                    icon={() => <Icon iconId={action.iconId} size="sm" />}
                                  />
                                ))}
                              </>
                            ) : undefined
                          }
                        />
                        <Sidebar.Body>
                          <Container chrome="none" className={styles["sidebarSurfaceBody"]}>
                            {sidebarContent}
                          </Container>
                        </Sidebar.Body>
                      </Sidebar>
                    )}
                  </div>
                </div>
              </SplitPageLayout.Sidebar>
            )}
            <SplitPageLayout.Content padding="none" className={styles["content"]}>
              <div className={styles["contentFill"]}>
                <div className={styles["main"]}>{children}</div>
                {hasBottom && (
                  <Bottom className={styles["bottom"]}>
                    <Bottom.Header tabs={bottoms} onSelect={(id) => onBottomSelect?.(id)} />
                    {hasContent(bottomContent) && <Bottom.Panel>{bottomContent}</Bottom.Panel>}
                  </Bottom>
                )}
              </div>
            </SplitPageLayout.Content>
          </SplitPageLayout>
          {overlays}
        </PortalProvider>
        <div ref={setPortalRoot} className={styles["portalRoot"]} />
      </div>
    </ThemeProvider>
  );
};
