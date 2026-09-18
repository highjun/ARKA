import { useControllableState } from "@radix-ui/react-use-controllable-state";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { clsx } from "clsx";
import { usePortalContainer } from "#utils/portal";
import { Kbd } from "#component/Kbd";
import styles from "./CommandPalette.module.css";
import { Command } from "cmdk";

/** 팔레트에 뜰 항목 하나 — 커맨드 하나에 대응한다. `id`가 선택됐을 때 돌아온다. */
export type CommandPaletteItem = {
  readonly id: string;
  readonly label: string;
  /** 키 하나당 `Kbd` 하나로 그려지는 키바인딩. 예: `['Ctrl', 'Shift', 'P']`. */
  readonly shortcut?: readonly string[];
};

/**
 * `CommandPaletteProps`를 참조하지 않고 필드를 되풀이한다 — "Props 선언은 CommandPalette 바로 앞"이라
 * `CommandPalette`보다 먼저 오는 이 헬퍼가 그 타입을 앞당겨 참조하면 선언 순서가 어긋난다.
 */
type PaletteDialogAttrs = Omit<ComponentPropsWithoutRef<"div">, "onSelect" | "defaultValue"> & {
  readonly open: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly items: readonly CommandPaletteItem[];
  readonly onSelect: (id: string) => void;
  readonly placeholder?: string;
  readonly emptyMessage?: ReactNode;
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
  items,
  onSelect,
  placeholder,
  emptyMessage,
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
      <Command.Input placeholder={placeholder} />
      <Command.List>
        <Command.Empty>{emptyMessage}</Command.Empty>
        {items.map((item) => (
          <Command.Item key={item.id} value={item.label} onSelect={() => onSelect(item.id)}>
            <span className={styles["itemLabel"]}>{item.label}</span>
            {item.shortcut !== undefined && item.shortcut.length > 0 && (
              <span className={styles["shortcuts"]}>
                {item.shortcut.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            )}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
};

/**
 * props 를 라이브러리 타입에서 파생시키지 않고 직접 선언한다 — 파생시키면 계약이 그 라이브러리를
 * 따라 바뀐다.
 *
 * @deprecated `shell/` 컴포넌트 스코프 재정리(2026-08-25)에서 정식 스코프 밖으로 뺐다 — 워크벤치가
 * 지금도 쓰고 있어 지우지는 않았지만, 새 코드에서 이걸 골라 쓰기 전에 정말 필요한지부터 확인할 것.
 */
export interface CommandPaletteProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect" | "defaultValue"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLDivElement>;
  /** 열림 여부(제어). */
  readonly open?: boolean;
  /**
   * 기본값은 `undefined`(비제어) — `open` 을 주면 제어로 전환된다.
   *
   * `cmdk`의 `Command.Dialog` 타입은 Radix `DialogProps`(`defaultOpen` 포함)를 그대로 확장하지만,
   * 실제 구현(`xe=t.forwardRef(...)`)은 `open`/`onOpenChange`만 구조분해해 Radix `Dialog.Root`로
   * 넘기고 `defaultOpen`은 나머지 rest props에 섞여 `[cmdk-root]` div로 흘러가 버린다 — 타입은
   * 지원한다고 하지만 런타임은 조용히 무시한다(직접 렌더해서 확인함). 그래서 여기서 직접
   * `useControllableState`로 여기서 직접 중재한다 — 다른 stateful 컴포넌트와 같은 관용구다.
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
}

/** 명령을 검색해 실행하는 모달 — 열림 상태는 넘기면 그 값을, 안 넘기면 스스로 든다. */
export const CommandPalette = ({
  open,
  defaultOpen,
  onOpenChange,
  className,
  emptyMessage,
  placeholder,
  ref,
  ...props
}: CommandPaletteProps) => {
  const [isOpen, setOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: "CommandPalette",
  });

  return (
    <PaletteDialog
      {...props}
      ref={ref}
      open={isOpen}
      onOpenChange={setOpen}
      className={clsx(className, styles["content"])}
      placeholder={placeholder ?? "커맨드 검색..."}
      emptyMessage={emptyMessage ?? "결과가 없다."}
      data-component="CommandPalette"
    />
  );
};
