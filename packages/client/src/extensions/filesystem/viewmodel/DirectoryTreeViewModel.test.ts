import type { IWorkspaceFiles } from "../model/IWorkspaceFiles";
import { CommandService, type ICommandService } from "#core/commands";
import { DirectoryTreeModel } from "../model/DirectoryTreeModel";
import { DirectoryTreeViewModel } from "./DirectoryTreeViewModel";
import type { IDirectoryTreeViewModel } from "./IDirectoryTreeViewModel";

/** 커맨드 등록만 받아주는 흉내 — 이 파일의 관심사는 트리 접기 로직이지 커맨드 배선 자체가
 *  아니다. */
const fakeCommandCenterRegistry = (): ICommandService =>
  new CommandService({ overridesStore: { load: () => ({}), save: () => undefined }, reportError: () => undefined });

/**
 * 검사하는 것은 **평평한 표를 중첩 트리로 접는 규칙**이다.
 *
 * Model 은 진짜를 그대로 쓴다 — I/O 가 Port 뒤에 있어서 대신할 이유가 없다. Port 만 대본으로 둔다.
 */

type ScriptedEntry = { name: string; type: "dir" | "file" };

const entry = (name: string, type: "dir" | "file" = "file"): ScriptedEntry => ({ name, type });

const basename = (path: string): string => path.split("/").pop() ?? path;
const dirname = (path: string): string => {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
};

const serving = (byPath: Record<string, ScriptedEntry[]>, { failCreate = false } = {}) => ({
  async list(path: string) {
    const entries = byPath[path];
    if (entries === undefined) throw new Error(`없는 디렉터리: ${path}`);
    return { path, parent: path === "" ? null : "", entries };
  },
  async read() {
    throw new Error("이 테스트는 읽지 않는다");
  },
  async create(path: string, type: "dir" | "file") {
    if (failCreate) throw new Error("이미 있다");
    const parent = dirname(path);
    byPath[parent] = [...(byPath[parent] ?? []), entry(basename(path), type)];
  },
  async move(from: string, to: string) {
    const fromParent = dirname(from);
    const name = basename(from);
    const type = byPath[fromParent]?.find((each) => each.name === name)?.type ?? "file";
    byPath[fromParent] = (byPath[fromParent] ?? []).filter((each) => each.name !== name);
    const toParent = dirname(to);
    byPath[toParent] = [...(byPath[toParent] ?? []), entry(basename(to), type)];
  },
  async remove(path: string) {
    const parent = dirname(path);
    byPath[parent] = (byPath[parent] ?? []).filter((each) => each.name !== basename(path));
    delete byPath[path];
  },
});

const viewModel = (
  byPath: Record<string, ScriptedEntry[]>,
  options: { failCreate?: boolean } = {},
): IDirectoryTreeViewModel => {
  const directoryTreeModel = new DirectoryTreeModel({
    workspaceFiles: serving(byPath, options) as unknown as IWorkspaceFiles,
    // 감시는 이 파일의 관심사가 아니다 — 구독하지 않는 대본으로 대신한다.
    workspaceWatch: { watch: () => () => undefined },
  });
  return new DirectoryTreeViewModel({
    directoryTreeModel,
    commandCenterRegistry: fakeCommandCenterRegistry(),
    copyToClipboard: () => undefined,
    isTypingSurface: () => false,
  });
};

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("rows", () => {
  it("루트를 읽기 전에는 비어 있다", () => {
    expect(viewModel({ "": [] }).rows).toEqual([]);
  });

  it("경로를 id 로 쓴다 — 루트 바로 아래는 이름 그대로다", async () => {
    const tree = viewModel({ "": [entry("a.md"), entry("projects", "dir")] });
    tree.start();
    await settled();

    expect(tree.rows.map((row) => ({ id: row.id, type: row.type }))).toEqual([
      { id: "a.md", type: "file" },
      { id: "projects", type: "folder" },
    ]);
  });

  it("Model 의 dir 을 화면 어휘 folder 로 바꾼다", async () => {
    const tree = viewModel({ "": [entry("projects", "dir")] });
    tree.start();
    await settled();

    expect(tree.rows[0]?.type).toBe("folder");
  });

  it("펼치면 자식 경로가 부모/이름으로 이어진다", async () => {
    const tree = viewModel({ "": [entry("projects", "dir")], projects: [entry("dev-kit", "dir")] });
    tree.start();
    await settled();

    tree.setFolderExpanded("projects", true);
    await settled();

    expect(tree.rows[0]?.children?.[0]).toMatchObject({ id: "projects/dev-kit", name: "dev-kit" });
  });

  it("두 단계 아래까지 이어 붙인다", async () => {
    const tree = viewModel({
      "": [entry("a", "dir")],
      a: [entry("b", "dir")],
      "a/b": [entry("c.md")],
    });
    tree.start();
    await settled();
    tree.setFolderExpanded("a", true);
    await settled();

    tree.setFolderExpanded("a/b", true);
    await settled();

    expect(tree.rows[0]?.children?.[0]?.children?.[0]?.id).toBe("a/b/c.md");
  });
});

