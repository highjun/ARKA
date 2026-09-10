import { forwardRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { usePortalContainer } from '#utils/portal';
import { assembleCompound } from '#utils/assembleCompound';
import styles from './CommandPalette.module.css';
import { Command } from 'cmdk';

/** 팔레트에 뜰 항목 하나 — 커맨드 하나에 대응한다. `id`가 선택됐을 때 돌아온다. */
export type CommandPaletteItem = {
  readonly id: string;
  readonly label: string;
  /** 키 하나당 `<kbd>` 하나로 그려지는 키바인딩. 예: `['Ctrl', 'Shift', 'P']`. */
  readonly shortcut?: readonly string[];
};

/**
 * `CommandPaletteRootProps`를 참조하지 않고 필드를 되풀이한다 — "Props 선언은 Root 바로 앞"이라
 * `Root`보다 먼저 오는 이 헬퍼가 그 타입을 앞당겨 참조하면 선언 순서가 어긋난다.
 */
type DialogAttrs = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect' | 'defaultValue'> & {
  readonly open: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly items: readonly CommandPaletteItem[];
  readonly onSelect: (id: string) => void;
  readonly placeholder?: string;
  readonly emptyMessage?: ReactNode;
  readonly overlayClassName?: string;
  readonly container?: HTMLElement;
};

/**
 * `cmdk`를 아는 유일한 컴포넌트. `Command.Dialog`가 Radix Dialog(+Portal)를 이미 감싸고 있어서
 * 여기서 또 감쌀 이유가 없다 — `container`를 그대로 전달만 한다.
 *
 * `ref`는 `Command.Dialog`가 이미 `[cmdk-root]` 노드로 전달해준다 — 실제 다이얼로그 콘텐츠를
 * 감싼 루트라 우리가 새로 뭘 하지 않아도 된다. `data-component`도 알려진 prop이 아니라서 그대로
 * `[cmdk-root]`까지 흘러간다.
 *
 * 검색·필터링은 `cmdk` 내장(fuzzy substring match)이라 직접 구현하지 않는다.
 */
const Dialog = forwardRef<HTMLDivElement, DialogAttrs>(
  ({ open, onOpenChange, items, onSelect, placeholder, emptyMessage, className, overlayClassName, container, ...props }, ref) => (
    <Command.Dialog
      {...props}
      ref={ref}
      open={open}
      onOpenChange={onOpenChange}
      label="커맨드 팔레트"
      contentClassName={className}
      overlayClassName={overlayClassName}
      container={container}
    >
      <Command.Input placeholder={placeholder} />
      <Command.List>
        <Command.Empty>{emptyMessage}</Command.Empty>
        {items.map((item) => (
          <Command.Item key={item.id} value={item.label} onSelect={() => onSelect(item.id)}>
            <span className={styles['itemLabel']}>{item.label}</span>
            {item.shortcut !== undefined && item.shortcut.length > 0 && (
              <span className={styles['shortcuts']}>
                {item.shortcut.map((key) => (
                  <kbd key={key} className={styles['shortcutKey']}>
                    {key}
                  </kbd>
                ))}
              </span>
            )}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  ),
);

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다.
 *
 * @deprecated `shell/` 컴포넌트 스코프 재정리(2026-08-25)에서 정식 스코프 밖으로 뺐다 — 워크벤치가
 * 지금도 쓰고 있어 지우지는 않았지만, 새 코드에서 이걸 골라 쓰기 전에 정말 필요한지부터 확인할 것.
 */
export interface CommandPaletteRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect' | 'defaultValue'> {
  /** 열림 여부(제어). */
  readonly open?: boolean;
  /**
   * 기본값은 `undefined`(비제어) — `open` 을 주면 제어로 전환된다.
   *
   * `cmdk`의 `Command.Dialog` 타입은 Radix `DialogProps`(`defaultOpen` 포함)를 그대로 확장하지만,
   * 실제 구현(`xe=t.forwardRef(...)`)은 `open`/`onOpenChange`만 구조분해해 Radix `Dialog.Root`로
   * 넘기고 `defaultOpen`은 나머지 rest props에 섞여 `[cmdk-root]` div로 흘러가 버린다 — 타입은
   * 지원한다고 하지만 런타임은 조용히 무시한다(직접 렌더해서 확인함). 그래서 여기서 직접
   * `useState`로 하이브리드를 구현한다 — `Collapsible`/`ModeToggle`과 같은 패턴이다.
   */
  readonly defaultOpen?: boolean;
  /** 열림 여부가 바뀔 때마다(제어 여부 무관) 호출된다. */
  readonly onOpenChange?: (open: boolean) => void;
  /** `commandRegistry.list()`를 그대로 옮긴 것 — 팔레트 전용 데이터는 없다. */
  readonly items: readonly CommandPaletteItem[];
  /** 항목을 고르면 그 id와 함께 호출된다. */
  readonly onSelect: (id: string) => void;
  /** 검색 입력의 placeholder. */
  readonly placeholder?: string;
  /** 검색 결과가 없을 때 목록 자리에 보여줄 내용. */
  readonly emptyMessage?: ReactNode;
  /** 배경 오버레이(딤드 레이어)에 붙는 클래스. */
  readonly overlayClassName?: string;
  /** 다이얼로그가 포탈될 자리. 없으면 `usePortalContainer()` → 그마저 없으면 `document.body`. */
  readonly container?: HTMLElement;
}

const Root = forwardRef<HTMLDivElement, CommandPaletteRootProps>(
  (
    { open, defaultOpen, onOpenChange, className, overlayClassName, emptyMessage, placeholder, container, ...props },
    ref,
  ) => {
    const portalContainer = usePortalContainer();
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
    const resolvedOpen = open ?? uncontrolledOpen;
    const handleOpenChange = (next: boolean) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    };

    return (
      <Dialog
        {...props}
        ref={ref}
        open={resolvedOpen}
        onOpenChange={handleOpenChange}
        container={container ?? portalContainer}
        className={clsx(className, styles['content'])}
        overlayClassName={clsx(overlayClassName, styles['overlay'])}
        placeholder={placeholder ?? '커맨드 검색...'}
        emptyMessage={emptyMessage ?? '결과가 없다.'}
        data-component="CommandPalette"
      />
    );
  },
);

export type { CommandPaletteRootProps as CommandPaletteProps };
export const CommandPalette = assembleCompound('CommandPalette', Root, {});
