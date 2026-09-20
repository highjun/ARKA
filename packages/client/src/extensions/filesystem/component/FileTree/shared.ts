export interface SelectableRow {
  readonly id: string;
  readonly disabled?: boolean;
}

export type SelectionIntent = "replace" | "toggle" | "range";

export const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/iu.test(navigator.platform ?? navigator.userAgent ?? "");

export const selectionIntentOf = (
  event: { readonly metaKey: boolean; readonly ctrlKey: boolean; readonly shiftKey: boolean },
  apple: boolean = isApplePlatform(),
): SelectionIntent => {
  if (event.shiftKey) return "range";
  if (apple ? event.metaKey : event.ctrlKey) return "toggle";
  return "replace";
};

const withoutDisabled = (order: readonly SelectableRow[], ids: readonly string[]): readonly string[] => {
  const disabledIds = new Set(order.filter((row) => row.disabled).map((row) => row.id));
  return ids.filter((id) => !disabledIds.has(id));
};

export interface NextSelectionInput {
  readonly intent: SelectionIntent;
  readonly current: readonly string[];
  readonly order: readonly SelectableRow[];
  readonly anchorId: string | undefined;
  readonly targetId: string;
}

export interface NextSelectionResult {
  readonly ids: readonly string[];
  readonly anchorId: string;
}

export const nextSelection = ({
  intent,
  current,
  order,
  anchorId,
  targetId,
}: NextSelectionInput): NextSelectionResult => {
  if (intent === "replace") return { ids: [targetId], anchorId: targetId };

  if (intent === "toggle") {
    const ids = current.includes(targetId) ? current.filter((id) => id !== targetId) : [...current, targetId];
    return { ids, anchorId: targetId };
  }

  const anchorIndex = anchorId === undefined ? -1 : order.findIndex((row) => row.id === anchorId);
  const effectiveAnchorId = anchorIndex >= 0 ? anchorId! : targetId;
  const effectiveAnchorIndex = anchorIndex >= 0 ? anchorIndex : order.findIndex((row) => row.id === targetId);
  const targetIndex = order.findIndex((row) => row.id === targetId);
  const min = Math.min(effectiveAnchorIndex, targetIndex);
  const max = Math.max(effectiveAnchorIndex, targetIndex);
  const rangeIds = order.slice(min, max + 1).map((row) => row.id);

  return { ids: withoutDisabled(order, rangeIds), anchorId: effectiveAnchorId };
};

export const selectAll = (order: readonly SelectableRow[]): readonly string[] =>
  withoutDisabled(
    order,
    order.map((row) => row.id),
  );

export const selectionIncluding = (current: readonly string[], targetId: string): readonly string[] =>
  current.includes(targetId) ? current : [targetId];

export interface CompactableItem {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "file";
  readonly children?: readonly CompactableItem[];
}

export const compactFolderChains = <T extends CompactableItem>(items: readonly T[]): readonly T[] =>
  items.map((item) => {
    if (item.type !== "folder" || item.children === undefined) return item;

    const segments = [item.name];
    let terminal: CompactableItem = item;
    while (
      terminal.type === "folder" &&
      terminal.children !== undefined &&
      terminal.children.length === 1 &&
      terminal.children[0]!.type === "folder"
    ) {
      terminal = terminal.children[0]!;
      segments.push(terminal.name);
    }

    const compactedChildren = terminal.children === undefined ? undefined : compactFolderChains(terminal.children);
    if (segments.length === 1) return { ...item, children: compactedChildren } as T;
    return { ...(terminal as T), name: segments.join("/"), children: compactedChildren };
  });