describe("자리 표시 — 화살표는 type만으로 산다", () => {
  /**
   * `FileTree`는 `type==='folder'`면 자식 유무와 무관하게 항상 화살표를 그린다(2026-09, C1)
   * — 예전처럼 자리 표시 자식을 끼워 넣지 않아도 화살표가 살아 있다.
   */
  it("아직 안 읽은 폴더는 자식 없이 둔다 — 화살표는 그래도 산다", async () => {
    const many = Array.from({ length: 30 }, (_, index) => entry(`d${String(index).padStart(2, "0")}`, "dir"));
    const tree = viewModel({ "": many, ...Object.fromEntries(many.map((each) => [each.name, []])) });
    tree.start();
    for (let i = 0; i < 40; i += 1) await settled();

    const last = tree.rows[29];
    expect(last?.children).toEqual([]);
  });

  it("펼쳤는데 비어 있으면 행 자체를 두지 않는다(VSCode와 동일)", async () => {
    const tree = viewModel({ "": [entry("empty", "dir")], empty: [] });
    tree.start();
    await settled();
    tree.setFolderExpanded("empty", true);
    await settled();

    expect(tree.rows[0]?.children).toEqual([]);
  });

  it("읽지 못한 폴더는 그 이유를 자리에 보여준다", async () => {
    const tree = viewModel({ "": [entry("nope", "dir")] });
    tree.start();
    await settled();
    tree.setFolderExpanded("nope", true);
    await settled();

    expect(tree.rows[0]?.children?.[0]?.name).toMatch(/없는 디렉터리/u);
  });
});

/**
 * **비어 있는 것과 읽는 중인 것은 다르다.**
 *
 * 예전에는 "행이 없으면 읽는 중" 이라고 화면이 제 마음대로 적어서, 워크스페이스가 정말 비어
 * 있으면 "읽는 중…" 이 영원히 남았다. 상태는 Model 에 이미 있었고 ViewModel 이 안 내보냈을 뿐이다.
 */
describe("status — 화면이 로딩과 빈 상태를 가르는 근거", () => {
  it("시작 전에는 idle 이다", () => {
    expect(viewModel({ "": [] }).status).toBe("idle");
  });

  it("읽는 동안은 loading 이다", () => {
    const tree = viewModel({ "": [] });

    tree.start();

    expect(tree.status).toBe("loading");
  });

  it('다 읽으면 비어 있어도 loaded 다 — 여기서 화면이 "비어 있다"로 갈린다', async () => {
    const tree = viewModel({ "": [] });
    tree.start();
    await settled();

    expect(tree.status).toBe("loaded");
    expect(tree.rows).toEqual([]);
  });

  it("실패하면 error 다", async () => {
    const tree = viewModel({});
    tree.start();
    await settled();

    expect(tree.status).toBe("error");
  });
});

/**
 * 읽는 중인 폴더는 **자기 행이** 돈다 — 자식 자리에 "읽는 중…" 이라는 가짜 파일을 만들지 않는다.
 *
 * 프리페치가 닿지 않는 폴더(앞 24개 밖)로 본다. 미리 읽어 둔 폴더는 펼쳐도 기다림이 없어서
 * 이 상태를 아예 지나가지 않는다 — 그게 프리페치의 목적이다.
 */
