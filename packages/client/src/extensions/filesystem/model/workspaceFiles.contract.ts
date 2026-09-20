import { beforeEach, describe, expect, it } from "vitest";
import type { IWorkspaceFiles } from "./IWorkspaceFiles";

export const testWorkspaceFilesContract = (
  name: string,
  setup: () => Promise<IWorkspaceFiles> | IWorkspaceFiles,
): void => {
  describe(`IWorkspaceFiles: ${name}`, () => {
    let files: IWorkspaceFiles;

    beforeEach(async () => {
      files = await setup();
    });

    it("빈 루트는 path가 빈 문자열이고 parent가 null이며 항목이 없다", async () => {
      expect(await files.list("")).toEqual({ path: "", parent: null, entries: [] });
    });

    it("만든 파일과 디렉터리가 목록에 보인다", async () => {
      await files.create("a.txt", "file");
      await files.create("docs", "dir");
      expect((await files.list("")).entries).toEqual([
        { name: "docs", type: "dir" },
        { name: "a.txt", type: "file" },
      ]);
    });

    it("디렉터리가 파일보다 앞에 오고, 같은 종류끼리는 이름순이다", async () => {
      await files.create("b.txt", "file");
      await files.create("a.txt", "file");
      await files.create("z-dir", "dir");
      await files.create("a-dir", "dir");
      expect((await files.list("")).entries.map((entry) => entry.name)).toEqual(["a-dir", "z-dir", "a.txt", "b.txt"]);
    });

    it("하위 디렉터리의 parent는 상위 경로이고 루트 바로 아래는 빈 문자열이다", async () => {
      await files.create("dir", "dir");
      await files.create("dir/sub", "dir");
      expect((await files.list("dir")).parent).toBe("");
      expect((await files.list("dir/sub")).parent).toBe("dir");
      expect((await files.list("dir/sub")).path).toBe("dir/sub");
    });

    it("쓴 내용을 그대로 읽는다", async () => {
      await files.create("a.txt", "file");
      await files.write("a.txt", "안녕\n");
      expect(await files.read("a.txt")).toEqual({
        path: "a.txt",
        content: "안녕\n",
        truncated: false,
        encoding: "utf8",
      });
    });

    it("갓 만든 파일은 비어 있다", async () => {
      await files.create("a.txt", "file");
      expect((await files.read("a.txt")).content).toBe("");
    });

    it("없는 파일을 읽으면 던진다", async () => {
      await expect(files.read("nope.txt")).rejects.toThrow();
    });

    it("디렉터리를 읽으면 던진다", async () => {
      await files.create("dir", "dir");
      await expect(files.read("dir")).rejects.toThrow();
    });

    it("없는 디렉터리를 나열하면 던진다", async () => {
      await expect(files.list("nope")).rejects.toThrow();
    });

    it("이미 있는 경로에 만들면 던진다", async () => {
      await files.create("a.txt", "file");
      await expect(files.create("a.txt", "file")).rejects.toThrow();
      await expect(files.create("a.txt", "dir")).rejects.toThrow();
    });

    it("없는 부모 아래에 만들면 던진다", async () => {
      await expect(files.create("nope/a.txt", "file")).rejects.toThrow();
    });

    it("없는 파일에 쓰면 던진다 — 쓰기는 만들지 않는다", async () => {
      await expect(files.write("nope.txt", "x")).rejects.toThrow();
    });

    it("옮기면 옛 경로는 사라지고 새 경로에서 같은 내용이 읽힌다", async () => {
      await files.create("a.txt", "file");
      await files.write("a.txt", "내용");
      await files.create("dir", "dir");
      await files.move("a.txt", "dir/b.txt");
      expect((await files.list("")).entries.map((entry) => entry.name)).toEqual(["dir"]);
      expect((await files.read("dir/b.txt")).content).toBe("내용");
    });

    it("디렉터리를 옮기면 안의 것도 함께 간다", async () => {
      await files.create("dir", "dir");
      await files.create("dir/a.txt", "file");
      await files.move("dir", "moved");
      expect((await files.list("moved")).entries).toEqual([{ name: "a.txt", type: "file" }]);
      await expect(files.list("dir")).rejects.toThrow();
    });

    it("목적지가 이미 있으면 옮기기가 던진다 — 덮어쓰지 않는다", async () => {
      await files.create("a.txt", "file");
      await files.write("a.txt", "A");
      await files.create("b.txt", "file");
      await files.write("b.txt", "B");
      await expect(files.move("a.txt", "b.txt")).rejects.toThrow();
      expect((await files.read("b.txt")).content).toBe("B");
    });

    it("없는 것을 옮기면 던진다", async () => {
      await expect(files.move("nope.txt", "b.txt")).rejects.toThrow();
    });

    it("지우면 목록에서 사라진다", async () => {
      await files.create("a.txt", "file");
      await files.remove("a.txt");
      expect((await files.list("")).entries).toEqual([]);
    });

    it("디렉터리를 지우면 안까지 지운다", async () => {
      await files.create("dir", "dir");
      await files.create("dir/a.txt", "file");
      await files.remove("dir");
      await expect(files.list("dir")).rejects.toThrow();
      await expect(files.read("dir/a.txt")).rejects.toThrow();
    });

    it("없는 것을 지우면 던진다", async () => {
      await expect(files.remove("nope.txt")).rejects.toThrow();
    });

    it("루트 밖 경로는 거부한다", async () => {
      await expect(files.list("..")).rejects.toThrow();
      await expect(files.read("../etc/passwd")).rejects.toThrow();
      await expect(files.create("../x", "file")).rejects.toThrow();
    });
  });
};
