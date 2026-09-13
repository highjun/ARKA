import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { usePortalContainer } from '#utils/portal';
import { useControlledState } from '#utils/useControlledState';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './ContextMenu.module.css';
import * as Primitive from '@radix-ui/react-context-menu';

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다.
 *
 * 공개 표면은 컨텍스트 메뉴라면 어디에나 있는 개념이라 그대로 두고, 라이브러리가 쪼갠 `Portal` 만
 * 이 파일 안으로 접는다(밖에서 알 이유가 없다).
 */
export interface ContextMenuRootProps extends Omit<HTMLAttributes<HTMLElement>, 'dir'> {
  /** 열림 여부(controlled). 넘기면 controlled, 안 넘기면 `defaultOpen` 으로 컴포넌트가 자체 관리한다. */
  readonly open?: boolean;
  /**
   * uncontrolled 모드의 초깃값. 기본값 `false`.
   *
   * `@radix-ui/react-context-menu`의 `Root`는 이 prop을 두지 않는다(서브메뉴에만 있다) —
   * 우클릭 지점이 있어야 뜰 자리가 정해지는 컴포넌트라 "클릭 없이 기본으로 열림"은 좌표가 없다
   * (2026-09-01 `Menu`와의 API 비대칭을 없애기 위해 그럼에도 추가했다 — `true`로 주면 실제
   * 우클릭 없이 열리는데, Radix가 그 경우 위치를 못 잡아 뷰포트 좌상단에 앵커링한다는 경고를
   * 낸다(`Shell.test.tsx`에서 실측된 동작). Radix `Root`에 직접 넘기지 않고 이 컴포넌트가
   * `useControlledState`로 흡수해서 항상 controlled `open`/`onOpenChange`로만 Radix에 넘긴다.
   */
  readonly defaultOpen?: boolean;
  /** 열림 여부가 바뀔 때마다 호출된다(controlled 여부와 무관). */
  readonly onOpenChange?: (open: boolean) => void;
}

/** 우클릭을 받는 영역. 자식을 그대로 감싸고 자기 엘리먼트를 따로 만들지 않는다. */
export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLElement> {
  /** true면 우클릭해도 메뉴가 뜨지 않는다. */
  readonly disabled?: boolean;
}

/** 뜬 메뉴의 껍데기. 포탈로 나가므로 조상의 `overflow`에 잘리지 않는다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface ContextMenuContentProps extends HTMLAttributes<HTMLDivElement> {}

/** 고를 수 있는 한 줄. `onSelect`를 가로채므로 표준 `onSelect`는 쓸 수 없다. */
export interface ContextMenuItemProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** true면 선택할 수 없고 흐리게 표시된다. */
  readonly disabled?: boolean;
  /** 항목을 고르면 호출된다. */
  readonly onSelect?: (event: Event) => void;
}

/** 고를 수 없는 머리글. 항목 묶음에 이름을 붙일 때 쓴다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface ContextMenuLabelProps extends HTMLAttributes<HTMLElement> {}

/** 묶음 사이의 줄. 포커스를 받지 않는다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface ContextMenuSeparatorProps extends HTMLAttributes<HTMLElement> {}

const Root = ({ open, defaultOpen = false, onOpenChange, children, ...props }: ContextMenuRootProps) => {
  const [isOpen, setOpen] = useControlledState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });

  return (
    <Primitive.Root {...props} open={isOpen} onOpenChange={setOpen}>
      {children}
    </Primitive.Root>
  );
};

/** 우클릭하면 메뉴를 여는 대상 엘리먼트. */
const Trigger = ({ className, children, ...props }: ContextMenuTriggerProps) => (
  <Primitive.Trigger className={className} {...props}>
    {children}
  </Primitive.Trigger>
);

/**
 * 메뉴 항목을 담는 컨테이너 — `Portal`로 렌더링돼 `document.body`(또는 Shell의 portal root)
 * 바로 아래 뜬다.
 *
 * `@radix-ui/react-context-menu`의 `Portal`을 여기서 감춘다 — 밖에서 알 이유가 없다.
 * Shell의 portal root(`pointer-events: none`)로 포탈될 수 있어 `.content`에서 되살린다
 * (`ContextMenu.module.css`). Shell 없이 `document.body`로 포탈될 때(Storybook 등)는 조상에
 * `pointer-events: none`가 없어 무해하다.
 */
const Content = forwardRef<HTMLDivElement, ContextMenuContentProps>(
  ({ className, children, ...props }, ref) => {
    const container = usePortalContainer();

    return (
      <Primitive.Portal container={container}>
        <Primitive.Content
          {...props}
          ref={ref}
          data-component="ContextMenu"
          className={clsx(className, styles['content'])}
        >
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    );
  },
);

/** 클릭·키보드로 선택 가능한 메뉴 항목 하나. */
const Item = ({ className, ...props }: ContextMenuItemProps) => (
  <Primitive.Item className={clsx(className, styles['item'])} {...props} />
);

/** 선택할 수 없는 섹션 제목. */
const Label = ({ className, ...props }: ContextMenuLabelProps) => (
  <Primitive.Label className={clsx(className, styles['label'])} {...props} />
);

/** 항목 그룹을 나누는 구분선. */
const Separator = ({ className, ...props }: ContextMenuSeparatorProps) => (
  <Primitive.Separator className={clsx(className, styles['separator'])} {...props} />
);

export type { ContextMenuRootProps as ContextMenuProps };

/**
 * Storybook Docs 서브컴포넌트 섹션 전용 재노출 — 공개 API는 `ContextMenu.Trigger` 등
 * `assembleCompound` 결과로만 접근한다(`index.ts`엔 안 싣는다). react-docgen-typescript가
 * 파일의 최상위 export만 컴포넌트로 인식해서, 비export 지역 함수(`Trigger` 등)엔
 * `__docgenInfo`가 안 붙는다(2026-09-06 실측 확인) — Docs 페이지의 서브컴포넌트 Props 표를
 * 뽑으려면 이 재노출이 필요하다.
 */
export { Trigger as ContextMenuTriggerDoc, Content as ContextMenuContentDoc, Item as ContextMenuItemDoc, Label as ContextMenuLabelDoc, Separator as ContextMenuSeparatorDoc };

export const ContextMenu = assembleCompound('ContextMenu', Root, { Trigger, Content, Item, Label, Separator });
