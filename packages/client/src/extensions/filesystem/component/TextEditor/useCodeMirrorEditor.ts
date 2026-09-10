import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { HighlightStyle, foldGutter, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { fileExtensionOf, getKeymapForExtension } from './shared';

/**
 * 파일 이름에서 문법을 고른다.
 *
 * **문법 강조는 LSP 가 아니다.** 여기서 하는 일은 토큰 단위 색칠뿐이고 전부 브라우저 안에서
 * 끝난다 — 언어 서버도, 문서 동기화도 없다. 진단·자동완성·정의로 이동이 LSP 의 몫이고
 * 그건 여전히 범위 밖이다(`apps/workbench/README.md` 의 Not now).
 *
 * 언어를 다 넣지 않는다. 번들이 언어마다 붙으므로 **이 워크스페이스에서 실제로 자주 여는 것**만
 * 둔다. 모르는 확장자는 강조 없이 그냥 보여준다 — 그래도 줄번호와 읽기는 된다.
 */
export type CodeLanguage = 'javascript' | 'typescript' | 'jsx' | 'tsx' | 'json' | 'markdown' | 'css' | 'html' | 'python';

const BY_EXTENSION: Readonly<Record<string, CodeLanguage>> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  html: 'html',
  htm: 'html',
  py: 'python',
};

export const languageOf = (path: string): CodeLanguage | undefined => {
  const extension = fileExtensionOf(path);
  return extension === undefined ? undefined : BY_EXTENSION[extension];
};

/**
 * CodeMirror 6 를 붙잡아 두는 유일한 자리.
 *
 * 외부 라이브러리를 이 훅 안에 가두는 것이 이 레포의 방식이다(`@radix-ui`·`cmdk` 와 같다). 그래서
 * `TextEditor.tsx` 는 `EditorView`·`Extension` 같은 CodeMirror 타입을 전혀 모른 채 이 훅이 돌려주는
 * `hostRef`·`openSearch` 만 쓴다.
 *
 * **기본은 읽기 전용이고, `readOnly={false}` 로 편집이 켜진다.**
 */
const LANGUAGE_EXTENSION: Readonly<Record<CodeLanguage, () => Extension>> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  json: () => json(),
  markdown: () => markdown(),
  css: () => css(),
  html: () => html(),
  python: () => python(),
};

/**
 * 문법 색을 **디자인 토큰에 붙인다.**
 *
 * CodeMirror 의 `defaultHighlightStyle` 은 라이트 기준 색이 박혀 있어 다크에서 겉돈다. 여기서는
 * `--code-syntax-*` 를 그대로 참조하므로 테마가 바뀌면 따라온다 — 그 토큰은 `CodeBlock` 이 쓰던
 * 것과 같은 것이라 두 컴포넌트의 코드 색이 갈리지도 않는다.
 */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: 'var(--codeMirror-syntax-fgColor-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--codeMirror-syntax-fgColor-string)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--codeMirror-syntax-fgColor-comment)', fontStyle: 'italic' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--codeMirror-syntax-fgColor-constant)' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--codeMirror-syntax-fgColor-entity)' },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: 'var(--fgColor-muted)' },
  { tag: [tags.heading, tags.strong], color: 'var(--codeMirror-syntax-fgColor-keyword)', fontWeight: 'bold' },
  { tag: tags.link, color: 'var(--codeMirror-syntax-fgColor-constant)', textDecoration: 'underline' },
]);

