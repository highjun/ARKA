import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import styles from "./ActivityBar.module.css";
import { Container } from "#component/Container";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Menu } from "#component/Menu";
import type { IconId } from "#component/Icon";

/** 레일에 그릴 한 줄 — `workbench/viewmodel`의 `SidebarRow`와 구조가 같다(부품은 그 층을 못 본다). */
export interface SidebarRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
}

/** `children`을 막는다 — 줄은 `items`가 정한다. `onSelect`를 가로챈다. */
interface ItemsProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 이 묶음에 그릴 줄들. */
  readonly items: readonly SidebarRow[];
  /** 항목을 클릭하면 그 id와 함께 호출된다. */
  readonly onSelect?: (id: string) => void;
  /** 주어지면 아이콘이 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다 — 없으면 아무 일도 없다(옵트인). */
  readonly renderItemMenu?: (item: SidebarRow) => ReactNode;
}

/** 위 묶음. **활성은 여기만 든다.** */
interface ActivityBarTopProps extends ItemsProps {
  /** 지금 열린 것의 id. 그 아이콘에 밝은 막대가 선다. */
  readonly activeId?: string | null;
}

/**
 * 아래 묶음. **`activeId`가 없다** — 계정·설정은 사이드바가 아니라서 "지금 여기"가 없다.
 * 활성이 될 수 없는 것에 활성 prop 을 두면 그리는 쪽이 매번 `false`를 지어내야 한다.
 */
type ActivityBarBottomProps = ItemsProps;

/** `children`을 막지 않는다 — 여기 들어오는 것은 `.Top`과 `.Bottom`뿐이다. */
export interface ActivityBarRootProps extends ComponentPropsWithoutRef<"nav"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
}

/** 줄 하나를 단추로. 우클릭 메뉴를 주면 그 단추를 `Menu`로 감싼다. */
const 줄 = (item: SidebarRow, isActive: boolean, props: ItemsProps) => {
  const button = (
    <IconButton
      key={item.id}
      variant={isActive ? "default" : "invisible"}
      size="medium"
      aria-label={item.title}
      aria-pressed={isActive}
      onClick={() => props.onSelect?.(item.id)}
      icon={() => <Icon iconId={item.iconId} size="lg" />}
    />
  );

  return props.renderItemMenu ? (
    <Menu kind="context" key={item.id}>
      <Menu.Trigger className={styles["itemContextMenuTrigger"]}>{button}</Menu.Trigger>
      <Menu.Content>{props.renderItemMenu(item)}</Menu.Content>
    </Menu>
  ) : (
    button
  );
};

/**
 * 위 묶음 — 기능들. 넘치면 **여기만** 스크롤된다.
 *
 * `Container`의 `className`은 바깥 chrome 박스에 붙지, 실제로 스크롤되는 Viewport 안 배치까지
 * 건드리지 않는다 — 그래서 아이콘들의 flex 배치(`.rail`)는 children 안쪽에 있다.
 */
const ActivityBarTop = ({
  items,
  activeId,
  onSelect,
  renderItemMenu,
  className,
  ref,
  ...props
}: ActivityBarTopProps) => (
  <Container chrome="none" className={clsx(className, styles["container"])}>
    <div ref={ref} {...props} data-component="ActivityBar/Top" className={styles["rail"]}>
      {items.map((item) => 줄(item, item.id === activeId, { items, onSelect, renderItemMenu }))}
    </div>
  </Container>
);

/** 아래 묶음 — 계정·설정. 위가 넘쳐 스크롤이 생겨도 제자리에 남는다. */
const ActivityBarBottom = ({ items, onSelect, renderItemMenu, className, ref, ...props }: ActivityBarBottomProps) => (
  <div ref={ref} {...props} data-component="ActivityBar/Bottom" className={clsx(className, styles["bottom"])}>
    {items.map((item) => 줄(item, false, { items, onSelect, renderItemMenu }))}
  </div>
);

/**
 * VSCode의 활동 표시줄(Activity Bar) — 사이드바를 고르는 세로 아이콘 줄. `Sidebar`(도킹 패널)와는
 * 별개의 개념이라 독립 컴포넌트다.
 *
 * **위와 아래는 완전히 별개다.** 한 목록에 여백을 끼워 가른 것이 아니라 부품이 둘이고 사이를
 * 늘어나는 빈 칸이 민다. 그래서 묶음마다 받는 것이 다르다 — 위는 `activeId`를 들고 아래는 안 든다.
 *
 * `nav`는 순수 시맨틱 래퍼로만 남는다 — 실제 스크롤은 `.Top` 안쪽 `Container`가 맡는다.
 */
const ActivityBarRoot = ({ children, className, ref, ...props }: ActivityBarRootProps) => (
  <nav ref={ref} {...props} data-component="ActivityBar" className={clsx(className, styles["nav"])}>
    {children}
  </nav>
);

export const ActivityBar = Object.assign(ActivityBarRoot, { Top: ActivityBarTop, Bottom: ActivityBarBottom });
