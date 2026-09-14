import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Icon } from '#component/Icon';
import { IconButton } from '#component/IconButton';
import type { IconId } from '#component/Icon';
import { useTabClassNames } from './TabContext';

/** `title`을 가로챈다 — 네이티브 툴팁이 아니라 탭 제목이다. */
export interface TabHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** 이 탭이 지금 선택된(보이는) 탭인가. */
  readonly isActive?: boolean;
  /** 저장 안 된 변경이 있는가 — 제목 옆에 점으로 표시된다. */
  readonly isDirty?: boolean;
  /**
   * 미리보기 자리에 있는 탭 — 다음 파일을 열면 이 탭이 갈린다.
   *
   * VSCode 와 같이 제목을 기울여 알린다. `title` 을 `ReactNode` 로 넓히지 않고 플래그를 두는
   * 이유는, 그러면 말줄임·`aria-label`·드래그 라벨이 전부 임의의 노드를 다뤄야 하기 때문이다.
   */
  readonly isPreview?: boolean;
  /** 닫기 버튼을 클릭하면 호출된다. */
  readonly onClose: () => void;
  /** 탭 아이콘. */
  readonly iconId: IconId;
  /** 있으면 `iconId` 대신 이걸로 렌더한다. */
  readonly icon?: () => ReactNode;
  /** 탭 제목. */
  readonly title: string;
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
  isActive = false,
  isDirty = false,
  isPreview = false,
  onClose,
  iconId,
  icon,
  title,
  className,
  ...props
}: TabHeaderProps) => {
  const classNames = useTabClassNames();

  return (
    <div
      {...props}
      role={props.role ?? 'tab'}
      aria-selected={props['aria-selected'] ?? isActive}
      data-active={isActive ? '' : undefined}
      data-dirty={isDirty ? '' : undefined}
      data-component="Tab.Header"
      className={clsx(className, classNames.header)}
    >
      {icon ? (
        <span className={classNames.headerIcon}>{icon()}</span>
      ) : (
        <Icon iconId={iconId} size="sm" className={classNames.headerIcon} />
      )}
      <span data-preview={isPreview ? '' : undefined} className={classNames.headerLabel}>
        {title}
      </span>
      {/*
       * 활성 탭만 `headerActionSlot`(레이아웃 폭을 차지하는 자리)을 마운트한다. 비활성 탭도 닫을
       * 수 있어야 하므로 `headerCloseButtonHover`가 `.header` 위에 겹쳐 뜬다(폭에 안 낀다).
       * 닫기 버튼은 항상 보이고 항상 눌린다 — 터치 기기에 hover가 없어 "안 보이지만 눌리는"
       * 버튼이 탭 전환을 가로챘다. dirty 점도 같이 없앴다: 그 자리를 닫기 버튼이 차지한다.
       */}
      {isActive ? (
        <span className={classNames.headerActionSlot}>
          <IconButton
            variant="invisible"
            size="small"
            aria-label={`${title} 닫기`}
            draggable={false}
            className={classNames.headerCloseButtonPinned}
            onClick={handleHeaderCloseClick(onClose)}
            onDragStart={preventDragStart}
            icon={() => <Icon iconId="close" size="sm" />}
          />
        </span>
      ) : (
        <IconButton
          variant="invisible"
          size="small"
          aria-label={`${title} 닫기`}
          draggable={false}
          className={classNames.headerCloseButtonHover}
          onClick={handleHeaderCloseClick(onClose)}
          onDragStart={preventDragStart}
          icon={() => <Icon iconId="close" size="sm" />}
        />
      )}
    </div>
  );
};
