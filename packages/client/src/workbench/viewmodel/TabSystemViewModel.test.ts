import { Container } from "#core/di";
import { CommandService, type ICommandService } from "#core/commands";
import { Registry } from "#core/registry";
import { URI } from "#contracts";
import { observable, observableRef, runInAction } from "mobx";
import type { TabDescriptor, TabProviderDescriptor } from "../model/ITabProviderDescriptor";
import { Notifications } from "../model/Notifications";
import { ROOT_PANE_ID } from "../model/tabsShare";
import { TabLayout } from "../model/TabLayout";
import type { ITabLayout } from "../model/ITabLayout";
import type { IStorage } from "../model/IStorage";
import { TabSystem } from "../model/TabSystem";
import type { ITabSystem } from "../model/ITabSystem";
import { TabSystemViewModel } from "./TabSystemViewModel";
import type { ITabSystemViewModel, PaneRowLeaf, PaneRowNode } from "./ITabSystemViewModel";

const fakeCommands = (): ICommandService =>
  new CommandService({ overridesStore: { load: () => ({}), save: () => undefined }, reportError: () => undefined });

const fakeStorage = (): IStorage => {
  const store = new Map<string, string>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
  };
};

const fileId = (path: string): string => URI.file(path).toString();
const preview = (tabs: ITabSystem, path: string): Promise<void> => tabs.open(URI.file(path), { preview: true });

const fakeProviders = (): { registry: Registry<TabProviderDescriptor>; markDirty: (id: string) => void } => {
  const dirty = observable(new Set<string>());
  const registry = new Registry<TabProviderDescriptor>();
  const descriptor = (id: string, title: string): TabDescriptor =>
    observable(
      {
        icon: null,
        title,
        get isDirty() {
          return dirty.has(id);
        },
        Content: () => null,
      },
      { Content: observableRef },
    );
  registry.add({
    id: "file",
    priority: 0,
    openTab: (uri) =>
      Promise.resolve(
        uri.scheme === "file" ? descriptor(uri.toString(), uri.path.split("/").pop() ?? uri.path) : undefined,
      ),
  });
  registry.add({
    id: "chat",
    priority: 0,
    openTab: (uri) => Promise.resolve(uri.scheme === "chat" ? descriptor(uri.toString(), "대화") : undefined),
  });
  return { registry, markDirty: (id) => runInAction(() => void dirty.add(id)) };
};

const make = (): {
  tabLayout: ITabLayout;
  tabs: ITabSystem;
  viewModel: ITabSystemViewModel;
  markDirty: (id: string) => void;
  commands: ICommandService;
} => {
  const { registry, markDirty } = fakeProviders();
  const notifications = new Notifications({ newId: () => "n" });
  const tabLayout = new TabLayout({ storage: fakeStorage() });
  const tabs = new TabSystem({ layout: tabLayout, providers: registry, notifications, root: new Container("test") });
  const commands = fakeCommands();
  const viewModel = new TabSystemViewModel({ tabLayout, tabs, commands, copyToClipboard: () => undefined });
  return { tabLayout, tabs, viewModel, markDirty, commands };
};

const findLeaf = (node: PaneRowNode, leafId: string): PaneRowLeaf | null => {
  if (node.kind === "leaf") return node.id === leafId ? node : null;
  for (const child of node.children) {
    const found = findLeaf(child, leafId);
    if (found) return found;
  }
  return null;
};

const activeLeafOf = (viewModel: ITabSystemViewModel): PaneRowLeaf => {
  const leaf = findLeaf(viewModel.tree, viewModel.activePaneId);
  if (!leaf) throw new Error("activeLeafId가 트리 안에 없다");
  return leaf;
};

const tabIdsOf = (leaf: PaneRowLeaf): string[] => leaf.tabs.map((tab) => tab.id);

