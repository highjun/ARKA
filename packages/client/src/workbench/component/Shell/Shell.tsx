import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { PortalProvider } from "#lib/portal";
import styles from "./Shell.module.css";
import { SplitPageLayout, ThemeProvider } from "@primer/react";
import { Bottom } from "../Bottom";
import { Sidebar } from "../Sidebar";
import { TitleBar } from "../TitleBar";
import type { CommandRow } from "../TitleBar";
import type { BottomItem } from "../Bottom";
import type { SidebarItem } from "../Sidebar";

const COLLAPSED_WIDTH = { min: "48px", default: "48px", max: "48px" } as const;
const EXPANDED_WIDTH = { min: "348px", default: "348px", max: "348px" } as const;
const RESIZABLE_DEFAULT_MIN_WIDTH = "240px";
const RESIZABLE_MAX_WIDTH = "480px";

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

const SETTINGS_ID = "shell.settings";
const SETTINGS_ROW: readonly SidebarItem[] = [{ id: SETTINGS_ID, title: "설정", iconId: "settingsGear" }];

export interface ShellProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly colorMode: "light" | "dark";
  readonly onColorModeToggle?: () => void;
  readonly isNarrow?: boolean;

  readonly brandName: string;
  readonly brandIconSrc?: string;
  readonly paletteOpen?: boolean;
  readonly paletteQuery?: string;
  readonly paletteRows?: readonly CommandRow[];
  readonly paletteKeybinding?: string;
  readonly onPaletteOpenChange?: (open: boolean) => void;
  readonly onPaletteQueryChange?: (query: string) => void;
  readonly onPaletteSelect?: (actionId: string) => void;

  readonly buildTimestamp?: string;
  readonly buildSha?: string;

  readonly notificationCount?: number;
  readonly onNotificationsOpen?: () => void;

  readonly sidebars?: readonly SidebarItem[];
  readonly activeSidebarId?: string | null;
  readonly onSidebarSelect?: (id: string) => void;
  readonly onSettingsSelect?: () => void;

  readonly sidebarTitle?: string;
  /** id 로 본문을 그린다. 등록된 사이드바를 한꺼번에 받아 열어본 것을 계속 들고 있으려면 이 꼴이어야 한다. */
  readonly renderSidebarContent?: (id: string) => ReactNode;
  readonly sidebarOpen?: boolean;
  readonly onSidebarOpenChange?: (open: boolean) => void;
  readonly sidebarResizable?: boolean;
  readonly sidebarMinWidth?: `${number}px`;
  readonly sidebarWidthStorageKey?: string;

  readonly bottoms?: readonly BottomItem[];
  readonly activeBottomId?: string | null;
  readonly bottomContent?: ReactNode;
  readonly onBottomSelect?: (id: string) => void;
  readonly onSidebarToggle?: () => void;
  readonly onBottomToggle?: () => void;

  readonly children: ReactNode;
  readonly overlays?: ReactNode;
}

export const Shell = ({
  colorMode,
  onColorModeToggle,
  isNarrow,
  brandName,
  brandIconSrc,
  paletteOpen,
  paletteQuery,
  paletteRows,
  paletteKeybinding,
  onPaletteOpenChange,
  onPaletteQueryChange,
  onPaletteSelect,
  buildTimestamp,
  buildSha,
  notificationCount,
  onNotificationsOpen,
  sidebars,
  activeSidebarId,
  onSidebarSelect,
  onSettingsSelect,
  sidebarTitle,
  renderSidebarContent,
  sidebarOpen,
  onSidebarOpenChange,
  sidebarResizable,
  sidebarMinWidth,
  sidebarWidthStorageKey,
  bottoms,
  activeBottomId,
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
  /** 좁은 화면에서는 사이드바 단추가 드로어를 여닫고, 넓은 화면에서는 패널을 접고 편다. */
  const narrow = isNarrow === true;
  /** 넓은 화면의 접기는 바깥이 맡는다 — 콜백이 없으면 그릴 단추도 없다. 드로어는 Shell 이 제 손으로 여닫는다. */
  const hasSidebarToggle = sidebars !== undefined && (narrow || onSidebarToggle !== undefined);
  const activeSidebar = activeSidebarId ?? null;
  const expanded = activeSidebar !== null && renderSidebarContent !== undefined;
  const hasBottom = bottoms !== undefined && bottoms.length > 0;
  const bottomOpen = hasContent(bottomContent);
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
            brandName={brandName}
            brandIconSrc={brandIconSrc}
            paletteOpen={paletteOpen}
            paletteQuery={paletteQuery}
            paletteRows={paletteRows}
            paletteKeybinding={paletteKeybinding}
            onPaletteOpenChange={onPaletteOpenChange}
            onPaletteQueryChange={onPaletteQueryChange}
            onPaletteSelect={onPaletteSelect}
            buildTimestamp={buildTimestamp}
            buildSha={buildSha}
            notificationCount={notificationCount}
            onNotificationsOpen={onNotificationsOpen}
            sidebarVisible={narrow ? resolvedSidebarOpen : expanded}
            onSidebarToggle={
              hasSidebarToggle ? () => (narrow ? setSidebarOpen(!resolvedSidebarOpen) : onSidebarToggle?.()) : undefined
            }
            bottomOpen={bottomOpen}
            onBottomToggle={hasBottom ? onBottomToggle : undefined}
            colorMode={colorMode}
            onColorModeToggle={onColorModeToggle}
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
                <Sidebar data-state={resolvedSidebarOpen ? "open" : "closed"}>
                  <Sidebar.RailTop
                    items={sidebars}
                    activeId={activeSidebarId}
                    onItemClick={(id) => onSidebarSelect?.(id)}
                  />
                  <Sidebar.RailBottom items={SETTINGS_ROW} onItemClick={() => onSettingsSelect?.()} />
                  {activeSidebar === null || renderSidebarContent === undefined ? null : (
                    <Sidebar.Panel title={sidebarTitle} body={renderSidebarContent(activeSidebar)} />
                  )}
                </Sidebar>
              </SplitPageLayout.Sidebar>
            )}
            <SplitPageLayout.Content padding="none" className={styles["content"]}>
              <div className={styles["contentFill"]}>
                <div className={styles["main"]}>{children}</div>
                {hasBottom && (
                  <Bottom className={styles["bottom"]}>
                    <Bottom.Header
                      items={bottoms}
                      activeId={activeBottomId ?? null}
                      onItemSelect={(id) => onBottomSelect?.(id)}
                    />
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
