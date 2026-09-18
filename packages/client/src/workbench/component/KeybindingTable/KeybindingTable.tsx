import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { Text } from "#component/Text";
import styles from "./KeybindingTable.module.css";

/** 단축키 표의 한 줄 — `workbench/viewmodel`의 `KeybindingRow`와 구조가 같다(부품은 그 층을 못 본다). */
export interface KeybindingRow {
  readonly actionId: string;
  /** 사람이 읽는 명령 이름. */
  readonly label: string;
  /** `ctrl+shift+p` 꼴. */
  readonly keybinding: string;
  /** 같은 키에 둘 이상이 걸렸다. */
  readonly isConflicting: boolean;
}

/** `children`을 막는다 — 내용은 `rows`가 정한다. */
export interface KeybindingTableProps extends Omit<ComponentPropsWithoutRef<"table">, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLTableElement>;
  /** 그릴 줄들. 비면 머리만 남는다. */
  readonly rows: readonly KeybindingRow[];
}

/** `ctrl+shift+p` → `['Ctrl', 'Shift', 'P']` — 화면에 나오는 순서 그대로다. */
const keysOf = (keybinding: string): readonly string[] =>
  keybinding.split("+").map((key) => key.charAt(0).toUpperCase() + key.slice(1));

/**
 * 등록된 키바인딩을 표로 보여 준다 — 읽기 전용이다. 충돌(같은 키에 둘 이상)은 줄에 표시한다.
 *
 * 키를 `<kbd>`로 그리는 것은 그것이 키보드 입력의 정본 시맨틱 태그라서다. 모양은
 * `Menu`의 단축키 칩과 같은 Primer 토큰을 쓴다 — 앱 전체에서 키는 같게 보여야 한다.
 */
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
              <kbd key={key} className={styles["key"]}>
                {key}
              </kbd>
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
