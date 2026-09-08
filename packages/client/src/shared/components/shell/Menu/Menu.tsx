import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { usePortalContainer } from '#utils/portal';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './Menu.module.css';
import * as Primitive from '@radix-ui/react-dropdown-menu';

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다.
 *
 * `ContextMenu`(우클릭 전용)와 자매 컴포넌트다 — 이쪽은 **좌클릭으로 여는** 앵커 드롭다운이다.
 * 우클릭 지점처럼 "뜰 자리가 정해지는" 계기가 없어 하이브리드 controlled/uncontrolled 삼종
 * (`open`/`defaultOpen`/`onOpenChange`)을 그대로 노출한다 — 다른 Stateful 컴포넌트와 같은 관례.
 */
export interface MenuRootProps extends Omit<HTMLAttributes<HTMLElement>, 'dir'> {
  /** 제어 모드의 열림 여부. */
  readonly open?: boolean;
  /** 비제어 모드의 초기 열림 여부. */
  readonly defaultOpen?: boolean;
  /** 열림 여부가 바뀔 때마다 호출된다. */
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * `asChild`를 그대로 노출한다 — 이 Trigger 자신이 `<button>`이라, `IconButton`처럼 이미 버튼인
 * 것을 그 안에 그냥 넣으면 버튼 안에 버튼이 중첩된다(잘못된 HTML, 클릭 시맨틱도 깨진다).
 * `asChild`를 켜면 Radix가 이 Trigger의 속성을 자식에 병합만 하고 자기 태그를 안 그린다.
 */
export interface MenuTriggerProps extends HTMLAttributes<HTMLElement> {
  /** true면 Radix가 이 Trigger의 속성을 자식에 병합만 하고 자기 태그는 안 그린다. */
  readonly asChild?: boolean;
  /** true면 눌러도 메뉴가 뜨지 않는다. */
  readonly disabled?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {}

export interface MenuItemProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** true면 선택할 수 없고 흐리게 표시된다. */
  readonly disabled?: boolean;
  /** 항목을 고르면 호출된다. */
  readonly onSelect?: (event: Event) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface MenuLabelProps extends HTMLAttributes<HTMLElement> {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
export interface MenuSeparatorProps extends HTMLAttributes<HTMLElement> {}

const Root = ({ children, ...props }: MenuRootProps) => <Primitive.Root {...props}>{children}</Primitive.Root>;

const Trigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(({ className, children, ...props }, ref) => (
  <Primitive.Trigger ref={ref} className={className} {...props}>
    {children}
  </Primitive.Trigger>
));

/**
 * 메뉴 항목을 담는 컨테이너 — `Portal`로 렌더링돼 트리거 바로 아래-끝에 붙는다.
 *
 * `@radix-ui/react-dropdown-menu`의 `Portal`을 여기서 감춘다 — 밖에서 알 이유가 없다(`ContextMenu`
 * 와 같은 이유). 트리거 바로 아래-끝에 붙인다(`align="end"`) — "더보기" 버튼이 대개 영역 오른쪽
 * 끝에 있으니 메뉴가 그 아래에서 왼쪽으로 펼쳐지는 게 자연스럽다.
 */
const Content = forwardRef<HTMLDivElement, MenuContentProps>(({ className, children, ...props }, ref) => {
  const container = usePortalContainer();

  return (
    <Primitive.Portal container={container}>
      <Primitive.Content
        {...props}
        ref={ref}
        align="end"
        sideOffset={4}
        data-component="Menu"
        className={clsx(className, styles['content'])}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
});

/** 클릭·키보드로 선택 가능한 메뉴 항목 하나. */
const Item = ({ className, ...props }: MenuItemProps) => <Primitive.Item className={clsx(className, styles['item'])} {...props} />;

/** 선택할 수 없는 섹션 제목. */
const Label = ({ className, ...props }: MenuLabelProps) => <Primitive.Label className={clsx(className, styles['label'])} {...props} />;

/** 항목 그룹을 나누는 구분선. */
const Separator = ({ className, ...props }: MenuSeparatorProps) => (
  <Primitive.Separator className={clsx(className, styles['separator'])} {...props} />
);

export type { MenuRootProps as MenuProps };

/**
 * Storybook Docs 서브컴포넌트 섹션 전용 재노출 — 공개 API는 `Menu.Trigger` 등
 * `assembleCompound` 결과로만 접근한다(`index.ts`엔 안 싣는다). react-docgen-typescript가
 * 파일의 최상위 export만 컴포넌트로 인식해서, 비export 지역 함수(`Trigger` 등)엔
 * `__docgenInfo`가 안 붙는다(2026-09-06 실측 확인) — Docs 페이지의 서브컴포넌트 Props 표를
 * 뽑으려면 이 재노출이 필요하다.
 */
export { Trigger as MenuTriggerDoc, Content as MenuContentDoc, Item as MenuItemDoc, Label as MenuLabelDoc, Separator as MenuSeparatorDoc };

export const Menu = assembleCompound('Menu', Root, { Trigger, Content, Item, Label, Separator });
