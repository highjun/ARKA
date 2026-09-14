import { createContext, useContext } from 'react';
import type { HTMLAttributes, Ref } from 'react';
import { clsx } from 'clsx';
import { usePortalContainer } from '#utils/portal';
import { Icon } from '#component/Icon';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import styles from './Menu.module.css';
import * as Context from '@radix-ui/react-context-menu';
import * as Dropdown from '@radix-ui/react-dropdown-menu';

/** 무엇이 메뉴를 여는가. 부품 구성과 항목 모양은 둘이 같다. */
type MenuKind = 'dropdown' | 'context';

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다. 라이브러리가 쪼갠 `Portal` 은 이 파일 안으로 접는다(밖에서 알 이유가 없다).
 *
 * **여기만 Primer를 쓰지 않는다**(→ ADR 0009). Primer에 우클릭 메뉴가 없어서, 좌클릭과 우클릭을
 * 한 API로 두려면 Radix 둘(`dropdown`·`context`)을 함께 감싸는 길뿐이다. 부품 다섯이 양쪽에서
 * 같은 모양이라 `kind` 하나로 갈린다.
 */
export interface MenuProps extends Omit<HTMLAttributes<HTMLElement>, 'dir'> {
  /** 무엇이 여는가. 기본값 `'dropdown'`(좌클릭 앵커). `'context'`면 우클릭으로 뜬다. */
  readonly kind?: MenuKind;
  /** 제어 모드의 열림 여부. */
  readonly open?: boolean;
  /**
   * 비제어 모드의 초기 열림 여부. 기본값 `false`.
   *
   * `kind="context"`에서 `true`를 주면 우클릭 없이 열리는데, 뜰 좌표가 없어 Radix가 뷰포트
   * 좌상단에 앵커링하며 경고를 낸다(`Shell.test.tsx`에서 실측). Radix `ContextMenu.Root`에는
   * 이 prop이 없어서 여기서 `useControllableState`로 흡수하고 양쪽 모두 제어 모드로만 넘긴다.
   */
  readonly defaultOpen?: boolean;
  /** 열림 여부가 바뀔 때마다 호출된다(제어 여부와 무관). */
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * `asChild`를 그대로 노출한다 — `kind="dropdown"`의 Trigger 자신이 `<button>`이라, `IconButton`처럼
 * 이미 버튼인 것을 그 안에 넣으면 버튼이 중첩된다(잘못된 HTML, 클릭 시맨틱도 깨진다). `asChild`를
 * 켜면 Radix가 속성을 자식에 병합만 하고 자기 태그를 안 그린다.
 */
interface MenuTriggerProps extends HTMLAttributes<HTMLElement> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLButtonElement>;
  /** true면 Radix가 속성을 자식에 병합만 하고 자기 태그는 안 그린다. */
  readonly asChild?: boolean;
  /** true면 눌러도(우클릭해도) 메뉴가 뜨지 않는다. */
  readonly disabled?: boolean;
}

/** 뜬 메뉴의 껍데기. 포탈로 나가므로 조상의 `overflow`에 잘리지 않는다. */
interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
}

/** 고를 수 있는 한 줄. `onSelect`를 가로채므로 표준 `onSelect`는 쓸 수 없다. */
interface MenuItemProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** true면 선택할 수 없고 흐리게 표시된다. */
  readonly disabled?: boolean;
  /** 항목을 고르면 호출된다. */
  readonly onSelect?: (event: Event) => void;
}

/** 고를 수 없는 머리글. 항목 묶음에 이름을 붙일 때 쓴다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
interface MenuLabelProps extends HTMLAttributes<HTMLElement> {}

/** 묶음 사이의 줄. 포커스를 받지 않는다. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 커스텀 필드는 필요해지면 추가한다.
interface MenuSeparatorProps extends HTMLAttributes<HTMLElement> {}

/** 하나만 고를 수 있는 묶음. 안에는 `Menu.RadioItem`만 둔다. */
interface MenuRadioGroupProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** 지금 고른 값. */
  readonly value?: string;
  /** 다른 값을 고르면 호출된다. */
  readonly onValueChange?: (value: string) => void;
}

/** 고른 것에 표시가 붙는 한 줄. `Menu.RadioGroup` 안에서만 뜻이 있다. */
interface MenuRadioItemProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** 이 줄이 나타내는 값. */
  readonly value: string;
  /** true면 고를 수 없고 흐리게 표시된다. */
  readonly disabled?: boolean;
  /** 줄을 고르면 호출된다. 보통은 `RadioGroup`의 `onValueChange`로 받는다. */
  readonly onSelect?: (event: Event) => void;
}

/**
 * 부품이 어느 Radix를 쓸지 알려 주는 통로. 부품마다 `kind`를 다시 받게 하면 루트와 어긋날 수
 * 있어 컨텍스트로 내린다.
 */
const KindContext = createContext<MenuKind>('dropdown');

/** 부품이 자기 루트의 `kind`를 읽는다. */
const useKind = (): MenuKind => useContext(KindContext);

