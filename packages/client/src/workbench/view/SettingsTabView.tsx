import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { normalizeKeybinding } from "#core/commands";
import { Heading, TextInput } from "@primer/react";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Kbd } from "#component/Kbd";
import { Text } from "#component/Text";
import type { KeybindingRow } from "../viewmodel/IKeybindingViewModel";
import type { SettingsRow } from "../viewmodel/ISettingsViewModel";
import styles from "./SettingsTabView.module.css";

/**
 * 찾을 말과 맞나. **거르는 법이 한 곳에 산다** — 설정 줄과 단축키 줄이 같은 말로 걸러져야
 * 한 화면으로 읽힌다.
 */
const matches = (query: string, ...fields: readonly (string | undefined)[]): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return fields.some((field) => field !== undefined && field.toLowerCase().includes(needle));
};

/** 값의 갈래마다 다른 컨트롤. 지금은 날 `input`이다 — Primer 위젯으로 옮기는 것은 다음 라운드다. */
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

/** 설정 한 줄 — 왼쪽에 이름과 설명, 오른쪽에 컨트롤. */
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

/**
 * 단축키 한 줄 — **설정 줄과 같은 기하다**. 왼쪽에 명령 이름과 id, 오른쪽에 키캡.
 *
 * 연필을 누르면 키를 기다린다. 기다리는 동안 눌린 조합을 그대로 건다 — Esc는 그만두기다.
 */
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
      {/* **같은 단추가 키를 받는다** — 눌러서 켰으니 포커스가 이미 여기 있다. 따로 칸을 띄우면
          `autoFocus` 가 필요한데 그것은 접근성 린트가 막는다. */}
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

/**
 * 설정 화면. **찾기 칸은 맨 위에 하나뿐이다** — 범주마다 제 검색창을 두면 같은 일을 두 곳에서
 * 한다. 단축키도 한 범주일 뿐 제 화면이 아니다.
 */
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
