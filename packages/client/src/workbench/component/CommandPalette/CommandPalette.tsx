import type { ComponentPropsWithoutRef, Ref } from "react";
import { Kbd } from "#component/Kbd";
import { clsx } from "clsx";
import { usePortalContainer } from "#utils/portal";
import styles from "./CommandPalette.module.css";
import { Command } from "cmdk";

export interface CommandRow {
  readonly id: string;
  readonly label: string;
  readonly keybinding: string;
}

const keysOf = (keybinding: string): readonly string[] =>
  keybinding === "" ? [] : keybinding.split("+").map((key) => key.charAt(0).toUpperCase() + key.slice(1));

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

export interface CommandPaletteProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect" | "defaultValue"> {
  readonly ref?: Ref<HTMLDivElement>;
  readonly open: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly query: string;
  readonly onQueryChange?: (value: string) => void;
  readonly rows: readonly CommandRow[];
  readonly onSelect?: (actionId: string) => void;
}

export const CommandPalette = ({ className, ref, ...props }: CommandPaletteProps) => (
  <PaletteDialog {...props} ref={ref} className={clsx(className, styles["content"])} data-component="CommandPalette" />
);
