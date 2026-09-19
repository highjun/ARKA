import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { KeybindingTable } from "../component/KeybindingTable";
import styles from "./KeybindingsTabView.module.css";

/** 담긴 키바인딩 전부 — VSCode의 "키보드 단축키" 편집기의 읽기 전용 판이다. 줄은 ViewModel이 편다. */
export const KeybindingsTabView = observer(function KeybindingsTabView() {
  const viewModel = useViewModel("arka.workbench.keybindingViewModel");
  return (
    <div data-component="KeybindingsTabView" className={styles["root"]}>
      <KeybindingTable rows={viewModel.rows} />
    </div>
  );
});
