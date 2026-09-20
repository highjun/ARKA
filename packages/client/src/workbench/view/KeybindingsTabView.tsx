import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { KeybindingTable } from "../component/KeybindingTable";
import styles from "./KeybindingsTabView.module.css";

export const KeybindingsTabView = observer(function KeybindingsTabView() {
  const viewModel = useViewModel("arka.workbench.keybindingViewModel");
  return (
    <div data-component="KeybindingsTabView" className={styles["root"]}>
      <KeybindingTable rows={viewModel.rows} />
    </div>
  );
});
