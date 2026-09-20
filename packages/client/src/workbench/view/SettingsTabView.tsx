import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Heading } from "@primer/react";
import { Text } from "#component/Text";
import type { SettingsRow } from "../viewmodel/ISettingsViewModel";
import styles from "./SettingsTabView.module.css";

const SettingsInput = observer(function SettingsInput({
  row,
  onChange,
}: {
  readonly row: SettingsRow;
  readonly onChange: (value: unknown) => void;
}) {
  switch (row.type) {
    case "boolean":
      return (
        <label className={styles["option"]}>
          <input type="checkbox" checked={row.value === true} onChange={(event) => onChange(event.target.checked)} />
          <Text>{row.title}</Text>
        </label>
      );
    case "number":
      return (
        <label className={styles["option"]}>
          <Text>{row.title}</Text>
          <input
            type="number"
            value={typeof row.value === "number" ? row.value : ""}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </label>
      );
    case "string":
      return (
        <label className={styles["option"]}>
          <Text>{row.title}</Text>
          <input
            type="text"
            value={typeof row.value === "string" ? row.value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      );
    case "enum":
      return (
        <fieldset className={styles["options"]}>
          <legend className={styles["legend"]}>{row.title}</legend>
          {(row.options ?? []).map((option) => (
            <label key={option} className={styles["option"]}>
              <input
                type="radio"
                name={row.id}
                value={option}
                checked={row.value === option}
                onChange={() => onChange(option)}
              />
              <Text>{option}</Text>
            </label>
          ))}
        </fieldset>
      );
  }
});

export const SettingsTabView = observer(function SettingsTabView() {
  const viewModel = useViewModel("arka.workbench.settingsViewModel");
  return (
    <div data-component="SettingsTabView" className={styles["root"]}>
      {viewModel.rows.map((row) => (
        <section key={row.id} className={styles["section"]}>
          <Heading as="h2" variant="medium">
            {row.title}
          </Heading>
          <SettingsInput row={row} onChange={(value) => viewModel.set(row.id, value)} />
        </section>
      ))}
    </div>
  );
});
