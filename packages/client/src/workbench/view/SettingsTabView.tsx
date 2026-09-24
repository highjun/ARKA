import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { normalizeKeybinding } from "#core/commands";
import { Heading, TextInput } from "@primer/react";
import { Icon } from "#ui/Icon";
import { IconButton } from "#ui/IconButton";
import { Kbd } from "#ui/Kbd";
import { Text } from "#ui/Text";
import type { KeybindingRow } from "../viewmodel/IKeybindingViewModel";
import type { SettingsRow } from "../viewmodel/ISettingsViewModel";
import styles from "./SettingsTabView.module.css";

const matches = (query: string, ...fields: readonly (string | undefined)[]): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return fields.some((field) => field !== undefined && field.toLowerCase().includes(needle));
};

const SettingsInput = ({ row, onChange }: { readonly row: SettingsRow; readonly onChange: (v: unknown) => void }) => {
  if (row.type === "boolean")
    return <input type="checkbox" checked={row.value === true} onChange={(e) => onChange(e.target.checked)} />;
  if (row.type === "number")
    return <input type="number" value={String(row.value)} onChange={(e) => onChange(Number(e.target.value))} />;
  if (row.type === "enum")
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
            {option}
          </label>
        ))}
      </fieldset>
    );
  return <input type="text" value={String(row.value)} onChange={(e) => onChange(e.target.value)} />;
};

const Row = ({ row, onChange }: { readonly row: SettingsRow; readonly onChange: (v: unknown) => void }) => (
  <div className={styles["row"]} data-component="Settings/Row">
    <span className={styles["text"]}>
      <Text size="medium">{row.title}</Text>
      {row.description === undefined ? null : (
        <Text size="small" tone="muted">
          {row.description}
        </Text>
      )}
    </span>
    <span className={styles["control"]}>
      <SettingsInput row={row} onChange={onChange} />
    </span>
  </div>
);

const KeybindingRowView = ({
  row,
  isRecording,
  onStartRecording,
  onCancelRecording,
  onRebind,
}: {
  readonly row: KeybindingRow;
  readonly isRecording: boolean;
  readonly onStartRecording: () => void;
  readonly onCancelRecording: () => void;
  readonly onRebind: (keybinding: string) => void;
}) => (
  <div className={styles["row"]} data-component="Settings/Keybinding" data-recording={isRecording ? "" : undefined}>
    <span className={styles["text"]}>
      <Text size="medium" tone={row.isConflicting ? "danger" : "default"}>
        {row.label}
      </Text>
      <Text size="small" tone="muted">
        {row.actionId}
      </Text>
    </span>
    <span className={styles["control"]}>
      <span className={styles["keys"]} data-recording={isRecording ? "" : undefined}>
        {isRecording ? (
          <Text size="small" tone="muted">
            키를 누르세요
          </Text>
        ) : (
          row.keybinding.split("+").map((key) => <Kbd key={key}>{key}</Kbd>)
        )}
      </span>
      <IconButton
        variant="invisible"
        size="small"
        className={isRecording ? undefined : styles["edit"]}
        aria-label={
          isRecording ? `${row.label} 새 단축키 — 키를 누르세요, Esc 로 그만두기` : `${row.label} 단축키 바꾸기`
        }
        onClick={() => (isRecording ? onCancelRecording() : onStartRecording())}
        onKeyDown={
          isRecording
            ? (event) => {
                event.preventDefault();
                if (event.key === "Escape") {
                  onCancelRecording();
                  return;
                }
                const next = normalizeKeybinding(event.nativeEvent);
                if (next === "") return;
                onRebind(next);
              }
            : undefined
        }
        onBlur={isRecording ? () => onCancelRecording() : undefined}
        icon={() => <Icon iconId={isRecording ? "keyboard" : "pencil"} size="sm" />}
      />
    </span>
  </div>
);

export const SettingsTabView = observer(() => {
  const viewModel = useViewModel("arka.workbench.settingsViewModel");
  const keybindings = useViewModel("arka.workbench.keybindingViewModel");
  const { query } = viewModel;

  const rows = viewModel.rows.filter((row) => matches(query, row.title, row.description, row.id));
  const categories = [...new Set(rows.map((row) => row.category))];
  const keys = keybindings.rows.filter((row) => matches(query, row.label, row.actionId, row.keybinding));

  return (
    <div data-component="SettingsTabView" className={styles["root"]}>
      <TextInput
        block
        aria-label="설정 찾기"
        placeholder="설정 찾기"
        value={query}
        leadingVisual={() => <Icon iconId="search" size="sm" />}
        onChange={(event) => viewModel.setQuery(event.target.value)}
      />
      {categories.map((category) => (
        <section key={category} className={styles["section"]}>
          <Heading as="h2" variant="medium">
            {category}
          </Heading>
          {rows
            .filter((row) => row.category === category)
            .map((row) => (
              <Row key={row.id} row={row} onChange={(value) => viewModel.set(row.id, value)} />
            ))}
        </section>
      ))}
      {keys.length === 0 ? null : (
        <section className={styles["section"]}>
          <Heading as="h2" variant="medium">
            단축키
          </Heading>
          {keys.map((row) => (
            <KeybindingRowView
              key={row.actionId}
              row={row}
              isRecording={keybindings.recordingId === row.actionId}
              onStartRecording={() => keybindings.startRecording(row.actionId)}
              onCancelRecording={() => keybindings.cancelRecording()}
              onRebind={(keybinding) => keybindings.rebind(row.actionId, keybinding)}
            />
          ))}
        </section>
      )}
    </div>
  );
});
