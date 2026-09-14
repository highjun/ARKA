import { useState } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { PortalProvider } from "#utils/portal";
import styles from "./Shell.module.css";
import { SplitPageLayout, ThemeProvider } from "@primer/react";
import { Container } from "#component/Container";
import { Panel } from "#component/Panel";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { ActivityBar } from "../ActivityBar";
import type { ActivityBarItem } from "../ActivityBar";
import { Menu } from "#component/Menu";

/** 패널이 없으면(아이콘 바만) 좁게, 있으면(아이콘 바+패널) 넓게 — 폭 값 자체는 워크벤치가 쓰던
 * 값을 그대로 컴포넌트 기본으로 가져온다. */
const COLLAPSED_WIDTH = { min: "48px", default: "48px", max: "48px" } as const;
const EXPANDED_WIDTH = { min: "304px", default: "304px", max: "304px" } as const;
/** `sidebarResizable`일 때 쓰는 기본 최소/최대 — 최소는 `sidebarMinWidth`로 덮어쓸 수 있다. */
const RESIZABLE_DEFAULT_MIN_WIDTH = "240px";
const RESIZABLE_MAX_WIDTH = "480px";

const hasContent = (node: ReactNode): boolean => node !== null && node !== undefined && node !== false;

/** `children`을 막는다 — 슬롯이 정해져 있어 아무 자식이나 받지 않는다. */
export interface ShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** Primer `ThemeProvider`에 그대로 전달되는 색 모드. */
  readonly colorMode: "light" | "dark";

  /** 사이드바 토글 버튼(모바일 전용) 뒤에 이어지는 앱 정체성. */
  readonly brand?: ReactNode;
  /** 헤더 우측 — 실행 가능한 액션들. */
  readonly actions?: ReactNode;

  /** 주면 사이드바(활동 표시줄+패널)가 생긴다 — 안 주면 사이드바 자체가 없다(헤더의 모바일 토글
   * 버튼도 안 뜬다). 세로 아이콘 레일은 `ActivityBar`를 그대로 쓴다. */
  readonly activityItems?: readonly ActivityBarItem[];
  /** 활동 아이콘을 클릭하면 그 id와 함께 호출된다. */
  readonly onActivitySelect?: (id: string) => void;
  /** 활성 활동에 대응하는 패널 콘텐츠. `null`/`undefined`면 패널이 없어(아이콘 바만) 사이드바가
   * 좁게 뜬다. */
  readonly panelContent?: ReactNode;
  /** 패널 위에 뜨는 제목(예: "탐색기"). 둘 다(`panelTitle`·`panelActions`) 없으면 헤더 행 자체가
   * 없다 — 지금까지처럼 패널이 바로 시작한다. */
  readonly panelTitle?: string;
  /** 패널 헤더의 "..." 더보기 버튼 안에 뜨는 메뉴 항목들(`Menu.Item` 등). 없으면 버튼 자체가
   * 없다. */
  readonly panelActions?: ReactNode;
  /** 사이드바를 드래그로 폭 조절 가능하게 한다. 기본 `false`(고정폭) — 켜면 240~480px 사이에서
   * 늘리고 줄일 수 있다(최소는 `sidebarMinWidth`로 덮어쓸 수 있다). */
  readonly sidebarResizable?: boolean;
  /** `sidebarResizable`일 때의 최소 폭. 예: `'200px'`. */
  readonly sidebarMinWidth?: `${number}px`;
  /** `sidebarResizable`일 때 폭을 기억할 `localStorage` 키. 안 주면 새로고침마다 기본폭으로
   * 돌아간다. */
  readonly sidebarWidthStorageKey?: string;
  /** 모바일 드로어(사이드바) 열림 여부(제어). */
  readonly sidebarOpen?: boolean;
  /** 기본값은 `undefined`(비제어) — `sidebarOpen`을 주면 제어로 전환된다. 모바일 드로어 개폐는
   * 이 컴포넌트가 직접 갖는 상태다(Primer `Sidebar`엔 이런 개념이 없다). */
  readonly defaultSidebarOpen?: boolean;
  /** 사이드바 열림 여부가 바뀔 때마다(제어 여부 무관) 호출된다. */
  readonly onSidebarOpenChange?: (open: boolean) => void;
  /** 사이드바 `<aside>`의 `aria-label`. */
  readonly sidebarAriaLabel?: string;

  /** 본문 — `Tab` 등 무엇이든. Shell 은 안에 뭐가 들었는지 모른다. */
  readonly children: ReactNode;
  /** `SplitPageLayout` 밖, `PortalProvider` 안의 형제로 뜬다 — `CommandPalette` 등. */
  readonly overlays?: ReactNode;
}

