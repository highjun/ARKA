/**
 * 브라우저 키보드 이벤트를 `ctrl+j` 형태 문자열로 정규화한다.
 *
 * Ctrl 과 Cmd(메타)를 둘 다 `ctrl`로 합친다 — 플랫폼마다 다른 키를 따로 등록하게 하지 않기 위한
 * 단순화다("Mod" 취급). 조합키 자신이 눌린 순간(`event.key`가 `'Control'` 등)은 조합에서 뺀다.
 *
 * 앱마다 다시 구현하면 미묘하게 어긋날 수 있어(예: modifier 순서) core가 하나로 제공한다. 계약과
 * 매칭 자체(`KeybindingDescriptor`·`matchKeybinding`)는 `KeyboardEvent`에 안 묶여 순수하지만,
 * `./keybinding.ts`에 있다 — 이 함수만 DOM 타입을 직접 받는다는 차이로 별 파일에 분리했을 뿐,
 * 책임 축(keybinding) 자체는 같아 같은 폴더에 있다.
 */
export const normalizeKeybinding = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  const key = event.key.toLowerCase();
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key);
  return parts.join('+');
};
