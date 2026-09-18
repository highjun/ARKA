import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { KeybindingTable } from "../component/KeybindingTable";
import styles from "./KeybindingsTabView.module.css";

/**
 * 담긴 키바인딩 전부 — VSCode의 "키보드 단축키" 편집기의 읽기 전용 판이다. 재정의가 있으면 그 키를
 * 보이고, `null`로 꺼 둔 것은 빠진다. 같은 실효 키에 둘 이상이 걸리면 충돌이다.
 */
export const KeybindingsTabView = observer(function KeybindingsTabView() {
  const commands = useViewModel("arka.commands");
  const effective = commands.keybindings.list().flatMap((entry) => {
    const keybinding = commands.overrides.has(entry.actionId)
      ? commands.overrides.get(entry.actionId)
      : entry.keybinding;
    return typeof keybinding === "string" ? [{ actionId: entry.actionId, keybinding }] : [];
  });
  const countOf = new Map<string, number>();
  for (const entry of effective) countOf.set(entry.keybinding, (countOf.get(entry.keybinding) ?? 0) + 1);
  const rows = effective.map((entry) => ({
    actionId: entry.actionId,
    label: commands.actions.tryGet(entry.actionId)?.label ?? entry.actionId,
    keybinding: entry.keybinding,
    isConflicting: (countOf.get(entry.keybinding) ?? 0) > 1,
  }));
  return (
    <div data-component="KeybindingsTabView" className={styles["root"]}>
      <KeybindingTable rows={rows} />
    </div>
  );
});
