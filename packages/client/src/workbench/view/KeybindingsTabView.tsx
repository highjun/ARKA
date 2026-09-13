import { CommandCenterRegistryToken } from '#core/commands';
import { useViewModel } from '#core/viewmodel';
import { Text } from '#component/Text';
import styles from './KeybindingsTabView.module.css';

/**
 * 등록된 키바인딩 전부 — VSCode의 "키보드 단축키" 편집기의 읽기 전용 판이다. 바꾸는 것은 나중(설정 저장소가 생길 때).
 */
export const KeybindingsTabView = () => {
  const registry = useViewModel(CommandCenterRegistryToken);
  const rows = registry.keybindingRegistry.list().map((entry) => ({
    id: entry.id,
    keys: entry.keybinding.split('+').map((key) => key.charAt(0).toUpperCase() + key.slice(1)),
    label: registry.commandRegistry.tryGet(entry.actionId)?.label ?? entry.actionId,
    commandId: entry.actionId,
  }));
  return (
    <div data-component="KeybindingsTabView" className={styles['root']}>
      <table className={styles['table']}>
        <thead>
          <tr>
            <th>키</th>
            <th>커맨드</th>
            <th>id</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.keys.map((key) => (
                  <kbd key={key} className={styles['key']}>
                    {key}
                  </kbd>
                ))}
              </td>
              <td>{row.label}</td>
              <td>
                <Text size="small" tone="muted">
                  {row.commandId}
                </Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
