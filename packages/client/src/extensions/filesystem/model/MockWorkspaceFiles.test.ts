import { describe, expect, it } from "vitest";
import { MockWorkspaceFiles } from "./MockWorkspaceFiles";
import { testWorkspaceFilesContract } from "./workspaceFiles.contract";

testWorkspaceFilesContract("MockWorkspaceFiles", () => new MockWorkspaceFiles());

describe("MockWorkspaceFiles 씨앗", () => {
  it("중간 디렉터리를 자동으로 만든다", async () => {
    const files = new MockWorkspaceFiles({ "src/app/main.ts": "x", docs: null });
    expect((await files.list("")).entries).toEqual([
      { name: "docs", type: "dir" },
      { name: "src", type: "dir" },
    ]);
    expect((await files.read("src/app/main.ts")).content).toBe("x");
  });
});
