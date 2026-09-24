export interface SelectableRow {
  readonly id: string;
  readonly disabled?: boolean;
}

export type SelectionIntent = "replace" | "toggle" | "range" | "rangeAdd";

export const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/iu.test(navigator.platform ?? navigator.userAgent ?? "");

export const selectionIntentOf = (
  event: { readonly metaKey: boolean; readonly ctrlKey: boolean; readonly shiftKey: boolean },
  apple: boolean = isApplePlatform(),
): SelectionIntent => {
  const multi = apple ? event.metaKey : event.ctrlKey;
  if (event.shiftKey) return multi ? "rangeAdd" : "range";
  if (multi) return "toggle";
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
  const ids = withoutDisabled(order, rangeIds);
  if (intent === "range") return { ids, anchorId: effectiveAnchorId };

  // rangeAdd — 이미 고른 것 위에 범위를 얹는다.
  return { ids: [...current, ...ids.filter((id) => !current.includes(id))], anchorId: effectiveAnchorId };
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

export interface DroppableRow {
  readonly id: string;
  readonly type: "folder" | "file";
  readonly disabled?: boolean;
  readonly parentId: string | null;
}

/** 이 행에 놓으면 어느 폴더로 들어가는가. 폴더면 그 폴더, 파일이면 그 파일이 든 폴더, 행 밖이면 루트(`null`). */
export const dropParentIdOf = (row: DroppableRow | undefined): string | null =>
  row === undefined ? null : row.type === "folder" ? row.id : row.parentId;

/** 제자리·자기 자신·자기 안쪽·비활성으로는 못 간다. */
export const canDropInto = (
  source: DroppableRow,
  targetParentId: string | null,
  order: readonly DroppableRow[],
): boolean => {
  if (source.disabled === true) return false;
  if (targetParentId === source.parentId) return false;
  if (targetParentId === null) return true;

  const byId = new Map(order.map((row) => [row.id, row]));
  const target = byId.get(targetParentId);
  if (target === undefined || target.type !== "folder" || target.disabled === true) return false;

  for (let id: string | null = targetParentId; id !== null; id = byId.get(id)?.parentId ?? null) {
    if (id === source.id) return false;
  }
  return true;
};

/** 갈 수 있는 것만 남긴다. 선택 안에 조상과 자손이 함께 있으면 조상만 옮긴다. */
export const movableSources = <T extends DroppableRow>(
  sources: readonly T[],
  targetParentId: string | null,
  order: readonly DroppableRow[],
): readonly T[] => {
  const sourceIds = new Set(sources.map((row) => row.id));
  const byId = new Map(order.map((row) => [row.id, row]));
  const hasSourceAncestor = (row: T): boolean => {
    for (let id = row.parentId; id !== null; id = byId.get(id)?.parentId ?? null) {
      if (sourceIds.has(id)) return true;
    }
    return false;
  };

  return sources.filter((row) => canDropInto(row, targetParentId, order) && !hasSourceAncestor(row));
};
