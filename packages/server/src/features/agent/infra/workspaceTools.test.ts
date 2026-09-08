import { describe, expect, it } from "vitest";
import { createWorkspaceTools, type WorkspaceAccess } from "./workspaceTools";

const workspace: WorkspaceAccess = {
  list: (path) => Promise.resolve({ path, parent: null, entries: [{ name: "a.md", type: "file" }] }),
  read: (path) => (path === "nope" ? Promise.reject(new Error("no such path")) : Promise.resolve({ path, content: "x", truncated: false, encoding: "utf8" })),
  write: () => Promise.resolve(),
  create: () => Promise.resolve(),
};
const signal = new AbortController().signal;

describe("createWorkspaceTools", () => {
  it("정의에 파일 툴 넷과 ask_user가 있다", () => {
    expect(createWorkspaceTools(workspace).definitions.map((d) => d.name)).toEqual(["list_directory", "read_file", "write_file", "create_entry", "ask_user"]);
  });

  it("툴을 실행해 결과를 준다", async () => {
    const tools = createWorkspaceTools(workspace);
    expect(await tools.execute("list_directory", { path: "" }, signal)).toMatchObject({ isError: false, output: { entries: [{ name: "a.md" }] } });
    expect(await tools.execute("read_file", { path: "a.md" }, signal)).toMatchObject({ output: { content: "x" } });
    expect(await tools.execute("write_file", { path: "a.md", content: "y" }, signal)).toEqual({ output: { ok: true }, isError: false });
  });

  it("실패는 isError로 답하고 던지지 않는다", async () => {
    const tools = createWorkspaceTools(workspace);
    expect(await tools.execute("read_file", { path: "nope" }, signal)).toMatchObject({ isError: true, output: { error: "no such path" } });
    expect(await tools.execute("read_file", { path: 1 }, signal)).toMatchObject({ isError: true });
    expect(await tools.execute("unknown", {}, signal)).toMatchObject({ isError: true });
    expect(await tools.execute("create_entry", { path: "x", type: "link" }, signal)).toMatchObject({ isError: true });
  });
});