describe("폴더 행의 loading", () => {
  const many = Array.from({ length: 30 }, (_, index) => entry(`d${String(index).padStart(2, "0")}`, "dir"));
  const deep = { "": many, ...Object.fromEntries(many.map((each) => [each.name, [entry("a.md")]])) };
  const settledDeep = async (): Promise<void> => {
    for (let i = 0; i < 40; i += 1) await settled();
  };

  it("읽는 중인 폴더 행에 loading 이 선다", async () => {
    const tree = viewModel(deep);
    tree.start();
    await settledDeep();

    tree.setFolderExpanded("d29", true);

    expect(tree.rows[29]).toMatchObject({ id: "d29", loading: true });
    // 자식 자리에는 "읽는 중…" 이라는 파일 행이 없다.
    expect(tree.rows[29]?.children?.map((child) => child.name)).not.toContain("읽는 중…");
  });

  it("다 읽으면 내려간다", async () => {
    const tree = viewModel(deep);
    tree.start();
    await settledDeep();
    tree.setFolderExpanded("d29", true);
    await settledDeep();

    expect(tree.rows[29]).toMatchObject({ loading: false });
    expect(tree.rows[29]?.children?.map((child) => child.name)).toEqual(["a.md"]);
  });

  /**
   * **프리페치는 화면에 티가 나지 않아야 한다.** 배경에서 읽는 폴더까지 돌면, 루트를 연 직후
   * 폴더 24개가 한꺼번에 돌아 앱이 버벅이는 것처럼 보인다.
   */
  it("미리 읽는 중인 폴더는 돌지 않는다 — 펼친 것만 돈다", async () => {
    const tree = viewModel(deep);

    tree.start();
    await settled();

    // 이 순간 프리페치가 한창인데(앞 24개), 사용자가 펼친 것은 하나도 없다.
    expect(tree.rows.filter((row) => row.loading === true)).toEqual([]);
  });

  it("펼친 채로 읽는 중이면 아래를 비워 둔다 — 도는 행 밑에 자리 표시까지 두면 군더더기다", async () => {
    const tree = viewModel(deep);
    tree.start();
    await settledDeep();

    tree.setFolderExpanded("d29", true);

    expect(tree.rows[29]?.children).toEqual([]);
  });
});

describe("선택과 실패", () => {
  it("선택이 없으면 빈 배열이다", () => {
    expect(viewModel({ "": [] }).selectedIds).toEqual([]);
  });

  it("선택한 경로들을 그대로 낸다", async () => {
    const tree = viewModel({ "": [entry("a.md"), entry("b.md")] });

    tree.setSelection(["a.md", "b.md"]);

    expect(tree.selectedIds).toEqual(["a.md", "b.md"]);
  });

  it("루트를 읽지 못하면 이유를 낸다", async () => {
    const tree = viewModel({});
    tree.start();
    await settled();

    expect(tree.failure).toMatch(/없는 디렉터리/u);
  });

  it("루트를 읽었으면 실패는 없다", async () => {
    const tree = viewModel({ "": [] });
    tree.start();
    await settled();

    expect(tree.failure).toBeNull();
  });
});

/**
 * 화면 어휘(`'folder'`)를 Model 어휘(`'dir'`)로 바꾸는지, 그리고 성공하면 트리에 실제로 반영
 * 되는지를 본다. 실패를 삼키지 않는지도 — `binding.tsx` 가 `.catch` 로 사람에게 보여주려면
 * ViewModel 이 거절을 던져야 한다.
 */
describe("createEntry / renameEntry / removeEntry", () => {
  it("folder 를 만들면 Model 에는 dir 로 전해지고 트리에도 반영된다", async () => {
    const tree = viewModel({ "": [] });
    tree.start();
    await settled();

    await tree.createEntry("", "sub", "folder");

    // 새로 만든 폴더의 **안**은 아직 읽지 않았다 — createEntry 는 만든 대상의 부모만 다시 읽는다.
    // 화살표는 `type==='folder'`면 자식 유무와 무관하게 뜬다(2026-09, C1) — 자리 표시가 필요 없다.
    expect(tree.rows).toEqual([{ id: "sub", name: "sub", type: "folder", loading: false, children: [] }]);
  });

  it("file 을 만들면 트리에 파일로 반영된다", async () => {
    const tree = viewModel({ "": [] });
    tree.start();
    await settled();

    await tree.createEntry("", "a.md", "file");

    expect(tree.rows).toEqual([{ id: "a.md", name: "a.md", type: "file" }]);
  });

  it("이름을 바꾸면 트리에도 새 이름이 보인다", async () => {
    const tree = viewModel({ "": [entry("old.txt")] });
    tree.start();
    await settled();

    await tree.renameEntry("old.txt", "new.txt");

    expect(tree.rows.map((row) => row.id)).toEqual(["new.txt"]);
  });

  it("지우면 트리에서 사라진다", async () => {
    const tree = viewModel({ "": [entry("gone.txt")] });
    tree.start();
    await settled();

    await tree.removeEntry("gone.txt");

    expect(tree.rows).toEqual([]);
  });

  it("실패를 삼키지 않는다 — binding 이 사용자에게 보여주려면 던져야 한다", async () => {
    const tree = viewModel({ "": [] }, { failCreate: true });
    tree.start();
    await settled();

    await expect(tree.createEntry("", "a.md", "file")).rejects.toThrow(/이미 있다/u);
  });

  it("moveEntry 는 Model 에 위임하고 옮긴 뒤의 경로를 돌려준다", async () => {
    const tree = viewModel({ "": [entry("a.md"), entry("projects", "dir")], projects: [] });
    tree.start();
    await settled();
    tree.setFolderExpanded("projects", true);
    await settled();

    const to = await tree.moveEntry("a.md", "projects");

    expect(to).toBe("projects/a.md");
    expect(tree.rows.find((row) => row.id === "projects")?.children?.map((c) => c.id)).toEqual(["projects/a.md"]);
  });

  it("removeEntries는 후손을 걸러내고 나머지만 지운다", async () => {
    const tree = viewModel({ "": [entry("folder", "dir"), entry("kept.txt")], folder: [entry("inner.txt")] });
    tree.start();
    await settled();
    tree.setFolderExpanded("folder", true);
    await settled();

    // 폴더 자신과 그 자식을 같이 선택해서 지운다 — 자식은 후손이라 걸러지고, 폴더만 실제로 지워진다.
    await tree.removeEntries(["folder", "folder/inner.txt", "kept.txt"]);

    expect(tree.rows.map((row) => row.id)).toEqual([]);
  });
});