/** 메뉴의 열림 상태를 든다 — 자기 DOM은 그리지 않는다. 보이는 것은 `Trigger`와 `Content`다. */
const MenuRoot = ({ kind = 'dropdown', open, defaultOpen = false, onOpenChange, children, ...props }: MenuProps) => {
  const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange, caller: 'Menu' });
  const body = <KindContext value={kind}>{children}</KindContext>;

  return kind === 'context' ? (
    <Context.Root {...props} open={isOpen} onOpenChange={setOpen}>
      {body}
    </Context.Root>
  ) : (
    <Dropdown.Root {...props} open={isOpen} onOpenChange={setOpen}>
      {body}
    </Dropdown.Root>
  );
};

/** 메뉴를 여는 자리 — `dropdown`이면 누를 버튼, `context`면 우클릭을 받는 영역이다. */
const MenuTrigger = ({ className, children, ref, ...props }: MenuTriggerProps) => {
  const shared = { className, ...props };

  return useKind() === 'context' ? (
    <Context.Trigger {...shared}>{children}</Context.Trigger>
  ) : (
    <Dropdown.Trigger {...shared} ref={ref}>
      {children}
    </Dropdown.Trigger>
  );
};

/**
 * 메뉴 항목을 담는 컨테이너 — `Portal`로 렌더링돼 조상의 `overflow`에 잘리지 않는다.
 *
 * `dropdown`은 트리거 바로 아래-끝에 붙인다(`align="end"`) — "더보기" 버튼이 대개 영역 오른쪽
 * 끝에 있으니 메뉴가 그 아래에서 왼쪽으로 펼쳐지는 게 자연스럽다. `context`는 우클릭 지점이
 * 자리를 정하므로 정렬을 주지 않는다.
 */
const MenuContent = ({ className, children, ref, ...props }: MenuContentProps) => {
  const kind = useKind();
  const container = usePortalContainer();
  const shared = { ...props, ref, 'data-component': 'Menu', 'data-kind': kind, className: clsx(className, styles['content']) };

  return kind === 'context' ? (
    <Context.Portal container={container}>
      <Context.Content {...shared}>{children}</Context.Content>
    </Context.Portal>
  ) : (
    <Dropdown.Portal container={container}>
      <Dropdown.Content {...shared} align="end" sideOffset={4}>
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
};

/** 클릭·키보드로 선택 가능한 메뉴 항목 하나. */
const MenuItem = ({ className, ...props }: MenuItemProps) => {
  const shared = { className: clsx(className, styles['item']), ...props };

  return useKind() === 'context' ? <Context.Item {...shared} /> : <Dropdown.Item {...shared} />;
};

/** 선택할 수 없는 섹션 제목. */
const MenuLabel = ({ className, ...props }: MenuLabelProps) => {
  const shared = { className: clsx(className, styles['label']), ...props };

  return useKind() === 'context' ? <Context.Label {...shared} /> : <Dropdown.Label {...shared} />;
};

/** 항목 그룹을 나누는 구분선. */
const MenuSeparator = ({ className, ...props }: MenuSeparatorProps) => {
  const shared = { className: clsx(className, styles['separator']), ...props };

  return useKind() === 'context' ? <Context.Separator {...shared} /> : <Dropdown.Separator {...shared} />;
};

/** 하나만 고르는 묶음 — 고른 줄에만 표시가 붙는다. */
const MenuRadioGroup = ({ className, ...props }: MenuRadioGroupProps) => {
  const shared = { className, ...props };

  return useKind() === 'context' ? <Context.RadioGroup {...shared} /> : <Dropdown.RadioGroup {...shared} />;
};

/**
 * 고른 것에 체크 표시가 붙는 한 줄.
 *
 * 표시를 `ItemIndicator`로 그리고 자리를 항상 차지하게 둔다(`.itemIndicator`) — 고른 줄만 들여쓰기가
 * 생기면 목록이 들쭉날쭉해진다.
 */
const MenuRadioItem = ({ className, children, ...props }: MenuRadioItemProps) => {
  const kind = useKind();
  const shared = { className: clsx(className, styles['item']), ...props };
  const body = (
    <>
      <span className={styles['itemIndicator']}>
        {kind === 'context' ? (
          <Context.ItemIndicator>
            <Icon iconId="check" size="sm" />
          </Context.ItemIndicator>
        ) : (
          <Dropdown.ItemIndicator>
            <Icon iconId="check" size="sm" />
          </Dropdown.ItemIndicator>
        )}
      </span>
      {children}
    </>
  );

  return kind === 'context' ? (
    <Context.RadioItem {...shared}>{body}</Context.RadioItem>
  ) : (
    <Dropdown.RadioItem {...shared}>{body}</Dropdown.RadioItem>
  );
};

/**
 * 부품을 `Object.assign`으로 네임스페이스에 붙인다. 부품 함수의 이름이 `Menu<부품>`인 것은
 * react-docgen-typescript가 파일의 최상위 export만 컴포넌트로 인식해서다 — Docs 페이지의
 * 서브컴포넌트 Props 표가 그 이름으로 붙는다(2026-09-06 실측).
 */
export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Label: MenuLabel,
  Separator: MenuSeparator,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
});
