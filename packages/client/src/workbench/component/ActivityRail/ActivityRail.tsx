import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import styles from "./ActivityRail.module.css";
import { Container } from "#component/Container";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Menu } from "#component/Menu";
import type { IconId } from "#component/Icon";

/** 활동 레일에 그릴 사이드바 한 줄 — `workbench/viewmodel`의 `SidebarRow`와 구조가 같다(부품은 그 층을 못 본다). */
export interface SidebarRow {
  readonly id: string;
  readonly title: string;
  readonly iconId: IconId;
  readonly isActive: boolean;
}

/** `onSelect`를 가로챈다 — 표준 `onSelect`가 아니라 항목 선택이다. */
export interface ActivityRailProps extends Omit<ComponentPropsWithoutRef<"nav">, "onSelect"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 세로로 나열할 사이드바들. 활성 여부는 줄이 든다 — 컴포넌트가 스스로 들지 않는다. */
  readonly items: readonly SidebarRow[];
  /** 항목을 클릭하면 그 id와 함께 호출된다. */
  readonly onSelect?: (id: string) => void;
  /** 주어지면 아이콘이 우클릭에 반응해 이 결과를 `Menu.Content`로 띄운다 — 없으면 아무 일도 없다(옵트인). */
  readonly renderItemMenu?: (item: SidebarRow) => ReactNode;
  /** 맨 아래 설정 톱니를 누르면 호출된다. */
  readonly onSettingsSelect?: () => void;
}

/**
 * VSCode의 활동 표시줄(Activity Bar) — 사이드바를 고르는 세로 아이콘 줄. 맨 아래에 설정 톱니가 따로
 * 붙는다 — 사이드바가 아니다. `Sidebar`(도킹 패널)와는 별개의 개념이라 독립 컴포넌트다.
 *
 * `nav`는 순수 시맨틱 래퍼로만 남는다 — 실제 스크롤(활동이 많아 세로로 넘칠 때)은 안쪽
 * `Container`가 맡는다. 아이콘들의 flex 배치(`.rail`)는 `Container`의 `className`이 아니라
 * children 안쪽에 있어야 한다 — `Container`의 `className`은 바깥 chrome 박스에 붙지, 실제로
 * 스크롤되는 Viewport 안 배치까지 건드리지 않는다.
 */
export const ActivityRail = ({
  items,
  onSelect,
  renderItemMenu,
  onSettingsSelect,
  className,
  ref,
  ...props
}: ActivityRailProps) => (
  <nav ref={ref} {...props} data-component="ActivityRail" className={clsx(className, styles["nav"])}>
    <Container chrome="none" className={styles["container"]}>
      <div className={styles["rail"]}>
        {items.map((item) => {
          const button = (
            <IconButton
              key={item.id}
              variant={item.isActive ? "default" : "invisible"}
              size="medium"
              aria-label={item.title}
              aria-pressed={item.isActive}
              onClick={() => onSelect?.(item.id)}
              icon={() => <Icon iconId={item.iconId} size="lg" />}
            />
          );

          return renderItemMenu ? (
            <Menu kind="context" key={item.id}>
              <Menu.Trigger className={styles["itemContextMenuTrigger"]}>{button}</Menu.Trigger>
              <Menu.Content>{renderItemMenu(item)}</Menu.Content>
            </Menu>
          ) : (
            button
          );
        })}
      </div>
    </Container>
    <div className={styles["footer"]}>
      <IconButton
        variant="invisible"
        size="medium"
        aria-label="설정"
        onClick={onSettingsSelect}
        icon={() => <Icon iconId="settingsGear" size="lg" />}
      />
    </div>
  </nav>
);
