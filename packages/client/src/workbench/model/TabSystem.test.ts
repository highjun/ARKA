import { URI } from "#contracts";
import { Container } from "#core/di";
import { DescriptorNotFoundError, Registry } from "#core/registry";
import { describe, expect, it, vi } from "vitest";
import type { IStorage } from "./IStorage";
import type { OpenTab, PaneNode } from "./ITabLayout";
import type { TabDescriptor, TabProviderDescriptor } from "./ITabProviderDescriptor";
import { Notifications } from "./Notifications";
import { collectTabs, findLeaf } from "./paneTree";
import { TabLayout } from "./TabLayout";
import { ROOT_PANE_ID } from "./tabsShare";
import { TabSystem } from "./TabSystem";

const fakeStorage = (): IStorage => {
  const store = new Map<string, string>();
  return { get: (key) => store.get(key) ?? null, set: (key, value) => void store.set(key, value) };
};

const NOOP_CONTENT = () => null;
const descriptor = (title: string, isDirty = false): TabDescriptor => ({
  icon: null,
  title,
  isDirty,
  Content: NOOP_CONTENT,
});

/** `scheme`만 받는 provider. 몇 번 물었는지 센다. */
const provider = (id: string, scheme: string, priority: number, isDirty = false) => {
  const openTab = vi.fn((uri: URI) =>
    Promise.resolve(uri.scheme === scheme ? descriptor(`${id}:${uri.path}`, isDirty) : undefined),
  );
  const entry: TabProviderDescriptor = { id, priority, openTab };
  return { entry, openTab };
};

const make = () => {
  const providers = new Registry<TabProviderDescriptor>();
  const notifications = new Notifications({ newId: () => "n" });
  const root = new Container("test");
  const layout = new TabLayout({ storage: fakeStorage() });
  const tabs = new TabSystem({ layout, providers, notifications, root });
  return { providers, notifications, root, layout, tabs };
};

const idsOf = (tree: PaneNode): string[] => collectTabs(tree).map((tab) => tab.id);
const file = (path: string): URI => URI.file(path);

