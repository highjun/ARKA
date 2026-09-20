import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, foldGutter, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { fileExtensionOf, getKeymapForExtension } from "./shared";

export type CodeLanguage =
  "javascript" | "typescript" | "jsx" | "tsx" | "json" | "markdown" | "css" | "html" | "python";

const BY_EXTENSION: Readonly<Record<string, CodeLanguage>> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  html: "html",
  htm: "html",
  py: "python",
};

export const languageOf = (path: string): CodeLanguage | undefined => {
  const extension = fileExtensionOf(path);
  return extension === undefined ? undefined : BY_EXTENSION[extension];
};

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

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: "var(--codeMirror-syntax-fgColor-keyword)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--codeMirror-syntax-fgColor-string)" },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: "var(--codeMirror-syntax-fgColor-comment)",
    fontStyle: "italic",
  },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--codeMirror-syntax-fgColor-constant)" },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: "var(--codeMirror-syntax-fgColor-entity)",
  },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: "var(--fgColor-muted)" },
  { tag: [tags.heading, tags.strong], color: "var(--codeMirror-syntax-fgColor-keyword)", fontWeight: "bold" },
  { tag: tags.link, color: "var(--codeMirror-syntax-fgColor-constant)", textDecoration: "underline" },
]);

const theme = EditorView.theme({
  "&": { backgroundColor: "transparent", color: "var(--codeMirror-fgColor)" },
  ".cm-content": { caretColor: "var(--codeMirror-cursor-fgColor)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--codeMirror-cursor-fgColor)" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--codeMirror-lineNumber-fgColor)" },
  ".cm-activeLine": { backgroundColor: "var(--codeMirror-activeline-bgColor)" },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--codeMirror-activeline-bgColor)",
    color: "var(--codeMirror-fgColor)",
  },
  ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--codeMirror-selection-bgColor)",
  },
  ".cm-searchMatch": {
    backgroundColor: "var(--bgColor-attention-muted)",
    outline: "1px solid var(--borderColor-accent-emphasis)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--codeMirror-selection-bgColor)" },
  ".cm-panels": { backgroundColor: "var(--codeMirror-bgColor)", color: "var(--codeMirror-fgColor)" },
  ".cm-panels input, .cm-panels button": { color: "var(--codeMirror-fgColor)" },
});

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
  readonly hostRef: RefObject<HTMLDivElement | null>;
  readonly openSearch: () => void;
}

const readOnlyExtensions = (
  readOnly: boolean,
  onSaveRef: RefObject<(() => void) | undefined>,
  onChangeRef: RefObject<((content: string) => void) | undefined>,
): Extension[] => [
  keymap.of(
    readOnly
      ? []
      : [
          {
            key: "Mod-s",
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

export const useCodeMirrorEditor = ({
  path,
  content,
  readOnly,
  onChange,
  onSave,
  revealAt = null,
}: UseCodeMirrorEditorOptions): UseCodeMirrorEditorResult => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartmentRef = useRef<Compartment | null>(null);
  const initialDocRef = useRef(content);
  initialDocRef.current = content;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const scrollByPathRef = useRef(new Map<string, number>());

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
          foldGutter(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          highlightSelectionMatches(),
          EditorState.allowMultipleSelections.of(true),
          search({ top: true }),
          history(),
          keymap.of([
            ...getKeymapForExtension(fileExtensionOf(path)),
            ...searchKeymap,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          syntaxHighlighting(highlight, { fallback: true }),
          theme,
          readOnlyCompartment.of(readOnlyExtensions(readOnly, onSaveRef, onChangeRef)),
          EditorView.contentAttributes.of({ tabindex: "0", "aria-label": `${path} 내용` }),
          EditorView.lineWrapping,
          ...(language === undefined ? [] : [LANGUAGE_EXTENSION[language]()]),
        ],
      }),
    });
    viewRef.current = editor;

    const remembered = scrollByPathRef.current.get(path);
    if (remembered !== undefined) editor.scrollDOM.scrollTop = remembered;

    const remember = () => scrollByPathRef.current.set(path, editor.scrollDOM.scrollTop);
    editor.scrollDOM.addEventListener("scroll", remember, { passive: true });

    return () => {
      remember();
      editor.scrollDOM.removeEventListener("scroll", remember);
      editor.destroy();
      viewRef.current = null;
      readOnlyCompartmentRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const appliedRevealRef = useRef<number | null>(null);
  useEffect(() => {
    const editor = viewRef.current;
    if (editor === null || revealAt === null || appliedRevealRef.current === revealAt.seq) return;
    const { doc } = editor.state;
    if (revealAt.line > doc.lines) return;
    const line = doc.line(revealAt.line);
    const pos = Math.min(line.from + Math.max(revealAt.column - 1, 0), line.to);
    appliedRevealRef.current = revealAt.seq;
    editor.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
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
