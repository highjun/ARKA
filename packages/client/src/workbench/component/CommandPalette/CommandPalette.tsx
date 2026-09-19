import type { ComponentPropsWithoutRef, Ref } from "react";
import { Kbd } from "#component/Kbd";
import { clsx } from "clsx";
import { usePortalContainer } from "#utils/portal";
import styles from "./CommandPalette.module.css";
import { Command } from "cmdk";

/** 팔레트의 한 줄 — `workbench/viewmodel`의 `CommandRow`와 구조가 같다(부품은 그 층을 못 본다). */
export interface CommandRow {
  readonly id: string;
  readonly label: string;
  /** 이 명령에 걸린 키 — `ctrl+shift+p` 꼴. 없으면 빈 문자열. */
  readonly keybinding: string;
}

/** `ctrl+shift+p` → `['Ctrl', 'Shift', 'P']` — 키 하나당 `Kbd` 하나. */
const keysOf = (keybinding: string): readonly string[] =>
  keybinding === "" ? [] : keybinding.split("+").map((key) => key.charAt(0).toUpperCase() + key.slice(1));

/**
 * `CommandPaletteProps`를 참조하지 않고 필드를 되풀이한다 — "Props 선언은 CommandPalette 바로 앞"이라
 * `CommandPalette`보다 먼저 오는 이 헬퍼가 그 타입을 앞당겨 참조하면 선언 순서가 어긋난다.
 */
type PaletteDialogAttrs = Omit<ComponentPropsWithoutRef<"div">, "onSelect" | "defaultValue"> & {
  readonly open: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly query: string;
  readonly onQueryChange?: (value: string) => void;
  readonly rows: readonly CommandRow[];
  readonly onSelect?: (actionId: string) => void;
};

/**
 * `cmdk`를 아는 유일한 컴포넌트. `Command.Dialog`가 Radix Dialog(+Portal)를 이미 감싸고 있어서
 * 여기서 또 감쌀 이유가 없다 — 포탈 자리는 `usePortalContainer()`가 알려 준다.
 *
 * `ref`는 `Command.Dialog`가 이미 `[cmdk-root]` 노드로 전달해준다 — 실제 다이얼로그 콘텐츠를
 * 감싼 루트라 우리가 새로 뭘 하지 않아도 된다. `data-component`도 알려진 prop이 아니라서 그대로
 * `[cmdk-root]`까지 흘러간다.
 *
 * 검색·필터링은 `cmdk` 내장(fuzzy substring match)이라 직접 구현하지 않는다.
 */
const PaletteDialog = ({
  open,
  onOpenChange,
  query,
  onQueryChange,
  rows,
  onSelect,
  className,
  ref,
  ...props
}: PaletteDialogAttrs & { readonly ref?: Ref<HTMLDivElement> }) => {
  const container = usePortalContainer();

  return (
    <Command.Dialog
      {...props}
      ref={ref}
      open={open}
      onOpenChange={onOpenChange}
      label="커맨드 팔레트"
      contentClassName={className}
      overlayClassName={styles["overlay"]}
      container={container}
    >
      <Command.Input placeholder="커맨드 검색..." value={query} onValueChange={onQueryChange} />
      <Command.List>
        <Command.Empty>결과가 없다.</Command.Empty>
        {rows.map((row) => {
          const keys = keysOf(row.keybinding);
          return (
            <Command.Item key={row.id} value={row.label} onSelect={() => onSelect?.(row.id)}>
              <span className={styles["itemLabel"]}>{row.label}</span>
              {keys.length > 0 && (
                <span className={styles["shortcuts"]}>
                  {keys.map((key) => (
                    <Kbd key={key} className={styles["shortcutKey"]}>
                      {key}
                    </Kbd>
                  ))}
                </span>
              )}
            </Command.Item>
          );
        })}
      </Command.List>
    </Command.Dialog>
  );
};

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다. 열림과 검색어 둘 다 제어다 — 여는 트리거가 명령이라 상태는 ViewModel이 든다.
 */
export interface CommandPaletteProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect" | "defaultValue"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 열림 여부. */
  readonly open: boolean;
  /** 열림 여부가 바뀌어야 할 때(바깥 클릭·Esc) 호출된다. */
  readonly onOpenChange?: (open: boolean) => void;
  /** 검색 입력의 값. */
  readonly query: string;
  /** 입력이 바뀔 때마다 호출된다. */
  readonly onQueryChange?: (value: string) => void;
  /** 등록된 명령 전부 — 거르는 것은 `cmdk`가 `query`로 한다. */
  readonly rows: readonly CommandRow[];
  /** 항목을 고르면 그 명령 id와 함께 호출된다. */
  readonly onSelect?: (actionId: string) => void;
}

/** 명령을 검색해 실행하는 모달. `cmdk`를 아는 유일한 자리다. */
export const CommandPalette = ({ className, ref, ...props }: CommandPaletteProps) => (
  <PaletteDialog {...props} ref={ref} className={clsx(className, styles["content"])} data-component="CommandPalette" />
);
