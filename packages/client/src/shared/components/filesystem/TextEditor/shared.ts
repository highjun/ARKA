import { foldKeymap } from '@codemirror/language';
import type { KeyBinding } from '@codemirror/view';

/**
 * 파일 경로에서 확장자만 뽑는다(소문자, 점 제외) — `.gitignore`처럼 이름 전체가 확장자인 경우와
 * 확장자가 없는 경우 모두 `undefined`다.
 */
export const fileExtensionOf = (path: string): string | undefined => {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return undefined;
  return name.slice(dot + 1).toLowerCase();
};

/**
 * 확장자별로 덧붙일 단축키 — 지금은 비어 있다. 예를 들어 Markdown의 Ctrl+B(굵게)/Ctrl+I(기울임)
 * 처럼 파일 종류마다 달라질 단축키가 생기면 여기 등록한다(이번 범위 밖, 자리만 마련한다).
 */
const EXTENSION_KEYMAPS: Readonly<Record<string, readonly KeyBinding[]>> = {};

/**
 * 모든 파일 공통(base) 단축키에 확장자별 오버라이드를 얹는다. base는 코드 접기/펼치기
 * (`foldKeymap`)뿐이다 — 이동/선택/줄편집/찾기바꾸기 대부분은 이미 `defaultKeymap`·
 * `historyKeymap`·`searchKeymap`(`useCodeMirrorEditor.ts`가 이미 포함)이 갖고 있어 여기서
 * 중복으로 다시 선언하지 않는다.
 */
export const getKeymapForExtension = (extension: string | undefined): readonly KeyBinding[] => [
  ...foldKeymap,
  ...(extension === undefined ? [] : (EXTENSION_KEYMAPS[extension] ?? [])),
];