describe("컨텍스트 메뉴 대상 — contextTarget/contextTargets", () => {
  it("우클릭 대상이 없으면 빈 배열이다", () => {
    expect(viewModel({ "": [] }).contextTargets).toEqual([]);
  });

  it("선택 밖의 행을 우클릭하면 그 행 하나다", async () => {
    const tree = viewModel({ "": [entry("a.md"), entry("b.md")] });
    tree.start();
    await settled();
    tree.setSelection(["b.md"]);

    tree.setContextTarget({ id: "a.md", name: "a.md", type: "file" });

    expect(tree.contextTargets).toEqual([{ id: "a.md", name: "a.md", type: "file" }]);
  });

  it("선택 안의 행을 우클릭하면 선택 전체다", async () => {
    const tree = viewModel({ "": [entry("a.md"), entry("b.md")] });
    tree.start();
    await settled();
    tree.setSelection(["a.md", "b.md"]);

    tree.setContextTarget({ id: "a.md", name: "a.md", type: "file" });

    expect(tree.contextTargets.map((target) => target.id)).toEqual(["a.md", "b.md"]);
  });

  it("null로 지우면 다시 빈 배열이다", () => {
    const tree = viewModel({ "": [] });
    tree.setContextTarget({ id: "a.md", name: "a.md", type: "file" });

    tree.setContextTarget(null);

    expect(tree.contextTargets).toEqual([]);
  });
});

