/**
 * 브라우저 키 이벤트를 `ctrl+alt+shift+key` 순서의 한 문자열로 만든다.
 *
 * Ctrl과 Cmd(메타)를 둘 다 `ctrl`로 합친다 — 플랫폼마다 다른 키를 따로 등록하게 하지 않기 위한
 * 단순화다. 조합키 자신이 눌린 순간(`event.key`가 `'Control'` 등)은 조합에서 뺀다.
 *
 * 등록부를 보지 않는 순수 함수라 서비스에 얹지 않는다. 부를 곳은 **키를 눌러 단축키를 지정하는
 * 화면 하나**다 — 평소 경로는 `dispatchKeydown`이 안에서 한다.
 */
export const normalizeKeybinding = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("ctrl");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");
  const key = event.key.toLowerCase();
  if (!["control", "meta", "alt", "shift"].includes(key)) parts.push(key);
  return parts.join("+");
};