describe("ITabSystem — open", () => {
  it("priority가 큰 provider부터 묻고 처음 받은 것으로 연다 — id는 uri 문자열, kind는 provider id", async () => {
    const { providers, layout, tabs } = make();
    const low = provider("text", "file", 0);
    const high = provider("pdf", "file", 10);
    providers.add(low.entry);
    providers.add(high.entry);

    await tabs.open(file("a.pdf"));

    expect(collectTabs(layout.tree)).toEqual([
      { id: "file:///a.pdf", kind: "pdf", uri: file("a.pdf"), title: "pdf:a.pdf" },
    ]);
    expect(low.openTab).not.toHaveBeenCalled();
    expect(tabs.descriptorOf("file:///a.pdf")?.title).toBe("pdf:a.pdf");
  });

  it("거절한 provider는 건너뛰고 다음에게 넘어간다", async () => {
    const { providers, layout, tabs } = make();
    const text = provider("text", "file", 0);
    const preview = provider("preview", "markdown-preview", 10);
    providers.add(text.entry);
    providers.add(preview.entry);

    await tabs.open(file("a.md"));

    expect(preview.openTab).toHaveBeenCalledOnce();
    expect(collectTabs(layout.tree).map((tab) => tab.kind)).toEqual(["text"]);
  });

  it("아무도 못 열면 탭을 만들지 않고 알림을 낸다", async () => {
    const { providers, layout, tabs, notifications } = make();
    providers.add(provider("text", "file", 0).entry);

    await tabs.open(URI.parse("chat:///1"));

    expect(idsOf(layout.tree)).toEqual([]);
    expect(notifications.items.map((item) => [item.severity, item.message])).toEqual([
      ["error", "열 수 없다 — chat:///1"],
    ]);
  });

  it("같은 uri가 이미 열려 있으면 복제하지 않고 그 탭을 활성화한다", async () => {
    const { providers, layout, tabs } = make();
    const text = provider("text", "file", 0);
    providers.add(text.entry);
    await tabs.open(file("a.md"));
    await tabs.open(file("b.md"));

    await tabs.open(file("a.md"));

    expect(idsOf(layout.tree)).toEqual(["file:///a.md", "file:///b.md"]);
    expect(findLeaf(layout.tree, ROOT_PANE_ID)?.activeTabId).toBe("file:///a.md");
    expect(text.openTab).toHaveBeenCalledTimes(2);
  });

  it("미리보기는 자리 하나를 갈아끼운다 — 훑는 것만으로 탭이 쌓이지 않는다", async () => {
    const { providers, layout, tabs } = make();
    providers.add(provider("text", "file", 0).entry);

    await tabs.open(file("a.md"), { preview: true });
    await tabs.open(file("b.md"), { preview: true });
    await tabs.open(file("c.md"), { preview: true });

    expect(idsOf(layout.tree)).toEqual(["file:///c.md"]);
    expect(layout.previewTabId).toBe("file:///c.md");
  });

  it("미리보기 탭을 한 번 더 열면 고정된다 — 다음 미리보기가 밀어내지 못한다", async () => {
    const { providers, layout, tabs } = make();
    providers.add(provider("text", "file", 0).entry);

    await tabs.open(file("a.md"), { preview: true });
    await tabs.open(file("a.md"), { preview: true });
    await tabs.open(file("b.md"), { preview: true });

    expect(idsOf(layout.tree)).toEqual(["file:///a.md", "file:///b.md"]);
    expect(layout.previewTabId).toBe("file:///b.md");
  });

  it("고정으로 열면 미리보기 자리를 건드리지 않는다", async () => {
    const { providers, layout, tabs } = make();
    providers.add(provider("text", "file", 0).entry);

    await tabs.open(file("a.md"), { preview: true });
    await tabs.open(file("b.md"));

    expect(idsOf(layout.tree)).toEqual(["file:///a.md", "file:///b.md"]);
    expect(layout.previewTabId).toBe("file:///a.md");
  });

  it("같은 uri를 연달아 열면 두 번째는 첫 번째를 기다린다 — 복제 대신 고정이 된다", async () => {
    const { providers, layout, tabs } = make();
    providers.add(provider("text", "file", 0).entry);

    await Promise.all([tabs.open(file("a.md"), { preview: true }), tabs.open(file("a.md"), { preview: true })]);

    expect(idsOf(layout.tree)).toEqual(["file:///a.md"]);
    expect(layout.previewTabId).toBeNull();
  });
});