describe("ITabSystemViewModel — 파일 미리보기", () => {
  it("탭 제목은 경로가 아니라 파일 이름이다 — 폰의 좁은 스트립에 경로가 들어가지 않는다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "projects/dev-kit/STATUS.md");

    expect(activeLeafOf(viewModel).tabs.at(-1)).toMatchObject({
      id: fileId("projects/dev-kit/STATUS.md"),
      kind: "file",
      title: "STATUS.md",
      isPreview: true,
      isDirty: false,
    });
  });

  it("미리보기는 자리 하나를 갈아끼운다 — 훑는 것만으로 탭이 쌓이지 않는다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    await preview(tabs, "b.md");
    await preview(tabs, "c.md");

    const leaf = activeLeafOf(viewModel);
    expect(tabIdsOf(leaf)).toEqual([fileId("c.md")]);
    expect(leaf.activeTabId).toBe(fileId("c.md"));
  });

  it("같은 파일을 두 번 열면 고정된다 — 다음 미리보기가 밀어내지 못한다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    await preview(tabs, "a.md");
    await preview(tabs, "b.md");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a.md"), fileId("b.md")]);
  });

  it("고정한 탭이 있어도 미리보기 자리는 계속 하나다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    await preview(tabs, "a.md");
    await preview(tabs, "b.md");
    await preview(tabs, "c.md");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a.md"), fileId("c.md")]);
  });

  it("미리보기 탭을 닫으면 다음 미리보기가 새 탭이 된다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    viewModel.closeTab(ROOT_PANE_ID, fileId("a.md"));
    await preview(tabs, "b.md");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("b.md")]);
  });

  it("루트 바로 아래 파일은 경로가 곧 이름이다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "AGENTS.md");

    expect(activeLeafOf(viewModel).tabs.at(-1)?.title).toBe("AGENTS.md");
  });
});

describe("ITabSystemViewModel — 탭 고르기", () => {
  it("없는 leaf를 고르면 활성이 바뀌지 않는다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    viewModel.selectTab("없는pane", fileId("a.md"));

    expect(activeLeafOf(viewModel).activeTabId).toBe(fileId("a.md"));
  });

  it("있는 leaf여도 그 leaf에 없는 탭을 고르면 무시한다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    viewModel.selectTab(ROOT_PANE_ID, "없는탭");

    expect(activeLeafOf(viewModel).activeTabId).toBe(fileId("a.md"));
  });
});

describe("ITabSystemViewModel — 탭", () => {
  it("탭이 없으면 activeLeafId는 root이고 트리는 빈 루트 leaf다", () => {
    const { viewModel } = make();

    expect(viewModel.activePaneId).toBe(ROOT_PANE_ID);
    expect(viewModel.tree).toEqual({ kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null });
  });

  it("없는 탭을 닫으면 아무 일도 일어나지 않는다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    viewModel.closeTab(ROOT_PANE_ID, "없는탭");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a.md")]);
  });

  it("Model 의 트리가 그대로 비친다", () => {
    const { tabLayout, viewModel } = make();

    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [{ id: "a", kind: "file", uri: URI.file("a"), title: "a" }],
      activeTabId: "a",
    });

    expect(activeLeafOf(viewModel)).toMatchObject({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [{ id: "a", kind: "file", title: "a", isPreview: false, isDirty: false }],
      activeTabId: "a",
    });
  });

  it("닫으면 이웃이 활성화된다 — 오른쪽 먼저, 없으면 왼쪽", () => {
    const { tabLayout, viewModel } = make();

    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "1" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "2" },
      ],
      activeTabId: "b",
    });
    viewModel.closeTab(ROOT_PANE_ID, "b");

    expect(activeLeafOf(viewModel).activeTabId).toBe("a");
  });

  it("마지막 탭을 닫으면 빈 루트 leaf로 돌아간다", () => {
    const { tabLayout, viewModel } = make();

    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [{ id: "a", kind: "file", uri: URI.file("a"), title: "1" }],
      activeTabId: "a",
    });
    viewModel.closeTab(ROOT_PANE_ID, "a");

    expect(viewModel.tree).toEqual({ kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null });
    expect(viewModel.activePaneId).toBe(ROOT_PANE_ID);
  });
});

