import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { SidebarBody } from "./Body";
import { SidebarHeader } from "./Header";
import styles from "./Sidebar.module.css";

/**
 * 머리의 빽빽함. 기본값 `'comfortable'`.
 *
 * `'compact'`는 VS Code 탐색기 머리처럼 낮고 좁다 — 사이드바처럼 세로가 귀한 자리에 쓴다.
 * 값은 루트가 들고 `data-density`로 싣는다. 머리 크기를 고르는 것은 CSS다.
 */
type SidebarDensity = "comfortable" | "compact";

/** 레일 오른쪽 그릇. `children`은 `.Header`와 `.Body`다. */
export interface SidebarRootProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** 머리의 빽빽함. */
  readonly density?: SidebarDensity;
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** `.Header` + `.Body`. */
  readonly children?: ReactNode;
}

/**
 * 레일 오른쪽 사이드바 — 머리와 본문 둘뿐인 그릇. `shared/`에 있던 `Panel`이 2026-09-18에
 * `workbench/`로 왔고, 2026-09-20에 이름과 부품이 Figma를 따라 `Sidebar`가 됐다.
 *
 * **아래 창은 이것이 아니다.** 한때 둘을 `Panel` 하나로 묶고 머리를 `kind` 축으로 갈랐는데,
 * 머리에 무엇이 오는지는 그릇이 정할 일이 아니었다 — 아래 창은 `Bottom`이 따로 든다.
 *
 * **머리와 본문을 부품으로 가른 까닭**은 머리가 제목일 수도 탭 줄일 수도 있어서다. 루트가
 * `title`·`actions`를 쥐고 있으면 그 둘 말고는 못 넣는다.
 */
const SidebarRoot = ({ density = "comfortable", className, children, ref, ...props }: SidebarRootProps) => (
  <div ref={ref} {...props} data-density={density} data-component="Sidebar" className={clsx(className, styles["root"])}>
    {children}
  </div>
);

/**
 * 부품은 `Object.assign`으로 붙인다 — `Sidebar.Header`·`Sidebar.Body`.
 *
 * 부품 함수의 이름이 `Sidebar<부품>`인 것은 react-docgen-typescript가 파일의 최상위 export만
 * 컴포넌트로 인식해서다 — Docs 페이지의 서브컴포넌트 Props 표가 그 이름으로 붙는다.
 */
export const Sidebar = Object.assign(SidebarRoot, { Header: SidebarHeader, Body: SidebarBody });