describe("이름 입력 흐름 — requestNewFile/requestNewFolder/requestRename/onEditCommit", () => {
  it("빈 곳(대상 없음)에서 새 파일은 루트에 유령 행을 끼워 넣고, 확정하면 루트에 만든다", async () => {
    const tree = viewModel({ "": [] });
    tree.start();
    await settled();

    tree.requestNewFile();
    expect(tree.editingId).toBeDefined();
    expect(tree.rows.map((row) => row.id)).toEqual([tree.editingId]);

    tree.onEditCommit("a.md");
    await settled();

    expect(tree.editingId).toBeUndefined();
    expect(tree.rows.map((row) => row.id)).toEqual(["a.md"]);
  });

  it("폴더를 우클릭하고 새 폴더를 만들면 그 폴더 안에 유령 행이 생기고, 확정하면 그 폴더 안에 만든다", async () => {
    const tree = viewModel({ "": [entry("projects", "dir")], projects: [] });
    tree.start();
    await settled();
    tree.setContextTarget({ id: "projects", name: "projects", type: "folder" });

    tree.requestNewFolder();
    await settled();
    expect(tree.rows.find((row) => row.id === "projects")?.children?.map((child) => child.id)).toEqual([
      tree.editingId,
    ]);

    tree.onEditCommit("sub");
    await settled();

    expect(tree.rows.find((row) => row.id === "projects")?.children?.map((child) => child.id)).toEqual([
      "projects/sub",
    ]);
  });

  it("파일을 우클릭하고 새 파일을 만들면 그 파일의 부모(루트) 안에 유령 행이 생긴다", async () => {
    const tree = viewModel({ "": [entry("projects", "dir"), entry("a.md")], projects: [] });
    tree.start();
    await settled();
    tree.setContextTarget({ id: "a.md", name: "a.md", type: "file" });

    tree.requestNewFile();

    expect(tree.rows.map((row) => row.id)).toContain(tree.editingId);
  });

  it("이름변경은 contextTarget의 id를 그대로 editingId로 연다", () => {
    const tree = viewModel({ "": [entry("old.txt")] });
    tree.setContextTarget({ id: "old.txt", name: "old.txt", type: "file" });

    tree.requestRename();

    expect(tree.editingId).toBe("old.txt");
  });

  it("contextTarget이 없으면 이름변경 요청은 아무 일도 하지 않는다", () => {
    const tree = viewModel({ "": [] });

    tree.requestRename();

    expect(tree.editingId).toBeUndefined();
  });

  it("빈 값으로 확정하면 아무 것도 만들지 않는다", async () => {
    const tree = viewModel({ "": [] });
    tree.start();
    await settled();
    tree.requestNewFile();

    tree.onEditCommit("   ");
    await settled();

    expect(tree.rows).toEqual([]);
  });

  it("이름을 바꾸지 않고(같은 값으로) 확정하면 renameEntry를 부르지 않는다", async () => {
    const tree = viewModel({ "": [entry("same.txt")] });
    tree.start();
    await settled();
    tree.setContextTarget({ id: "same.txt", name: "same.txt", type: "file" });
    tree.requestRename();

    tree.onEditCommit("same.txt");
    await settled();

    expect(tree.rows.map((row) => row.name)).toEqual(["same.txt"]);
  });

  it("onEditCancel은 확정 없이 닫는다 — 유령 행은 사라진다", () => {
    const tree = viewModel({ "": [] });
    tree.requestNewFile();

    tree.onEditCancel();

    expect(tree.editingId).toBeUndefined();
    expect(tree.rows).toEqual([]);
  });

  it("만들기가 실패하면 failureNotice에 담긴다(던지지 않는다)", async () => {
    const tree = viewModel({ "": [] }, { failCreate: true });
    tree.start();
    await settled();
    tree.requestNewFile();

    tree.onEditCommit("a.md");
    await settled();

    expect(tree.failureNotice).toMatch(/만들지 못했다/u);
  });
});

describe("삭제 확인 흐름 — requestDelete/confirmDelete/cancelDelete", () => {
  it("contextTargets를 그대로 deleteTargets로 옮긴다", async () => {
    const tree = viewModel({ "": [entry("a.md")] });
    tree.start();
    await settled();
    tree.setContextTarget({ id: "a.md", name: "a.md", type: "file" });

    tree.requestDelete();

    expect(tree.deleteTargets).toEqual([{ id: "a.md", name: "a.md", type: "file" }]);
  });

  it("confirmDelete는 대상을 지우고 목록을 비운다", async () => {
    const tree = viewModel({ "": [entry("a.md")] });
    tree.start();
    await settled();
    tree.setContextTarget({ id: "a.md", name: "a.md", type: "file" });
    tree.requestDelete();

    tree.confirmDelete();
    await settled();

    expect(tree.deleteTargets).toEqual([]);
    expect(tree.rows).toEqual([]);
  });

  it("cancelDelete는 지우지 않고 목록만 비운다", async () => {
    const tree = viewModel({ "": [entry("a.md")] });
    tree.start();
    await settled();
    tree.setContextTarget({ id: "a.md", name: "a.md", type: "file" });
    tree.requestDelete();

    tree.cancelDelete();
    await settled();

    expect(tree.deleteTargets).toEqual([]);
    expect(tree.rows.map((row) => row.id)).toEqual(["a.md"]);
  });
});

describe("failureNotice — dismissFailureNotice", () => {
  it("지우면 null이 된다", async () => {
    const tree = viewModel({ "": [] }, { failCreate: true });
    tree.start();
    await settled();
    tree.requestNewFile();
    tree.onEditCommit("a.md");
    await settled();
    expect(tree.failureNotice).not.toBeNull();

    tree.dismissFailureNotice();

    expect(tree.failureNotice).toBeNull();
  });
});

describe("findRow", () => {
  it("중첩된 자식도 id로 찾는다", async () => {
    const tree = viewModel({ "": [entry("projects", "dir")], projects: [entry("a.md")] });
    tree.start();
    await settled();
    tree.setFolderExpanded("projects", true);
    await settled();

    expect(tree.findRow("projects/a.md")?.name).toBe("a.md");
  });

  it("없는 id면 undefined다", () => {
    const tree = viewModel({ "": [] });

    expect(tree.findRow("nope")).toBeUndefined();
  });
});
