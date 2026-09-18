import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import { Kbd } from "#component/Kbd";
import { Text } from "#component/Text";
import styles from "./KeybindingTable.module.css";

/** 키바인딩 한 줄 — 어떤 키가 어떤 커맨드를 부르나. */
interface KeybindingTableRow {
  /** 목록 안에서 고유한 값. `key`로 쓴다. */
  readonly id: string;
  /** 눌러야 하는 키들. 화면에 나오는 순서 그대로다. */
  readonly keys: readonly string[];
  /** 사람이 읽는 커맨드 이름. */
  readonly label: string;
  /** 커맨드 id — 이름이 없을 때 대신 보이던 값이기도 하다. */
  readonly commandId: string;
}

/** `children`을 막는다 — 내용은 `rows`가 정한다. */
export interface KeybindingTableProps extends Omit<ComponentPropsWithoutRef<"table">, "children"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLTableElement>;
  /** 그릴 줄들. 비면 머리만 남는다. */
  readonly rows: readonly KeybindingTableRow[];
}

/**
 * 등록된 키바인딩을 표로 보여 준다 — 읽기 전용이다. 바꾸는 것은 설정 저장소가 생길 때다.
 *
 * 키는 `Kbd`로 그린다 — 앱 전체에서 키는 같게 보여야 한다(2026-09-18 부터 한 부품).
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
        <tr key={row.id}>
          <td className={styles["cell"]}>
            {row.keys.map((key) => (
              <Kbd key={key} className={styles["key"]}>
                {key}
              </Kbd>
            ))}
          </td>
          <td className={styles["cell"]}>{row.label}</td>
          <td className={styles["cell"]}>
            <Text size="small" tone="muted">
              {row.commandId}
            </Text>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