describe("ITabSystemViewModel — closeOthers", () => {
  const threeTabs = async () => {
    const made = make();
    for (const path of ["a", "b", "c"]) await made.tabs.open(URI.file(path));
    made.viewModel.selectTab(ROOT_PANE_ID, fileId("b"));
    return made;
  };

  it("넘긴 탭만 남기고 나머지를 닫는다", async () => {
    const { viewModel } = await threeTabs();

    viewModel.closeOthers(ROOT_PANE_ID, fileId("b"));

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("b")]);
  });

  it("더티인 탭은 남긴다 — 저장 안 된 변경을 잃지 않는다", async () => {
    const { viewModel, markDirty } = await threeTabs();
    markDirty(fileId("c"));

    viewModel.closeOthers(ROOT_PANE_ID, fileId("b"));

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("b"), fileId("c")]);
  });

  it("닫힌 탭이 활성이었으면 남긴 탭으로 활성을 옮긴다", async () => {
    const { viewModel } = await threeTabs();

    viewModel.closeOthers(ROOT_PANE_ID, fileId("a"));

    expect(activeLeafOf(viewModel).activeTabId).toBe(fileId("a"));
  });

  it("없는 leaf/탭이면 아무 일도 일어나지 않는다", async () => {
    const { viewModel } = await threeTabs();

    viewModel.closeOthers(ROOT_PANE_ID, "없는탭");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a"), fileId("b"), fileId("c")]);
  });
});

describe("ITabSystemViewModel — closeToRight", () => {
  const threeTabs = async () => {
    const made = make();
    for (const path of ["a", "b", "c"]) await made.tabs.open(URI.file(path));
    return made;
  };

  it("기준 탭보다 뒤에 있는 탭을 전부 닫는다", async () => {
    const { viewModel } = await threeTabs();

    viewModel.closeToRight(ROOT_PANE_ID, fileId("a"));

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a")]);
  });

  it("더티인 탭은 남긴다", async () => {
    const { viewModel, markDirty } = await threeTabs();
    markDirty(fileId("c"));

    viewModel.closeToRight(ROOT_PANE_ID, fileId("a"));

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a"), fileId("c")]);
  });

  it("맨 오른쪽 탭 기준이면(닫을 게 없으면) 아무 일도 일어나지 않는다", async () => {
    const { viewModel } = await threeTabs();

    viewModel.closeToRight(ROOT_PANE_ID, fileId("c"));

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a"), fileId("b"), fileId("c")]);
  });

  it("닫힌 탭이 활성이었으면 기준 탭으로 활성을 옮긴다", async () => {
    const { viewModel } = await threeTabs();

    viewModel.closeToRight(ROOT_PANE_ID, fileId("a"));

    expect(activeLeafOf(viewModel).activeTabId).toBe(fileId("a"));
  });
});

describe("ITabSystemViewModel — 미리보기 표시", () => {
  it("미리보기 탭만 isPreview 다 — 화면이 기울임으로 알린다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    await preview(tabs, "a.md");
    await preview(tabs, "b.md");

    const rows = activeLeafOf(viewModel).tabs;
    expect(rows.filter((tab) => tab.isPreview).map((tab) => tab.id)).toEqual([fileId("b.md")]);
  });

  it("고정하면 표시가 사라진다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    await preview(tabs, "a.md");

    expect(activeLeafOf(viewModel).tabs.every((tab) => !tab.isPreview)).toBe(true);
  });

  it("pinTab을 부르면 미리보기 표시가 사라진다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    viewModel.pinTab(fileId("a.md"));

    expect(activeLeafOf(viewModel).tabs.find((tab) => tab.id === fileId("a.md"))?.isPreview).toBe(false);
  });

  it("미리보기 자리가 아닌 탭에 pinTab을 불러도 아무 일도 없다", async () => {
    const { viewModel, tabs } = make();

    await preview(tabs, "a.md");
    await preview(tabs, "b.md");

    viewModel.pinTab(fileId("a.md"));

    expect(activeLeafOf(viewModel).tabs.find((tab) => tab.id === fileId("b.md"))?.isPreview).toBe(true);
  });
});

