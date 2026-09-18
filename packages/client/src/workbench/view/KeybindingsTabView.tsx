import { useViewModel } from "#core/viewmodel";
import { KeybindingTable } from "../component/KeybindingTable";
import styles from "./KeybindingsTabView.module.css";

const capitalize = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

/**
 * 담긴 키바인딩 전부 — VSCode의 "키보드 단축키" 편집기의 읽기 전용 판이다. 재정의가 있으면 그 키를
 * 보이고, `null`로 꺼 둔 것은 빠진다.
 */
export const KeybindingsTabView = () => {
  const commands = useViewModel("arka.commands");
  const rows = commands.keybindings.list().flatMap((entry) => {
    const effective = commands.overrides.has(entry.actionId)
      ? commands.overrides.get(entry.actionId)
      : entry.keybinding;
    if (typeof effective !== "string") return [];
    return [
      {
        id: `${entry.actionId}:${effective}`,
        keys: effective.split("+").map(capitalize),
        label: commands.actions.tryGet(entry.actionId)?.label ?? entry.actionId,
        commandId: entry.actionId,
      },
    ];
  });
  return (
    <div data-component="KeybindingsTabView" className={styles["root"]}>
      <KeybindingTable rows={rows} />
    </div>
  );
};
