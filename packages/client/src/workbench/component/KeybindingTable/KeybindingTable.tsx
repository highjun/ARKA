import type { ComponentPropsWithoutRef, Ref } from "react";
import { Kbd } from "#component/Kbd";
import { clsx } from "clsx";
import { Text } from "#component/Text";
import styles from "./KeybindingTable.module.css";

export interface KeybindingRow {
  readonly actionId: string;
  readonly label: string;
  readonly keybinding: string;
  readonly isConflicting: boolean;
}

export interface KeybindingTableProps extends Omit<ComponentPropsWithoutRef<"table">, "children"> {
  readonly ref?: Ref<HTMLTableElement>;
  readonly rows: readonly KeybindingRow[];
}

const keysOf = (keybinding: string): readonly string[] =>
  keybinding.split("+").map((key) => key.charAt(0).toUpperCase() + key.slice(1));

export const KeybindingTable = ({ rows, className, ref, ...props }: KeybindingTableProps) => (
  <table ref={ref} {...props} data-component="KeybindingTable" className={clsx(className, styles["table"])}>
    <thead>
      <tr>
        <th className={styles["cell"]}>키</th>
        <th className={styles["cell"]}>커맨드</th>
        <th className={styles["cell"]}>id</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={`${row.actionId}:${row.keybinding}`} data-conflicting={row.isConflicting ? "" : undefined}>
          <td className={styles["cell"]}>
            {keysOf(row.keybinding).map((key) => (
              <Kbd key={key} className={styles["key"]}>
                {key}
              </Kbd>
            ))}
            {row.isConflicting ? (
              <Text size="small" tone="danger">
                충돌
              </Text>
            ) : null}
          </td>
          <td className={styles["cell"]}>{row.label}</td>
          <td className={styles["cell"]}>
            <Text size="small" tone="muted">
              {row.actionId}
            </Text>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
