import type { ComponentPropsWithoutRef, Ref } from "react";
import { Icon } from "#ui/Icon";
import { Kbd, keysOf } from "#ui/Kbd";
import { usePortalContainer } from "#lib/portal";
import styles from "./TitleBar.module.css";
import { Command } from "cmdk";

export interface CommandRow {
  readonly id: string;
  readonly label: string;
  readonly keybinding: string;
}

type PaletteDialogAttrs = Omit<ComponentPropsWithoutRef<"div">, "onSelect" | "defaultValue"> & {
  readonly open: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly query: string;
  readonly onQueryChange?: (value: string) => void;
  readonly rows: readonly CommandRow[];
  readonly onSelect?: (actionId: string) => void;
};

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
      overlayClassName={styles["paletteOverlay"]}
      container={container}
    >
      <Command.Input placeholder="커맨드 검색..." value={query} onValueChange={onQueryChange} />
      <Command.List>
        <Command.Empty>결과가 없다.</Command.Empty>
        {rows.map((row) => {
          const keys = keysOf(row.keybinding);
          return (
            <Command.Item key={row.id} value={row.label} onSelect={() => onSelect?.(row.id)}>
              <span className={styles["paletteItemLabel"]}>{row.label}</span>
              {keys.length > 0 && (
                <span className={styles["paletteShortcuts"]}>
                  {keys.map((key) => (
                    <Kbd key={key} className={styles["paletteShortcutKey"]}>
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

const PLACEHOLDER = "커맨드 검색...";

interface PaletteProps {
  readonly open: boolean;
  readonly query: string;
  readonly rows: readonly CommandRow[];
  readonly placeholder?: string;
  readonly keybinding?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onQueryChange?: (query: string) => void;
  readonly onSelect?: (actionId: string) => void;
}

/** 넓으면 가운데 입력 필드, 좁으면 아이콘 버튼 — 같은 진입구가 꼴만 바꾼다. */
export const PaletteField = ({
  placeholder = PLACEHOLDER,
  keybinding = "",
  onOpenChange,
  compact = false,
}: Pick<PaletteProps, "placeholder" | "keybinding" | "onOpenChange"> & { readonly compact?: boolean }) => {
  const keys = keysOf(keybinding);

  return (
    <button
      type="button"
      aria-label="명령 팔레트 열기"
      className={compact ? styles["paletteButton"] : styles["paletteField"]}
      onClick={() => onOpenChange?.(true)}
    >
      <Icon iconId="search" size="sm" />
      {compact ? null : (
        <>
          <span className={styles["paletteFieldPlaceholder"]}>{placeholder}</span>
          <span className={styles["paletteFieldKeys"]}>
            {keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </span>
        </>
      )}
    </button>
  );
};

export const Palette = ({ open, query, rows, onOpenChange, onQueryChange, onSelect }: PaletteProps) => (
  <PaletteDialog
    open={open}
    query={query}
    rows={rows}
    onOpenChange={onOpenChange}
    onQueryChange={onQueryChange}
    onSelect={onSelect}
    className={styles["paletteContent"]}
    data-component="TitleBar/Palette"
  />
);