describe("ITabSystem — restore", () => {
  const stored = (path: string, kind: string): OpenTab => ({
    id: `file:///${path}`,
    kind,
    uri: file(path),
    title: path,
  });

  it("kind로 provider를 바로 찾아 다시 묻는다 — 우선순위를 안 돈다", async () => {
    const { providers, layout, tabs } = make();
    const text = provider("text", "file", 0);
    const pdf = provider("pdf", "file", 10);
    providers.add(text.entry);
    providers.add(pdf.entry);
    layout.setTree({ kind: "leaf", id: ROOT_PANE_ID, tabs: [stored("a.md", "text")], activeTabId: "file:///a.md" });

    await tabs.restore(collectTabs(layout.tree));

    expect(pdf.openTab).not.toHaveBeenCalled();
    expect(tabs.descriptorOf("file:///a.md")?.title).toBe("text:a.md");
  });

  it("못 연 탭(provider가 없거나 거절)은 트리에서 빼고, 빈 pane을 걷는다", async () => {
    const { providers, layout, tabs } = make();
    providers.add(provider("text", "file", 0).entry);
    layout.setTree({
      kind: "split",
      id: "s",
      orientation: "horizontal",
      children: [
        {
          kind: "leaf",
          id: "left",
          tabs: [stored("a.md", "text"), stored("b.md", "gone")],
          activeTabId: "file:///b.md",
        },
        {
          kind: "leaf",
          id: "right",
          tabs: [{ id: "x", kind: "text", uri: URI.parse("chat:///1"), title: "x" }],
          activeTabId: "x",
        },
      ],
    });
    layout.setActivePaneId("right");

    await tabs.restore(collectTabs(layout.tree));

    expect(layout.tree).toEqual({
      kind: "leaf",
      id: "left",
      tabs: [stored("a.md", "text")],
      activeTabId: "file:///a.md",
    });
    expect(layout.activePaneId).toBe("left");
  });

  it("전부 못 열면 빈 루트 leaf로 돌아간다", async () => {
    const { layout, tabs } = make();
    layout.setTree({ kind: "leaf", id: "other", tabs: [stored("a.md", "gone")], activeTabId: "file:///a.md" });
    layout.setActivePaneId("other");

    await tabs.restore(collectTabs(layout.tree));

    expect(layout.tree).toEqual({ kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null });
    expect(layout.activePaneId).toBe(ROOT_PANE_ID);
  });

  it("이미 그릴 것이 있는 탭은 다시 묻지 않는다", async () => {
    const { providers, layout, tabs } = make();
    const text = provider("text", "file", 0);
    providers.add(text.entry);
    await tabs.open(file("a.md"));

    await tabs.restore(collectTabs(layout.tree));

    expect(text.openTab).toHaveBeenCalledOnce();
  });

  it("끝나면 onDidChange를 부른다 — 뒤늦게 붙은 descriptor를 화면이 알 길이다", async () => {
    const { providers, layout, tabs } = make();
    providers.add(provider("text", "file", 0).entry);
    layout.setTree({ kind: "leaf", id: ROOT_PANE_ID, tabs: [stored("a.md", "text")], activeTabId: "file:///a.md" });
    const listener = vi.fn();
    tabs.onDidChange(listener);

    await tabs.restore(collectTabs(layout.tree));

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("ITabSystem — 컨테이너", () => {
  it("탭이 목록에 생기면 자식 컨테이너가 생기고, 빠지면 dispose된다", async () => {
    const { providers, layout, tabs } = make();
    providers.add(provider("text", "file", 0).entry);
    await tabs.open(file("a.md"));
    const container = tabs.containerOf("file:///a.md");
    const disposeSpy = vi.spyOn(container, "dispose");

    layout.setTree({ kind: "leaf", id: ROOT_PANE_ID, tabs: [], activeTabId: null });

    expect(disposeSpy).toHaveBeenCalledOnce();
    expect(tabs.descriptorOf("file:///a.md")).toBeUndefined();
  });

  it("이미 목록에 있던 탭(복원된 것)도 만들어지는 순간 컨테이너를 갖는다", () => {
    const { layout, tabs } = make();
    layout.setTree({
      kind: "leaf",
      id: ROOT_PANE_ID,
      tabs: [{ id: "file:///a.md", kind: "text", uri: file("a.md"), title: "a.md" }],
      activeTabId: "file:///a.md",
    });

    expect(() => tabs.containerOf("file:///a.md")).not.toThrow();
  });

  it("탭 컨테이너는 루트의 자식이다 — 루트에 물린 것을 그대로 꺼낸다", async () => {
    const { providers, root, tabs } = make();
    providers.add(provider("text", "file", 0).entry);
    root.register("test.tabSystemSample", "singleton", () => ({ dispose: () => undefined }));
    await tabs.open(file("a.md"));

    expect(tabs.containerOf("file:///a.md").resolve("test.tabSystemSample")).toBe(root.resolve("test.tabSystemSample"));
  });

  it("없는 탭의 컨테이너를 물으면 DescriptorNotFoundError", () => {
    const { tabs } = make();

    expect(() => tabs.containerOf("nope")).toThrow(DescriptorNotFoundError);
  });

  it("dispose하면 탭 컨테이너가 전부 정리된다", async () => {
    const { providers, tabs } = make();
    providers.add(provider("text", "file", 0).entry);
    await tabs.open(file("a.md"));
    const container = tabs.containerOf("file:///a.md");

    tabs.dispose();

    expect(() => container.resolve("test.tabSystemSample")).toThrow();
  });
});

describe("ITabSystem — hasAnyDirty", () => {
  it("담긴 descriptor 중 하나라도 더러우면 참이다", async () => {
    const { providers, tabs } = make();
    providers.add(provider("clean", "file", 0).entry);
    providers.add(provider("dirty", "chat", 0, true).entry);
    await tabs.open(file("a.md"));
    expect(tabs.hasAnyDirty()).toBe(false);

    await tabs.open(URI.parse("chat:///1"));

    expect(tabs.hasAnyDirty()).toBe(true);
  });
});

declare module "#core/di" {
  /** 컨테이너 상속을 보는 데만 쓰는 시험용 항목. */
  interface InstanceMap {
    "test.tabSystemSample": { dispose(): void };
  }
}
