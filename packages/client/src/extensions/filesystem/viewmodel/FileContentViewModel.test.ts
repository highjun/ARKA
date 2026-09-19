import { URI } from "#contracts";
import { CommandService } from "#core/commands";
import type { IWorkspaceFiles } from "../model/IWorkspaceFiles";
import { FileContentModel } from "../model/FileContentModel";
import { FileContentViewModel } from "./FileContentViewModel";
import type { IFileContentViewModel } from "./IFileContentViewModel";

/**
 * 검사하는 것은 **상태를 안내 한 줄 + 편집 가능 플래그로 접는 규칙**이다.
 *
 * 읽는 중·바이너리·잘림·실패가 각각 어떤 문장이 되는지, 평범한 경우에만 안내가 사라지는지, 그리고
 * **읽기 전용을 여는 조건이 딱 "다 읽혔고 잘리지 않았고 텍스트인 파일"뿐인지**.
 */

type Reply = { path: string; content: string; truncated: boolean; encoding: "utf8" | "binary" };

const serving = (byPath: Record<string, Reply>, options: { writeFails?: string } = {}) => ({
  async list() {
    throw new Error("이 테스트는 목록을 보지 않는다");
  },
  async read(path: string) {
    const reply = byPath[path];
    if (reply === undefined) throw new Error(`없는 파일: ${path}`);
    return reply;
  },
  async write() {
    if (options.writeFails !== undefined) throw new Error(options.writeFails);
  },
});

const text = (content: string, extra: Partial<Reply> = {}): Reply => ({
  path: "a.md",
  content,
  truncated: false,
  encoding: "utf8",
  ...extra,
});

const make = (
  byPath: Record<string, Reply>,
  options: { writeFails?: string } = {},
): { files: IFileContentViewModel; model: FileContentModel; commands: CommandService } => {
  const model = new FileContentModel({
    workspaceFiles: serving(byPath, options) as unknown as IWorkspaceFiles,
    // 감시는 이 파일의 관심사가 아니다 — 구독하지 않는 대본으로 대신한다.
    workspaceWatch: { watch: () => () => undefined },
  });
  const commands = new CommandService({
    overridesStore: { load: () => ({}), save: () => undefined },
    reportError: () => undefined,
  });
  return {
    files: new FileContentViewModel({ fileContentModel: model, commandCenterRegistry: commands }),
    model,
    commands,
  };
};

const viewModel = (byPath: Record<string, Reply>, options: { writeFails?: string } = {}): IFileContentViewModel =>
  make(byPath, options).files;

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const loaded = (content: string) => ({
  content,
  notice: null,
  readOnly: false,
  isDirty: false,
  isSaving: false,
  loading: false,
});

describe("openFile", () => {
  it("평범하게 읽히면 안내가 없고 편집이 열린다", async () => {
    const files = viewModel({ "a.md": text("# hi\n") });

    void files.openFile("a.md");
    await settled();

    expect(files.rows["a.md"]).toEqual(loaded("# hi\n"));
  });

  it("읽는 동안에는 loading 플래그를 세우고 편집을 막는다 — 안내 문구는 없다", () => {
    const files = viewModel({ "a.md": text("x") });

    void files.openFile("a.md");

    expect(files.rows["a.md"]).toEqual({
      content: "",
      notice: null,
      readOnly: true,
      isDirty: false,
      isSaving: false,
      loading: true,
    });
  });

  it("열지 않은 파일은 아예 없다", () => {
    expect(viewModel({}).rows["a.md"]).toBeUndefined();
  });

  it("여러 파일을 따로 담는다", async () => {
    const files = viewModel({ "a.md": text("A"), "b.md": { ...text("B"), path: "b.md" } });

    void files.openFile("a.md");
    void files.openFile("b.md");
    await settled();

    expect(files.rows["a.md"]?.content).toBe("A");
    expect(files.rows["b.md"]?.content).toBe("B");
  });
});

describe("안내 문장과 편집 가능 여부", () => {
  // `openFile`은 바이너리를 닫아 버리므로 Model로 직접 연다 — 여기서 보는 것은 행으로 접는 규칙이다.
  it("바이너리는 본문 없이 이유만 주고 편집을 막는다", async () => {
    const { files, model } = make({ "x.png": { ...text(""), path: "x.png", encoding: "binary" } });

    void model.open("x.png");
    await settled();

    expect(files.rows["x.png"]).toEqual({
      content: "",
      notice: "텍스트가 아니라 보여줄 수 없다.",
      readOnly: true,
      isDirty: false,
      isSaving: false,
      loading: false,
    });
  });

  it("잘린 파일은 본문을 주면서 알리고, 편집은 막는다 — 다시 쓰면 뒷부분이 사라진다", async () => {
    const files = viewModel({ "big.txt": { ...text("앞부분"), path: "big.txt", truncated: true } });

    void files.openFile("big.txt");
    await settled();

    expect(files.rows["big.txt"]).toEqual({
      content: "앞부분",
      notice: "파일이 커서 앞부분만 보여준다. 편집할 수 없다.",
      readOnly: true,
      isDirty: false,
      isSaving: false,
      loading: false,
    });
  });

  it("실패는 그 이유를 그대로 보여주고 편집을 막는다", async () => {
    const { files, model } = make({});

    void model.open("gone.md");
    await settled();

    expect(files.rows["gone.md"]).toMatchObject({ content: "", readOnly: true });
    expect(files.rows["gone.md"]?.notice).toMatch(/없는 파일/u);
  });
});

