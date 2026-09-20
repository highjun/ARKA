import type { IWorkspaceFiles } from "../model/IWorkspaceFiles";
import { DirectoryTreeModel } from "./DirectoryTreeModel";
import type { IDirectoryTreeModel } from "./IDirectoryTreeModel";

type ScriptedEntry = { name: string; type: "dir" | "file" };
type ScriptedPort = {
  list(path: string): Promise<{ path: string; parent: string | null; entries: ScriptedEntry[] }>;
  read(path: string): Promise<{ path: string; content: string; truncated: boolean; encoding: "utf8" | "binary" }>;
  create(path: string, type: "dir" | "file"): Promise<void>;
  move(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
};

const entry = (name: string, type: "dir" | "file" = "file"): ScriptedEntry => ({ name, type });

const listing = (path: string, ...entries: ScriptedEntry[]) => ({ path, parent: path === "" ? null : "", entries });

const basename = (path: string): string => path.split("/").pop() ?? path;
const dirname = (path: string): string => {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
};

type Serving = ScriptedPort & {
  readonly seen: string[];
  readonly creates: { path: string; type: "dir" | "file" }[];
  readonly moves: { from: string; to: string }[];
  readonly removes: string[];
  readonly peak: () => number;
  readonly release: () => void;
};

const serving = (byPath: Record<string, ScriptedEntry[]>, { hold = false } = {}): Serving => {
  const seen: string[] = [];
  const creates: { path: string; type: "dir" | "file" }[] = [];
  const moves: { from: string; to: string }[] = [];
  const removes: string[] = [];
  const waiting: (() => void)[] = [];
  let inFlight = 0;
  let peak = 0;

  return {
    seen,
    creates,
    moves,
    removes,
    peak: () => peak,
    release: () => {
      for (const resume of waiting.splice(0)) resume();
    },
    async list(path) {
      seen.push(path);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      try {
        if (hold) await new Promise<void>((resolve) => waiting.push(resolve));
        const entries = byPath[path];
        if (entries === undefined) throw new Error(`없는 디렉터리: ${path}`);
        return listing(path, ...entries);
      } finally {
        inFlight -= 1;
      }
    },
    async read() {
      throw new Error("이 테스트는 읽지 않는다");
    },
    async create(path, type) {
      creates.push({ path, type });
      const parent = dirname(path);
      byPath[parent] = [...(byPath[parent] ?? []), entry(basename(path), type)];
    },
    async move(from, to) {
      moves.push({ from, to });
      const fromParent = dirname(from);
      const name = basename(from);
      const type = byPath[fromParent]?.find((each) => each.name === name)?.type ?? "file";
      byPath[fromParent] = (byPath[fromParent] ?? []).filter((each) => each.name !== name);
      const toParent = dirname(to);
      byPath[toParent] = [...(byPath[toParent] ?? []), entry(basename(to), type)];
    },
    async remove(path) {
      removes.push(path);
      const parent = dirname(path);
      byPath[parent] = (byPath[parent] ?? []).filter((each) => each.name !== basename(path));
      delete byPath[path];
    },
  };
};

const model = (port: ScriptedPort): IDirectoryTreeModel => {
  return new DirectoryTreeModel({
    workspaceFiles: port as unknown as IWorkspaceFiles,
    workspaceWatch: { watch: () => () => undefined },
  });
};

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const drain = async (port: Serving): Promise<void> => {
  for (let previous = -1; previous !== port.seen.length;) {
    previous = port.seen.length;
    await tick();
  }
};

describe("load", () => {
  it("루트를 읽어 빈 문자열 키에 담는다", async () => {
    const port = serving({ "": [entry("projects", "dir"), entry("a.md")], projects: [] });
    const tree = model(port);

    await tree.load();

    expect(port.seen[0]).toBe("");
    expect(tree.directories[""]).toMatchObject({ status: "loaded", failure: null });
    expect(tree.directories[""]?.entries.map((e) => e.name)).toEqual(["projects", "a.md"]);
  });

  it("실패하면 이유를 담고 status 가 error 다", async () => {
    const tree = model(serving({}));

    await tree.load();

    expect(tree.directories[""]).toMatchObject({ status: "error", entries: [] });
    expect(tree.directories[""]?.failure).toMatch(/없는 디렉터리/u);
  });
});

describe("setExpanded", () => {
  it("처음 펼칠 때 그 디렉터리를 읽는다", async () => {
    const port = serving({ projects: [] });
    const tree = model(port);

    await tree.setExpanded("projects", true);

    expect(tree.expanded).toEqual(["projects"]);
    expect(port.seen).toEqual(["projects"]);
  });

  it("접을 때는 읽지 않는다", async () => {
    const port = serving({ "": [], projects: [] });
    const tree = model(port);
    await tree.setExpanded("projects", true);

    await tree.setExpanded("projects", false);

    expect(tree.expanded).toEqual([]);
    expect(port.seen).toEqual(["projects"]);
  });

  it("다시 펼쳐도 이미 읽었으면 또 읽지 않는다 — 여닫는 것만으로 요청이 쏟아지면 안 된다", async () => {
    const port = serving({ projects: [] });
    const tree = model(port);
    await tree.setExpanded("projects", true);
    await tree.setExpanded("projects", false);

    await tree.setExpanded("projects", true);

    expect(port.seen).toEqual(["projects"]);
  });

  it("읽기에 실패했으면 다시 펼칠 때 다시 시도한다", async () => {
    const port = serving({});
    const tree = model(port);
    await tree.setExpanded("projects", true);
    await tree.setExpanded("projects", false);

    await tree.setExpanded("projects", true);

    expect(port.seen).toEqual(["projects", "projects"]);
  });

  it("여럿을 펼치면 각각 따로 담긴다", async () => {
    const port = serving({ a: [entry("x")], b: [entry("y")] });
    const tree = model(port);

    await tree.setExpanded("a", true);
    await tree.setExpanded("b", true);

    expect(tree.expanded).toEqual(["a", "b"]);
    expect(tree.directories["a"]?.entries.map((e) => e.name)).toEqual(["x"]);
    expect(tree.directories["b"]?.entries.map((e) => e.name)).toEqual(["y"]);
  });

  it("같은 값을 여러 번 줘도 결과가 같다 — 클릭과 키보드가 겹쳐도 상쇄되지 않는다", async () => {
    const port = serving({ projects: [] });
    const tree = model(port);

    await tree.setExpanded("projects", true);
    await tree.setExpanded("projects", true);

    expect(tree.expanded).toEqual(["projects"]);
    expect(port.seen).toEqual(["projects"]);
  });

  it("접기도 여러 번 받아도 같다", async () => {
    const tree = model(serving({ projects: [] }));
    await tree.setExpanded("projects", true);

    await tree.setExpanded("projects", false);
    await tree.setExpanded("projects", false);

    expect(tree.expanded).toEqual([]);
  });
});

describe("중복 요청", () => {
  it("읽는 중에 다시 펼쳐도 요청은 한 번뿐이다", async () => {
    const port = serving({ projects: [] }, { hold: true });
    const tree = model(port);

    const first = tree.setExpanded("projects", true);
    const second = tree.setExpanded("projects", true);
    port.release();
    await Promise.all([first, second]);

    expect(port.seen).toEqual(["projects"]);
  });
});

describe("프리페치", () => {
  it("루트를 읽고 나면 그 하위 폴더들을 미리 읽는다", async () => {
    const port = serving({ "": [entry("a", "dir"), entry("b", "dir"), entry("c.md")], a: [], b: [] });
    const tree = model(port);

    await tree.load();
    await drain(port);

    expect(port.seen).toEqual(["", "a", "b"]);
    expect(tree.directories["a"]?.status).toBe("loaded");
  });

  it("파일은 미리 읽지 않는다 — 폴더만 펼칠 수 있다", async () => {
    const port = serving({ "": [entry("a.md"), entry("b.md")] });
    const tree = model(port);

    await tree.load();
    await drain(port);

    expect(port.seen).toEqual([""]);
  });

  it("미리 읽어 둔 폴더는 펼칠 때 요청이 나가지 않는다 — 이게 프리페치의 목적이다", async () => {
    const port = serving({ "": [entry("a", "dir")], a: [] });
    const tree = model(port);
    await tree.load();
    await drain(port);
    const before = port.seen.length;

    await tree.setExpanded("a", true);

    expect(port.seen.length).toBe(before);
    expect(tree.directories["a"]?.status).toBe("loaded");
  });

  it("펼친 폴더의 하위도 미리 읽는다 — 한 걸음씩 앞선다", async () => {
    const port = serving({ "": [], a: [entry("b", "dir")], "a/b": [] });
    const tree = model(port);

    await tree.setExpanded("a", true);
    await drain(port);

    expect(port.seen).toContain("a/b");
  });

  it("미리 읽은 것이 또 미리 읽지는 않는다 — 트리 아래로 끝없이 번지면 안 된다", async () => {
    const port = serving({
      "": [entry("a", "dir")],
      a: [entry("b", "dir")],
      "a/b": [entry("c", "dir")],
      "a/b/c": [],
    });
    const tree = model(port);

    await tree.load();
    await drain(port);

    expect(port.seen).toEqual(["", "a"]);
  });

  it("한 번에 24개까지만 — 수백 개짜리 폴더에서 요청이 쏟아지면 안 된다", async () => {
    const many = Array.from({ length: 40 }, (_, index) => entry(`d${String(index).padStart(2, "0")}`, "dir"));
    const port = serving({ "": many, ...Object.fromEntries(many.map((each) => [each.name, []])) });
    const tree = model(port);

    await tree.load();
    await drain(port);

    expect(port.seen.length).toBe(1 + 24);
  });

  it("동시에 3개까지만 나간다 — 터널을 배경 작업이 독점하면 안 된다", async () => {
    const many = Array.from({ length: 10 }, (_, index) => entry(`d${String(index)}`, "dir"));
    const port = serving({ "": many, ...Object.fromEntries(many.map((each) => [each.name, []])) }, { hold: true });
    const tree = model(port);

    const loading = tree.load();
    port.release();
    await loading;
    await tick();
    port.release();
    await drain(port);

    expect(port.peak()).toBeLessThanOrEqual(3);
  });

  it("새로 펼치면 이전 배치는 멈춘다 — 딴 데로 간 사용자를 위해 일하지 않는다", async () => {
    const many = Array.from({ length: 20 }, (_, index) => entry(`d${String(index).padStart(2, "0")}`, "dir"));
    const port = serving(
      { "": many, ...Object.fromEntries(many.map((each) => [each.name, []])), other: [] },
      { hold: true },
    );
    const tree = model(port);

    const loading = tree.load();
    port.release();
    await loading;
    await tick();

    const expanding = tree.setExpanded("other", true);
    port.release();
    await expanding;
    await drain(port);
    port.release();
    await drain(port);

    expect(port.seen).toContain("other");
    expect(port.seen.length).toBeLessThan(1 + 20 + 1);
  });
});

describe("setSelection", () => {
  it("선택 집합을 기억한다", () => {
    const tree = model(serving({}));

    tree.setSelection(["a.md", "b.md"]);

    expect(tree.selected).toEqual(["a.md", "b.md"]);
  });
});

describe("createEntry / renameEntry / removeEntry", () => {
  it("만들고 나면 부모를 다시 읽어 새 항목이 보인다", async () => {
    const port = serving({ "": [] });
    const tree = model(port);
    await tree.load();

    await tree.createEntry("", "new.txt", "file");

    expect(port.creates).toEqual([{ path: "new.txt", type: "file" }]);
    expect(tree.directories[""]?.entries.map((e) => e.name)).toEqual(["new.txt"]);
  });

  it("디렉터리도 만들 수 있다", async () => {
    const port = serving({ "": [] });
    const tree = model(port);
    await tree.load();

    await tree.createEntry("", "sub", "dir");

    expect(tree.directories[""]?.entries).toEqual([{ name: "sub", type: "dir" }]);
  });

  it("한 번도 펼치지 않은 디렉터리 안에 만들어도 그 디렉터리를 새로 읽지 않는다", async () => {
    const port = serving({ "": [] });
    const tree = model(port);

    await tree.createEntry("sub", "new.txt", "file");

    expect(port.seen).not.toContain("sub");
  });

  it("이름을 바꾸면 부모를 다시 읽어 새 이름이 보인다", async () => {
    const port = serving({ "": [entry("old.txt")] });
    const tree = model(port);
    await tree.load();

    await tree.renameEntry("old.txt", "new.txt");

    expect(port.moves).toEqual([{ from: "old.txt", to: "new.txt" }]);
    expect(tree.directories[""]?.entries.map((e) => e.name)).toEqual(["new.txt"]);
  });

  it("지우면 부모를 다시 읽어 목록에서 사라진다", async () => {
    const port = serving({ "": [entry("gone.txt")] });
    const tree = model(port);
    await tree.load();

    await tree.removeEntry("gone.txt");

    expect(port.removes).toEqual(["gone.txt"]);
    expect(tree.directories[""]?.entries.map((e) => e.name)).toEqual([]);
  });

  it("지운 경로(폴더면 그 후손까지)를 선택에서 걷어낸다", async () => {
    const port = serving({ "": [entry("folder", "dir"), entry("kept.txt")], folder: [entry("inner.txt")] });
    const tree = model(port);
    await tree.load();
    await tree.setExpanded("folder", true);
    tree.setSelection(["folder", "folder/inner.txt", "kept.txt"]);

    await tree.removeEntry("folder");

    expect(tree.selected).toEqual(["kept.txt"]);
  });

  it("깊은 경로도 알맞은 부모를 다시 읽는다", async () => {
    const port = serving({ "": [entry("projects", "dir")], projects: [entry("old.txt")] });
    const tree = model(port);
    await tree.load();
    await tree.setExpanded("projects", true);

    await tree.renameEntry("projects/old.txt", "new.txt");

    expect(port.moves).toEqual([{ from: "projects/old.txt", to: "projects/new.txt" }]);
    expect(tree.directories["projects"]?.entries.map((e) => e.name)).toEqual(["new.txt"]);
  });
});

describe("moveToFolder", () => {
  it("다른 폴더로 옮기면 이름은 그대로, 옛 부모·새 부모 둘 다 다시 읽는다", async () => {
    const port = serving({ "": [entry("a.md"), entry("projects", "dir")], projects: [] });
    const tree = model(port);
    await tree.load();
    await tree.setExpanded("projects", true);

    const to = await tree.moveToFolder("a.md", "projects");

    expect(to).toBe("projects/a.md");
    expect(port.moves).toEqual([{ from: "a.md", to: "projects/a.md" }]);
    expect(tree.directories[""]?.entries.map((e) => e.name)).toEqual(["projects"]);
    expect(tree.directories["projects"]?.entries.map((e) => e.name)).toEqual(["a.md"]);
  });

  it('같은 부모 안으로 "옮기면" 한 번만 다시 읽는다', async () => {
    const port = serving({ "": [entry("a.md"), entry("b.md")] });
    const tree = model(port);
    await tree.load();
    const before = port.seen.length;

    await tree.moveToFolder("a.md", "");

    expect(port.seen.length).toBe(before + 1);
  });

  it("어느 쪽도 펼친 적 없으면 둘 다 다시 읽지 않는다 — #refresh 의 계약을 그대로 물려받는다", async () => {
    const port = serving({ "": [entry("a.md"), entry("projects", "dir")], projects: [] });
    const tree = model(port);

    await tree.moveToFolder("a.md", "projects");

    expect(port.moves).toEqual([{ from: "a.md", to: "projects/a.md" }]);
    expect(port.seen).toEqual([]);
  });
});

describe("watch", () => {
  const watchPort = () => {
    const calls: (readonly string[])[] = [];
    let unsubscribeCount = 0;
    let latestOnChange: ((changed: readonly string[]) => void) | undefined;
    return {
      calls,
      unsubscribeCount: () => unsubscribeCount,
      trigger: (changed: readonly string[]) => latestOnChange?.(changed),
      watch(paths: readonly string[], onChange: (changed: readonly string[]) => void) {
        calls.push(paths);
        latestOnChange = onChange;
        return () => {
          unsubscribeCount += 1;
        };
      },
    };
  };

  const modelWithWatch = (port: ScriptedPort, watch: ReturnType<typeof watchPort>): IDirectoryTreeModel => {
    return new DirectoryTreeModel({ workspaceFiles: port as unknown as IWorkspaceFiles, workspaceWatch: watch });
  };

  it("startWatching 을 부르면 지금 펼친 디렉터리(+루트)를 구독한다", async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const tree = modelWithWatch(serving({ "": [] }), watch);

    tree.startWatching();
    await tree.load();
    await vi.advanceTimersByTimeAsync(400);

    expect(watch.calls).toEqual([[""]]);
    vi.useRealTimers();
  });

  it("펼침이 바뀌면 재구독한다 — 예전 구독은 해지된다", async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const tree = modelWithWatch(serving({ "": [entry("a", "dir")], a: [] }), watch);

    tree.startWatching();
    await tree.load();
    await vi.advanceTimersByTimeAsync(400);

    await tree.setExpanded("a", true);
    await vi.advanceTimersByTimeAsync(400);

    expect(watch.calls).toEqual([[""], ["", "a"]]);
    expect(watch.unsubscribeCount()).toBe(1);
    vi.useRealTimers();
  });

  it("감시 중 바뀐 경로 알림이 오면 그 디렉터리를 다시 읽는다", async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const port = serving({ "": [] });
    const tree = modelWithWatch(port, watch);
    tree.startWatching();
    await tree.load();
    await vi.advanceTimersByTimeAsync(400);
    const before = port.seen.length;

    watch.trigger([""]);
    await vi.advanceTimersByTimeAsync(0);

    expect(port.seen.length).toBe(before + 1);
    vi.useRealTimers();
  });

  it("한 번도 펼친 적 없는 디렉터리로 알림이 와도 다시 읽지 않는다 — #refresh 의 계약을 물려받는다", async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const port = serving({ "": [] });
    const tree = modelWithWatch(port, watch);
    tree.startWatching();
    await tree.load();
    await vi.advanceTimersByTimeAsync(400);

    watch.trigger(["never-loaded"]);
    await vi.advanceTimersByTimeAsync(0);

    expect(port.seen).not.toContain("never-loaded");
    vi.useRealTimers();
  });

  it("stopWatching 하면 구독을 해지하고, 다시 부르기 전까지 재구독하지 않는다", async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const tree = modelWithWatch(serving({ "": [], a: [] }), watch);
    tree.startWatching();
    await tree.load();
    await vi.advanceTimersByTimeAsync(400);

    tree.stopWatching();
    await tree.setExpanded("a", true);
    await vi.advanceTimersByTimeAsync(400);

    expect(watch.unsubscribeCount()).toBe(1);
    expect(watch.calls.length).toBe(1);
    vi.useRealTimers();
  });
});