describe("ITabSystemViewModel — 분할", () => {
  it("가장자리로 분할하면 새 pane이 생기고 그리로 포커스가 옮겨간다", () => {
    const { tabLayout, viewModel } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "a" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "b" },
      ],
      activeTabId: "a",
    });

    viewModel.splitTab(ROOT_PANE_ID, "b", "right");

    const tree = viewModel.tree;
    if (tree.kind !== "split") throw new Error("split 노드여야 한다");
    expect(tree.orientation).toBe("horizontal");
    expect(tree.children.map((child) => child.id)).toEqual([ROOT_PANE_ID, `${ROOT_PANE_ID}-split-b`]);
    expect(viewModel.activePaneId).toBe(`${ROOT_PANE_ID}-split-b`);
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(["b"]);

    const sourceLeaf = findLeaf(tree, ROOT_PANE_ID);
    expect(sourceLeaf && tabIdsOf(sourceLeaf)).toEqual(["a"]);
  });

  it("왼쪽/위로 분할하면 새 pane이 먼저 그려지는 자리에 온다", () => {
    const { tabLayout, viewModel } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "a" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "b" },
      ],
      activeTabId: "a",
    });

    viewModel.splitTab(ROOT_PANE_ID, "b", "top");

    const tree = viewModel.tree;
    if (tree.kind !== "split") throw new Error("split 노드여야 한다");
    expect(tree.orientation).toBe("vertical");
    expect(tree.children.map((child) => child.id)).toEqual([`${ROOT_PANE_ID}-split-b`, ROOT_PANE_ID]);
  });

  it("없는 leaf·탭을 분할하려 하면 무시한다", async () => {
    const { viewModel, tabs } = make();
    await preview(tabs, "a.md");

    viewModel.splitTab("없는pane", fileId("a.md"), "right");
    viewModel.splitTab(ROOT_PANE_ID, "없는탭", "right");

    expect(viewModel.tree.kind).toBe("leaf");
  });

  it("분할된 pane에서 마지막 탭을 닫으면 다시 단일 leaf로 접힌다", () => {
    const { tabLayout, viewModel } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "a" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "b" },
      ],
      activeTabId: "a",
    });
    viewModel.splitTab(ROOT_PANE_ID, "b", "right");

    viewModel.closeTab(`${ROOT_PANE_ID}-split-b`, "b");

    expect(viewModel.tree).toMatchObject({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [{ id: "a", kind: "file", title: "a", isPreview: false, isDirty: false }],
      activeTabId: "a",
    });
    expect(viewModel.activePaneId).toBe(ROOT_PANE_ID);
  });
});

describe("ITabSystemViewModel — 리사이즈", () => {
  it("분할된 branch 안 자식의 비율을 바꾼다", () => {
    const { tabLayout, viewModel } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "a" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "b" },
      ],
      activeTabId: "a",
    });
    viewModel.splitTab(ROOT_PANE_ID, "b", "right");
    const branchId = viewModel.tree.id;

    viewModel.resizePane(branchId, ROOT_PANE_ID, 35);

    const tree = viewModel.tree;
    if (tree.kind !== "split") throw new Error("split 노드여야 한다");
    expect(tree.children.find((child) => child.id === ROOT_PANE_ID)?.size).toBe(35);
  });
});

describe("ITabSystemViewModel — 재정렬", () => {
  it("leaf 안에서 탭 순서를 바꾼다", () => {
    const { tabLayout, viewModel } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "a" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "b" },
      ],
      activeTabId: "a",
    });

    viewModel.reorderTabs(ROOT_PANE_ID, ["b", "a"]);

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(["b", "a"]);
  });

  it("id 개수가 안 맞으면 무시한다 — View 가 들고 있던 탭 집합이 어긋난 것이다", () => {
    const { tabLayout, viewModel } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "a" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "b" },
      ],
      activeTabId: "a",
    });

    viewModel.reorderTabs(ROOT_PANE_ID, ["a"]);

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(["a", "b"]);
  });
});

describe("ITabSystemViewModel — 분할된 상태에서 미리보기", () => {
  it("활성 pane 기준으로 연다 — 다른 pane 의 탭은 건드리지 않는다", async () => {
    const { tabLayout, viewModel, tabs } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "a", kind: "file", uri: URI.file("a"), title: "a" },
        { id: "b", kind: "file", uri: URI.file("b"), title: "b" },
      ],
      activeTabId: "a",
    });
    viewModel.splitTab(ROOT_PANE_ID, "b", "right");
    const otherLeafId = `${ROOT_PANE_ID}-split-b`;
    expect(viewModel.activePaneId).toBe(otherLeafId);

    await preview(tabs, "preview.md");
    viewModel.selectTab(ROOT_PANE_ID, "a");
    await preview(tabs, "other.md");

    const otherLeaf = findLeaf(viewModel.tree, otherLeafId);
    expect(otherLeaf && tabIdsOf(otherLeaf)).toEqual(["b", fileId("preview.md")]);
    expect(otherLeaf?.tabs.every((tab) => !tab.isPreview)).toBe(true);

    const rootLeaf = findLeaf(viewModel.tree, ROOT_PANE_ID);
    expect(rootLeaf && tabIdsOf(rootLeaf)).toEqual(["a", fileId("other.md")]);
    expect(rootLeaf?.tabs.find((tab) => tab.id === fileId("other.md"))?.isPreview).toBe(true);
  });
});