describe("줄·열로 이동", () => {
  it("revealAt은 경로별로 담고, 같은 위치를 다시 요청해도 seq가 올라 구분된다", () => {
    const { files } = make({});

    files.revealAt("a.md", { line: 3, column: 2 });
    files.revealAt("a.md", { line: 3, column: 2 });

    expect(files.reveals["a.md"]).toEqual({ line: 3, column: 2, seq: 2 });
  });

  it("arka.filesystem.reveal 명령이 file: uri의 경로로 revealAt을 부른다", () => {
    const { files, commands } = make({});

    commands.execute("arka.filesystem.reveal", { uri: URI.file("docs/a.md"), line: 5, column: 1 });
    commands.execute("arka.filesystem.reveal", { uri: URI.parse("chat:///1"), line: 5, column: 1 });
    commands.execute("arka.filesystem.reveal", "엉뚱한 것");

    expect(Object.keys(files.reveals)).toEqual(["docs/a.md"]);
    expect(files.reveals["docs/a.md"]).toMatchObject({ line: 5, column: 1 });
  });
});

describe("editFile / saveFile", () => {
  it("editFile 은 즉시 버퍼에 반영되고 isDirty 가 선다", async () => {
    const files = viewModel({ "a.md": text("원본") });
    void files.openFile("a.md");
    await settled();

    files.editFile("a.md", "고친 내용");

    expect(files.rows["a.md"]).toMatchObject({ content: "고친 내용", isDirty: true });
  });

  it("openFile은 텍스트면 true다 — 탭으로 열 수 있다", async () => {
    const files = viewModel({ "a.md": text("원본") });

    await expect(files.openFile("a.md")).resolves.toBe(true);
    expect(files.rows["a.md"]).toEqual(loaded("원본"));
  });

  it("openFile은 바이너리면 닫고 false다 — 텍스트 탭이 열 것이 아니다", async () => {
    const files = viewModel({ "x.png": { ...text(""), path: "x.png", encoding: "binary" } });

    await expect(files.openFile("x.png")).resolves.toBe(false);
    expect(files.rows["x.png"]).toBeUndefined();
  });

  it("openFile은 읽기 실패면 닫고 false다", async () => {
    const files = viewModel({});

    await expect(files.openFile("nope.md")).resolves.toBe(false);
    expect(files.rows["nope.md"]).toBeUndefined();
  });

  it("저장이 진행 중일 때는 안내 없이 isSaving 플래그만 선다 — 저장 버튼 회전으로만 표현한다", async () => {
    const files = viewModel({ "a.md": text("원본") });
    void files.openFile("a.md");
    await settled();
    files.editFile("a.md", "고친 내용");

    files.saveFile("a.md");

    expect(files.rows["a.md"]).toMatchObject({ notice: null, isSaving: true });
  });

  it("saveFile 이 성공하면 isDirty 가 내려가고 안내가 사라진다", async () => {
    const files = viewModel({ "a.md": text("원본") });
    void files.openFile("a.md");
    await settled();
    files.editFile("a.md", "고친 내용");

    files.saveFile("a.md");
    await settled();

    expect(files.rows["a.md"]).toEqual(loaded("고친 내용"));
  });

  it("saveFile 이 실패하면 저장하지 못한 이유를 안내로 보여주고, 편집한 내용은 잃지 않는다", async () => {
    const files = viewModel({ "a.md": text("원본") }, { writeFails: "이 배포는 읽기 전용이다." });
    void files.openFile("a.md");
    await settled();
    files.editFile("a.md", "고친 내용");

    files.saveFile("a.md");
    await settled();

    expect(files.rows["a.md"]).toMatchObject({
      content: "고친 내용",
      isDirty: true,
      notice: "저장하지 못했다 — 이 배포는 읽기 전용이다.",
    });
  });

  it("잘린 파일은 editFile 을 줘도 readOnly 가 풀리지 않는다", async () => {
    const files = viewModel({ "big.txt": { ...text("앞부분"), path: "big.txt", truncated: true } });
    void files.openFile("big.txt");
    await settled();

    files.editFile("big.txt", "건드림");

    expect(files.rows["big.txt"]).toMatchObject({ content: "앞부분", readOnly: true });
  });
});

describe("retargetOpenFile", () => {
  it("Model 에 그대로 위임한다 — 편집 중이던 내용도 새 경로에서 그대로 보인다", async () => {
    const files = viewModel({ "old.md": { ...text("원본"), path: "old.md" } });
    void files.openFile("old.md");
    await settled();
    files.editFile("old.md", "고친 내용");

    files.retargetOpenFile("old.md", "new.md");

    expect(files.rows["old.md"]).toBeUndefined();
    expect(files.rows["new.md"]).toMatchObject({ content: "고친 내용", isDirty: true });
  });
});
