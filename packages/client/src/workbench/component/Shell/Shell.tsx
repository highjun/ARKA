import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { PortalProvider } from "#utils/portal";
import styles from "./Shell.module.css";
import { SplitPageLayout, ThemeProvider } from "@primer/react";
import { Container } from "#component/Container";
import { Panel } from "../Panel";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { ActivityBar } from "../ActivityBar";
import type { SidebarRow } from "../ActivityBar";
import type { IconId } from "#component/Icon";

interface SidebarActionRow {
  readonly actionId: string;
  readonly iconId: IconId;
  readonly label: string;
}

interface BottomRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly isActive: boolean;
}

const COLLAPSED_WIDTH = { min: "48px", default: "48px", max: "48px" } as const;
const EXPANDED_WIDTH = { min: "304px", default: "304px", max: "304px" } as const;
const RESIZABLE_DEFAULT_MIN_WIDTH = "240px";
const RESIZABLE_MAX_WIDTH = "480px";

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

export interface ShellProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly colorMode: "light" | "dark";
  readonly isNarrow?: boolean;

  readonly brand?: ReactNode;
  readonly actions?: ReactNode;

  readonly sidebars?: readonly SidebarRow[];
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

  readonly bottoms?: readonly BottomRow[];
  readonly bottomContent?: ReactNode;
  readonly onBottomSelect?: (id: string) => void;

  readonly children: ReactNode;
  readonly overlays?: ReactNode;
}

export const Shell = ({
  colorMode,
  isNarrow,
  brand,
  actions,
  sidebars,
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
          <SplitPageLayout className={styles["layout"]}>
            <SplitPageLayout.Header padding="none" divider="line">
              <div className={styles["headerRow"]}>
                <span className={styles["headerGroup"]}>
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
                </span>
                <span className={styles["headerGroup"]}>{actions}</span>
              </div>
            </SplitPageLayout.Header>
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
                    <ActivityBar items={sidebars} onSelect={onSidebarSelect} onSettingsSelect={onSettingsSelect} />
                    {expanded && (
                      <Panel
                        density="compact"
                        className={styles["sidebarPanel"]}
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
                      >
                        <Container chrome="none" className={styles["sidebarPanelBody"]}>
                          {sidebarContent}
                        </Container>
                      </Panel>
                    )}
                  </div>
                </div>
              </SplitPageLayout.Sidebar>
            )}
            <SplitPageLayout.Content padding="none" className={styles["content"]}>
              <div className={styles["contentFill"]}>
                <div className={styles["main"]}>{children}</div>
                {hasBottom && (
                  <section aria-label="아래 창" data-component="ShellBottom" className={styles["bottom"]}>
                    <div role="tablist" aria-orientation="horizontal" className={styles["bottomStrip"]}>
                      {bottoms.map((bottom) => (
                        <button
                          key={bottom.id}
                          type="button"
                          role="tab"
                          aria-selected={bottom.isActive}
                          data-active={bottom.isActive ? "" : undefined}
                          className={styles["bottomTab"]}
                          onClick={() => onBottomSelect?.(bottom.id)}
                        >
                          <Icon iconId={bottom.iconId} size="sm" />
                          {bottom.title}
                        </button>
                      ))}
                    </div>
                    {hasContent(bottomContent) && (
                      <div role="tabpanel" className={styles["bottomBody"]}>
                        {bottomContent}
                      </div>
                    )}
                  </section>
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