describe("ITabSystemViewModel — retargetTabs", () => {
  it("경로가 정확히 같은 파일 탭의 id·제목을 바꾼다", async () => {
    const { viewModel, tabs } = make();
    await preview(tabs, "old.txt");

    viewModel.retargetTabs("old.txt", "new.txt");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("new.txt")]);
  });

  it("폴더 이동이면 그 아래 전부를 접두어째로 옮긴다", () => {
    const { tabLayout, viewModel } = make();
    tabLayout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [
        { id: "old/a.md", kind: "file", uri: URI.file("old/a.md"), title: "a.md" },
        { id: "old/nested/b.md", kind: "file", uri: URI.file("old/nested/b.md"), title: "b.md" },
        { id: "unrelated.md", kind: "file", uri: URI.file("unrelated.md"), title: "unrelated.md" },
      ],
      activeTabId: "old/a.md",
    });

    viewModel.retargetTabs("old", "new");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("new/a.md"), fileId("new/nested/b.md"), "unrelated.md"]);
  });

  it("겹치는 접두어를 가진 다른 파일은 건드리지 않는다 — old.txt 는 old 의 하위가 아니다", async () => {
    const { viewModel, tabs } = make();
    await preview(tabs, "old.txt");

    viewModel.retargetTabs("old", "new");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("old.txt")]);
  });

  it("활성 탭·미리보기 탭도 같이 따라간다", async () => {
    const { viewModel, tabs } = make();
    await preview(tabs, "old.txt");

    viewModel.retargetTabs("old.txt", "new.txt");

    const leaf = activeLeafOf(viewModel);
    expect(leaf.activeTabId).toBe(fileId("new.txt"));
    expect(leaf.tabs[0]?.isPreview).toBe(true);
  });

  it("해당하는 탭이 없으면 아무것도 바뀌지 않는다", async () => {
    const { viewModel, tabs } = make();
    await preview(tabs, "a.md");

    viewModel.retargetTabs("nope", "new");

    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a.md")]);
  });
});

describe("requestCloseTab / confirmClose / cancelClose", () => {
  it("dirty가 아니면 바로 닫는다 — 확인을 구하지 않는다", async () => {
    const { viewModel, tabs } = make();
    await preview(tabs, "a.md");
    viewModel.pinTab(fileId("a.md"));

    viewModel.requestCloseTab(ROOT_PANE_ID, fileId("a.md"));

    expect(viewModel.pendingClose).toBeNull();
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([]);
  });

  it("dirty면 즉시 닫지 않고 확인 대상을 담아 둔다", async () => {
    const { viewModel, markDirty, tabs } = make();
    await preview(tabs, "a.md");
    viewModel.pinTab(fileId("a.md"));
    markDirty(fileId("a.md"));

    viewModel.requestCloseTab(ROOT_PANE_ID, fileId("a.md"));

    expect(viewModel.pendingClose).toEqual({ paneId: ROOT_PANE_ID, tabId: fileId("a.md") });
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a.md")]);
  });

  it("confirmClose은 담아 둔 대상을 실제로 닫고 비운다", async () => {
    const { viewModel, markDirty, tabs } = make();
    await preview(tabs, "a.md");
    viewModel.pinTab(fileId("a.md"));
    markDirty(fileId("a.md"));
    viewModel.requestCloseTab(ROOT_PANE_ID, fileId("a.md"));

    viewModel.confirmClose();

    expect(viewModel.pendingClose).toBeNull();
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([]);
  });

  it("cancelClose은 닫지 않고 비운다", async () => {
    const { viewModel, markDirty, tabs } = make();
    await preview(tabs, "a.md");
    viewModel.pinTab(fileId("a.md"));
    markDirty(fileId("a.md"));
    viewModel.requestCloseTab(ROOT_PANE_ID, fileId("a.md"));

    viewModel.cancelClose();

    expect(viewModel.pendingClose).toBeNull();
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("a.md")]);
  });

  it("confirmClose은 담아 둔 것이 없으면 아무 일도 하지 않는다", () => {
    const { viewModel } = make();

    expect(() => viewModel.confirmClose()).not.toThrow();
    expect(viewModel.pendingClose).toBeNull();
  });
});