/**
 * 배경·선택·활성 줄도 토큰으로 — 하드코딩하면 다크에서 뜬다.
 *
 * **`.cm-cursor` 를 명시한다.** CodeMirror 의 기본 스타일은
 * `.cm-cursor { borderLeft: '1.2px solid black' }` 이고
 * `&dark .cm-cursor` 일 때만 밝은 색으로 바뀌는데, 그 분기는
 * `EditorView.theme(spec, { dark: true })` 로 직접 알려줘야 걸린다 — 우리는 다크·라이트를 CSS
 * 변수 하나로 넘나들므로 그 옵션을 안 쓴다. 그러면 캐럿이 다크 테마에서도 항상 검정으로 남는다
 * (`caretColor` 는 브라우저 네이티브 캐럿용이라 이 문제와 무관하다 — CodeMirror 가 그리는 캐럿은
 * 별개 엘리먼트다). 여기서 직접 토큰을 걸어 우선순위 문제를 피한다.
 *
 * **`@primer/primitives`가 CodeMirror 전용 토큰을 따로 낸다** — `--codeMirror-bgColor` 등
 * (`functional/themes/{light,dark}.css`). 일반 `--fgColor-*`/`--bgColor-*` 대신 이 전용 토큰을
 * 쓴다 — 선택 영역은 `--codeMirror-selection-bgColor`(다크에서도 캔버스와 구분되도록 Primer가
 * 이미 골라 둔 값)를 쓰므로, 여기서 "얼마나 진하게"를 따로 추측할 필요가 없다(2026-08-24, 예전엔
 * 존재하지 않는 `--bg-accent-muted-active`를 지어내 쓰고 있었다 — 이 파일 전체가 `--fg-default`
 * 등 실존하지 않는 이름을 참조한 죽은 토큰 버그였다).
 *
 * **`.cm-selectionBackground` 하나만 적으면 안 먹는다.** CodeMirror 의 기본 스타일에는
 * `&light.cm-focused .cm-selectionLayer .cm-selectionBackground` 처럼 **훨씬 구체적인** 선택자가
 * 있고(포커스 상태 전용 — 커서와 달리 `&light`/`&dark` 분기가 아니라 CSS 명세상의 우선순위
 * 문제다), 클래스 하나짜리 선택자로는 그 구체성을 못 이긴다(실제로 focus 를 주고 재 봤더니 저
 * 기본 배경색이 그대로 나왔다). 같은 선택자 사슬을 그대로 맞춰야 우리 값이 이긴다.
 */
const theme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--codeMirror-fgColor)' },
  '.cm-content': { caretColor: 'var(--codeMirror-cursor-fgColor)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--codeMirror-cursor-fgColor)' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--codeMirror-lineNumber-fgColor)' },
  '.cm-activeLine': { backgroundColor: 'var(--codeMirror-activeline-bgColor)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--codeMirror-activeline-bgColor)', color: 'var(--codeMirror-fgColor)' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--codeMirror-selection-bgColor)',
  },
  '.cm-searchMatch': { backgroundColor: 'var(--bgColor-attention-muted)', outline: '1px solid var(--borderColor-accent-emphasis)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--codeMirror-selection-bgColor)' },
  '.cm-panels': { backgroundColor: 'var(--codeMirror-bgColor)', color: 'var(--codeMirror-fgColor)' },
  '.cm-panels input, .cm-panels button': { color: 'var(--codeMirror-fgColor)' },
});

/** "이 위치를 보여 달라"는 요청. `seq`가 바뀔 때마다 같은 줄이어도 다시 간다. 줄·열은 1부터. */
export type RevealPosition = { readonly line: number; readonly column: number; readonly seq: number };

export interface UseCodeMirrorEditorOptions {
  readonly path: string;
  readonly content: string;
  readonly readOnly: boolean;
  readonly onChange?: (content: string) => void;
  readonly onSave?: () => void;
  readonly revealAt?: RevealPosition | null;
}

export interface UseCodeMirrorEditorResult {
  /** CodeMirror 가 실제로 그려질 호스트 엘리먼트에 건다. */
  readonly hostRef: RefObject<HTMLDivElement | null>;
  /** 검색 패널을 연다 — 폰에는 Ctrl+F 가 없어 버튼으로도 열 수 있어야 한다. */
  readonly openSearch: () => void;
}

