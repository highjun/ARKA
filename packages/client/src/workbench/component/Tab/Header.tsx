import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import type { TabRow } from "./shared";
import { useTabClassNames } from "./TabContext";

/**
 * `title`·`onSelect`를 가로챈다 — 네이티브 툴팁과 텍스트 선택 이벤트가 아니라 탭 제목과 탭 고르기다.
 * 닫기 버튼이 탭 **밖**에 있다 — 안에 두면 중첩 상호작용이 된다(알려진 한계, TASK-66).
 */
export interface TabHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title" | "onSelect"> {
  /** 그릴 탭 — 아이콘·제목·미리보기·더티가 여기서 온다. */
  readonly tab: TabRow;
  /** 이 탭이 지금 선택된(보이는) 탭인가. */
  readonly isActive?: boolean;
  /** 헤더를 클릭하면 호출된다. */
  readonly onSelect?: () => void;
  /** 닫기 버튼을 클릭하면 호출된다. 없으면 닫기 버튼 자체가 안 뜬다. */
  readonly onClose?: () => void;
}

/** 닫기 버튼 클릭 — 헤더 자신의 클릭(탭 활성화)으로 안 번지게 막고 나서 닫는다. */
const handleHeaderCloseClick = (onClose: () => void) => (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
  onClose();
};

/** 닫기 버튼 자체는 드래그 대상이 아니다 — 부모 헤더의 드래그 제스처로 안 번지게 막는다. */
const preventDragStart = (event: { preventDefault: () => void }) => event.preventDefault();

/** 탭 하나의 제목 줄 — 아이콘·제목·닫기 버튼을 담는다. `Tab.Group`/`Tab.Strip`이 내부에서 쓴다. */
export const TabHeader = ({
  tab,
  isActive = false,
  onSelect,
  onClose,
  onKeyDown,
  className,
  ...props
}: TabHeaderProps) => {
  const classNames = useTabClassNames();
  /** 키보드로도 고른다 — 띠가 자기 핸들러(화살표 이동·재정렬)를 먼저 돌리고, 아직 안 먹었으면 Enter·Space가 고르기다. */
  const handleKeyDown: TabHeaderProps["onKeyDown"] = (event) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onSelect?.();
    }
  };
  const closeButton = (pinned: boolean) =>
    onClose === undefined ? null : (
      <IconButton
        variant="invisible"
        size="small"
        aria-label={`${tab.title} 닫기`}
        draggable={false}
        className={pinned ? classNames.headerCloseButtonPinned : classNames.headerCloseButtonHover}
        onClick={handleHeaderCloseClick(onClose)}
        onDragStart={preventDragStart}
        icon={() => <Icon iconId="close" size="sm" />}
      />
    );

  return (
    <div
      {...props}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role={props.role ?? "tab"}
      aria-selected={props["aria-selected"] ?? isActive}
      data-active={isActive ? "" : undefined}
      data-dirty={tab.isDirty ? "" : undefined}
      data-component="Tab.Header"
      className={clsx(className, classNames.header)}
    >
      <span className={classNames.headerIcon}>{tab.icon}</span>
      <span data-preview={tab.isPreview ? "" : undefined} className={classNames.headerLabel}>
        {tab.title}
      </span>
      {/*
       * 활성 탭만 `headerActionSlot`(레이아웃 폭을 차지하는 자리)을 마운트한다. 비활성 탭도 닫을
       * 수 있어야 하므로 `headerCloseButtonHover`가 `.header` 위에 겹쳐 뜬다(폭에 안 낀다).
       * 닫기 버튼은 항상 보이고 항상 눌린다 — 터치 기기에 hover가 없어 "안 보이지만 눌리는"
       * 버튼이 탭 전환을 가로챘다. dirty 점도 같이 없앴다: 그 자리를 닫기 버튼이 차지한다.
       */}
      {isActive ? <span className={classNames.headerActionSlot}>{closeButton(true)}</span> : closeButton(false)}
    </div>
  );
};