describe("ITabSystemViewModel — openTab", () => {
  it("파일이 아닌 탭을 고정으로 열고 활성으로 만든다", async () => {
    const { viewModel, tabs } = make();
    await tabs.open(URI.parse("chat:///1"));
    const leaf = activeLeafOf(viewModel);
    expect(leaf.tabs).toMatchObject([
      { id: "chat:///1", kind: "chat", title: "대화", isPreview: false, isDirty: false },
    ]);
    expect(leaf.activeTabId).toBe("chat:///1");
  });

  it("이미 열려 있으면 그 탭으로 갈 뿐 복제하지 않는다", async () => {
    const { viewModel, tabs } = make();
    await tabs.open(URI.parse("chat:///1"));
    await preview(tabs, "a.md");
    await tabs.open(URI.parse("chat:///1"));
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual(["chat:///1", fileId("a.md")]);
    expect(activeLeafOf(viewModel).activeTabId).toBe("chat:///1");
  });
});

describe("ITabSystemViewModel — 편집이 시작되면 고정", () => {
  it("미리보기 탭이 더러워지는 순간 고정된다 — 기울임(아직 안 읽어본 파일)으로 남지 않는다", async () => {
    const { viewModel, markDirty, tabs } = make();
    await preview(tabs, "a.md");
    expect(activeLeafOf(viewModel).tabs[0]?.isPreview).toBe(true);

    markDirty(fileId("a.md"));

    expect(activeLeafOf(viewModel).tabs[0]).toMatchObject({ isPreview: false, isDirty: true });
  });
});

describe("ITabSystemViewModel — 탭 시스템 위임", () => {
  it("트리의 줄은 descriptor의 제목을 따르고, containerOf는 탭 시스템의 것을 그대로 준다", async () => {
    const { viewModel, tabs } = make();
    await preview(tabs, "a.md");

    expect(activeLeafOf(viewModel).tabs[0]?.title).toBe("a.md");
    expect(viewModel.containerOf(fileId("a.md")).toString()).toBe(`Container(tab:${fileId("a.md")})`);
  });
});

describe("ITabSystemViewModel — activeTab", () => {
  it("활성 leaf의 활성 탭을 준다", async () => {
    const { viewModel, tabs } = make();
    expect(viewModel.activeTab).toBeNull();
    await preview(tabs, "a.md");
    expect(viewModel.activeTab).toEqual({ id: fileId("a.md"), kind: "file" });
  });
});

describe("ITabSystemViewModel — 탭 명령", () => {
  it("shell.tab.close는 우클릭한 탭을, 대상이 없으면 활성 탭을 닫는다", async () => {
    const { viewModel, tabs, commands } = make();
    await tabs.open(URI.file("a"));
    await tabs.open(URI.file("b"));

    commands.execute("shell.tab.close", { paneId: ROOT_PANE_ID, tabId: fileId("a") });
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([fileId("b")]);

    commands.execute("shell.tab.close");
    expect(tabIdsOf(activeLeafOf(viewModel))).toEqual([]);
  });

  it("shell.tab.context 메뉴에 분할·닫기·복사가 순서대로 담긴다", () => {
    const { commands } = make();

    expect(commands.matchMenuItems("shell.tab.context").map((item) => item.actionId)).toEqual([
      "shell.tab.splitLeft",
      "shell.tab.splitRight",
      "shell.tab.splitTop",
      "shell.tab.splitBottom",
      "shell.tab.close",
      "shell.tab.closeOthers",
      "shell.tab.closeToRight",
      "shell.tab.copyPath",
    ]);
  });
});