/**
 * `path`·`content` 를 받아 CodeMirror 인스턴스 하나의 생애주기(생성·내용 동기화·스크롤 기억·정리)를
 * 관리한다. 컴포넌트는 이 훅이 돌려주는 `hostRef` 를 DOM 에 걸기만 하면 된다 — CodeMirror 를 직접
 * 알 필요가 없다.
 */
/**
 * `readOnly`에 좌우되는 확장(단축키·편집 가능 여부·변경 리스너)을 한데 묶는다 — 아래 `Compartment`
 * 로 감싸 껐다 켰다 할 수 있게 하기 위함. `onSaveRef`/`onChangeRef`는 최신 콜백을 담은 ref라
 * 값 자체는 안 바뀌므로 여기 클로저에 잡아도 안전하다.
 */
const readOnlyExtensions = (
  readOnly: boolean,
  onSaveRef: RefObject<(() => void) | undefined>,
  onChangeRef: RefObject<((content: string) => void) | undefined>,
): Extension[] => [
  keymap.of(
    // 편집 가능할 때만 가로챈다 — 읽기 전용 뷰에서 브라우저 기본 저장 대화상자를 막을 이유가 없다.
    readOnly
      ? []
      : [
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              onSaveRef.current?.();
              return true;
            },
          },
        ],
  ),
  EditorView.editable.of(!readOnly),
  EditorState.readOnly.of(readOnly),
  ...(readOnly
    ? []
    : [
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
        }),
      ]),
];

