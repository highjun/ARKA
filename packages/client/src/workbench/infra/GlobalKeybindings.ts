import type { ICommandCenterRegistry } from '#core/commands';
import type { IWorkbenchStartup } from '../model/IWorkbenchStartup';

/**
 * 브라우저 키보드 이벤트를 `ctrl+j` 형태 문자열로 정규화한다.
 *
 * Ctrl과 Cmd(메타)를 둘 다 `ctrl`로 합친다 — 플랫폼마다 다른 키를 따로 등록하게 하지 않기
 * 위한 단순화다. 조합키 자신이 눌린 순간은 조합에서 뺀다.
 */
const normalizeKeydown = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  const key = event.key.toLowerCase();
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key);
  return parts.join('+');
};

/**
 * 전역 키 리스너 **하나**. 매칭되는 키바인딩을 찾아 커맨드를 실행하고, 실행했으면 브라우저
 * 기본 동작을 막는다(Ctrl+S가 "페이지 저장"을 여는 것 같은 충돌을 피하려는 것).
 *
 * 컴포넌트-로컬 단축키(CodeMirror의 Mod-S, FileTree의 방향키)는 안 건드린다 — 그건 DOM
 * 포커스가 있어야 의미 있는 것들이다.
 */
export const createGlobalKeybindings = ({
  commandCenterRegistry,
}: {
  commandCenterRegistry: ICommandCenterRegistry;
}): IWorkbenchStartup => {
  const onKeydown = (event: KeyboardEvent) => {
    const executed = commandCenterRegistry.dispatchKeydown(normalizeKeydown(event));
    if (executed) event.preventDefault();
  };
  return {
    start: () => window.addEventListener('keydown', onKeydown),
    stop: () => window.removeEventListener('keydown', onKeydown),
  };
};
