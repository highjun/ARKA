import { describe, expect, it, vi } from "vitest";
import { URI } from "#contracts";
import type { IWorkspace } from "./IWorkspace";
import { OutsideWorkspaceError, Workspace } from "./Workspace";

const make = (workspaceName: string | null = "arka") =>
  new Workspace({
    serverInfo: {
      load: () =>
        Promise.resolve(
          workspaceName === null ? null : { builtAt: "", protocolVersion: 1, protocolHeader: "", workspaceName },
        ),
    },
  });

describe("Workspace", () => {
  it("루트는 file:///이고 이름은 읽기 전엔 비어 있다", () => {
    const workspace: IWorkspace = make();

    expect(workspace.root.toString()).toBe("file:///");
    expect(workspace.name).toBe("");
  });

  it("load하면 서버가 준 이름이 오고 알린다", async () => {
    const workspace = make("proj");
    const listener = vi.fn();
    workspace.onDidChange(listener);

    await workspace.load();

    expect(workspace.name).toBe("proj");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("못 읽으면 이름이 비어 있는 채로 남는다", async () => {
    const workspace = make(null);

    await workspace.load();

    expect(workspace.name).toBe("");
  });

  it("resolve는 상대 경로를 정리해 file Uri로 만든다", () => {
    expect(make().resolve("docs/./a/../b.md").toString()).toBe("file:///docs/b.md");
  });

  it("resolve는 루트 밖이면 OutsideWorkspaceError를 던진다", () => {
    expect(() => make().resolve("../etc/passwd")).toThrow(OutsideWorkspaceError);
    expect(() => make().resolve("/etc/passwd")).toThrow(OutsideWorkspaceError);
  });

  it("relativize는 file Uri만 경로로 돌리고 나머지는 null이다", () => {
    expect(make().relativize(URI.file("docs/a.md"))).toBe("docs/a.md");
    expect(make().relativize(URI.parse("arka:///settings"))).toBeNull();
  });

  it("relativize는 resolve와 짝이다 — 루트 밖은 null이고 안쪽은 정리해서 돌려준다", () => {
    const workspace = make();

    expect(workspace.relativize(URI.file("../바깥.md"))).toBeNull();
    expect(workspace.relativize(URI.file("a/../../바깥.md"))).toBeNull();
    expect(workspace.relativize(URI.file("docs/./a/../b.md"))).toBe("docs/b.md");
  });
});