export const useCodeMirrorEditor = ({ path, content, readOnly, onChange, onSave, revealAt = null }: UseCodeMirrorEditorOptions): UseCodeMirrorEditorResult => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartmentRef = useRef<Compartment | null>(null);
  /** 최초 문서를 읽되 **의존성으로 삼지는 않는다** — 내용이 바뀔 때마다 에디터를 다시 만들면
   *  스크롤과 선택이 날아간다. 이후 변경은 아래 두 번째 effect 가 dispatch 로 반영한다. */
  const initialDocRef = useRef(content);
  initialDocRef.current = content;
  /**
   * 매 렌더마다 최신 콜백을 담아 둔다. 에디터는 `path`(와 `readOnly`)가 바뀔 때만 다시 만들기
   * 때문에, 그사이 부모가 새 함수를 내려줘도 CodeMirror 리스너는 여전히 첫 번째 것을 참조하는
   * 낡은 클로저 문제가 생긴다 — ref 로 최신 값을 항상 가리키게 한다.
   */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  /**
   * 파일마다 스크롤 위치를 기억한다.
   *
   * 탭을 오가면 이 컴포넌트가 언마운트됐다 다시 붙어서, 아무것도 안 하면 매번 맨 위로 돌아간다 —
   * 긴 파일을 보다가 대화를 확인하고 돌아오면 읽던 자리를 잃는다.
   */
  const scrollByPathRef = useRef(new Map<string, number>());

  // 에디터는 `path`가 바뀔 때만 다시 만들고, 그 사이에는 문서만 갈아 끼운다 — 매번 다시 만들면
  // 스크롤과 선택이 날아간다. `readOnly`는 별도 `Compartment`로 감싸 재구성만 한다(destroy/재생성
  // 없이) — 파일을 여는 동안(loading→loaded, readOnly가 true→false) 에디터 DOM 전체가 다시
  // 그려지며 깜박이던 걸 없앤다(2026-09 지적으로 확인).
  useEffect(() => {
    if (hostRef.current === null) return undefined;

    const language = languageOf(path);
    const readOnlyCompartment = new Compartment();
    readOnlyCompartmentRef.current = readOnlyCompartment;
    const editor = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialDocRef.current,
        extensions: [
          lineNumbers(),
          // 코드 접기/펼치기 거터 — 가터에 뜨는 화살표를 눌러도, `foldKeymap`(아래 keymap)의
          // 단축키로도 접을 수 있다.
          foldGutter(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          highlightSelectionMatches(),
          // Ctrl+D(다음 일치 선택)·Ctrl+Shift+L(모두 선택, 둘 다 `searchKeymap`)이 실제로
          // 멀티커서를 만들려면 이 facet이 켜져 있어야 한다(CodeMirror 6 기본값은 false).
          EditorState.allowMultipleSelections.of(true),
          // 폰에서 긴 파일을 훑는 유일한 수단이다 — 스크롤만으로는 못 찾는다.
          search({ top: true }),
          history(),
          keymap.of([...getKeymapForExtension(fileExtensionOf(path)), ...searchKeymap, ...historyKeymap, ...defaultKeymap]),
          syntaxHighlighting(highlight, { fallback: true }),
          theme,
          readOnlyCompartment.of(readOnlyExtensions(readOnly, onSaveRef, onChangeRef)),
          // 읽기 전용이면 본문이 포커스를 못 받아 단축키가 닿지 않는다 — 검색을 쓰려면 필요하다.
          // CodeMirror는 `.cm-content`에 항상 `role="textbox"`를 붙이므로(읽기 전용이어도) 이름이
          // 없으면 `aria-input-field-name` 위반이다 — `aria-label`로 채운다.
          EditorView.contentAttributes.of({ tabindex: '0', 'aria-label': `${path} 내용` }),
          EditorView.lineWrapping,
          ...(language === undefined ? [] : [LANGUAGE_EXTENSION[language]()]),
        ],
      }),
    });
    viewRef.current = editor;

    const remembered = scrollByPathRef.current.get(path);
    if (remembered !== undefined) editor.scrollDOM.scrollTop = remembered;

    const remember = () => scrollByPathRef.current.set(path, editor.scrollDOM.scrollTop);
    editor.scrollDOM.addEventListener('scroll', remember, { passive: true });

    return () => {
      remember();
      editor.scrollDOM.removeEventListener('scroll', remember);
      editor.destroy();
      viewRef.current = null;
      readOnlyCompartmentRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언어는 경로에서 나오므로 경로가 바뀔 때만 다시 만든다. 내용만 바뀌는 경우는 아래 훅이 맡는다.
  }, [path]);

  useEffect(() => {
    const editor = viewRef.current;
    const compartment = readOnlyCompartmentRef.current;
    if (editor === null || compartment === null) return;
    editor.dispatch({ effects: compartment.reconfigure(readOnlyExtensions(readOnly, onSaveRef, onChangeRef)) });
  }, [readOnly]);

  useEffect(() => {
    const editor = viewRef.current;
    if (editor === null || editor.state.doc.toString() === content) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: content } });
  }, [content]);

  /**
   * 요청한 위치로 커서를 옮기고 그 줄이 보이게 스크롤한다. 파일이 아직 안 읽혔으면(줄이 없으면)
   * 내용이 도착한 뒤에 다시 시도한다 — 그래서 `content`도 의존성이다. 같은 `seq`는 한 번만 적용한다.
   */
  const appliedRevealRef = useRef<number | null>(null);
  useEffect(() => {
    const editor = viewRef.current;
    if (editor === null || revealAt === null || appliedRevealRef.current === revealAt.seq) return;
    const { doc } = editor.state;
    if (revealAt.line > doc.lines) return; // 아직 내용이 덜 왔다 — 다음 content에서 다시
    const line = doc.line(revealAt.line);
    const pos = Math.min(line.from + Math.max(revealAt.column - 1, 0), line.to);
    appliedRevealRef.current = revealAt.seq;
    editor.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    editor.focus();
  }, [revealAt, content]);

  const openSearch = useCallback(() => {
    const editor = viewRef.current;
    if (editor === null) return;
    editor.focus();
    openSearchPanel(editor);
  }, []);

  return { hostRef, openSearch };
};