/**
 * "앱 진입점" 성격의 최상위 컨테이너 — Header/Sidebar/Content 구조를 Shell 이 직접 조립한다.
 * 예전엔 `Shell.Header`/`Shell.Sidebar`를 소비자가 직접 조립해서 `SplitPageLayout`에 자식으로
 * 넘겼는데, 그러면 `useSlots`가 컴포넌트 참조 동일성으로 슬롯을 골라내는 문제(`asSlot` 우회가
 * 필요했던 이유)가 생겼다 — Shell 이 `SplitPageLayout.Header`/`.Sidebar`/`.Content`를 **자기
 * 내부에서 직접** 만들어 넘기면 `child.type === SplitPageLayout.Header`가 항상 참이라 그 문제
 * 자체가 생기지 않는다.
 *
 * `ThemeProvider` + 포탈 배선(`portalRoot` + `PortalProvider`)도 이 컴포넌트가 흡수한다 — 어떤
 * 앱이 Shell 을 쓰든 똑같이 필요한 순수 구조적 보일러플레이트라, 앱마다 손으로 다시 짜지 않는다.
 *
 * `SplitPageLayout`도 `ThemeProvider`도 forwardRef가 아니라서(둘 다 컴파일된 소스로 확인 —
 * plain 함수), ref는 우리가 직접 렌더하는 wrapper div로 보낸다.
 */
export const Shell = ({
  colorMode,
  brand,
  actions,
  activityItems,
  onActivitySelect,
  panelContent,
  panelTitle,
  panelActions,
  sidebarResizable,
  sidebarMinWidth,
  sidebarWidthStorageKey,
  sidebarOpen,
  defaultSidebarOpen,
  onSidebarOpenChange,
  sidebarAriaLabel,
  children,
  overlays,
  className,
  ref,
  ...props
}: ShellProps) => {
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);
  const [uncontrolledSidebarOpen, setUncontrolledSidebarOpen] = useState(defaultSidebarOpen ?? false);
  const resolvedSidebarOpen = sidebarOpen ?? uncontrolledSidebarOpen;
  const setSidebarOpen = (next: boolean) => {
    setUncontrolledSidebarOpen(next);
    onSidebarOpenChange?.(next);
  };
  const hasSidebar = activityItems !== undefined;
  const expanded = hasContent(panelContent);

  return (
    <ThemeProvider colorMode={colorMode}>
      <div {...props} ref={ref} data-component="Shell" className={clsx(className, styles["root"])}>
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
                aria-label={sidebarAriaLabel}
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
                    <ActivityBar items={activityItems} onSelect={onActivitySelect} />
                    {expanded && (
                      <Panel
                        density="compact"
                        className={styles["sidebarPanel"]}
                        title={panelTitle}
                        actions={
                          hasContent(panelActions) ? (
                            <Menu>
                              <Menu.Trigger asChild>
                                <IconButton
                                  variant="invisible"
                                  size="small"
                                  aria-label="더 보기"
                                  icon={() => <Icon iconId="ellipsis" size="sm" />}
                                />
                              </Menu.Trigger>
                              <Menu.Content>{panelActions}</Menu.Content>
                            </Menu>
                          ) : undefined
                        }
                      >
                        <Container chrome="none" className={styles["sidebarPanelBody"]}>
                          {panelContent}
                        </Container>
                      </Panel>
                    )}
                  </div>
                </div>
              </SplitPageLayout.Sidebar>
            )}
            <SplitPageLayout.Content padding="none" className={styles["content"]}>
              <div className={styles["contentFill"]}>{children}</div>
            </SplitPageLayout.Content>
          </SplitPageLayout>
          {overlays}
        </PortalProvider>
        <div ref={setPortalRoot} className={styles["portalRoot"]} />
      </div>
    </ThemeProvider>
  );
};
