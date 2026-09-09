import type { DirectoryListing, FileContent, FileEntryType } from "#contracts";
import type { AgentToolDefinition, IAgentTools, ToolOutcome } from "../domain/IAgentTools";

/** 조립부가 넘기는 워크스페이스 유스케이스 — filesystem feature의 `WorkspaceOperations`와 모양이 같다. */
export type WorkspaceAccess = {
  list(path: string): Promise<DirectoryListing>;
  read(path: string): Promise<FileContent>;
  write(path: string, content: string): Promise<void>;
  create(path: string, type: FileEntryType): Promise<void>;
};

const DEFINITIONS: readonly AgentToolDefinition[] = [
  {
    name: "list_directory",
    description: "워크스페이스의 디렉터리 하나를 나열한다. 경로는 워크스페이스 루트 기준 상대 경로이고 루트는 빈 문자열이다.",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
  },
  {
    name: "read_file",
    description: "텍스트 파일의 내용을 읽는다. 큰 파일은 앞부분만 오고 truncated가 true다.",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
  },
  {
    name: "write_file",
    description: "이미 있는 파일을 통째로 덮어쓴다. 새 파일은 create_entry로 먼저 만든다.",
    inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"], additionalProperties: false },
  },
  {
    name: "create_entry",
    description: "새 파일 또는 빈 디렉터리를 만든다. 이미 있으면 실패한다.",
    inputSchema: { type: "object", properties: { path: { type: "string" }, type: { type: "string", enum: ["file", "dir"] } }, required: ["path", "type"], additionalProperties: false },
  },
  {
    name: "ask_user",
    description: "작업을 이어가기 위해 사용자에게 꼭 물어야 할 것이 있을 때 쓴다. 답이 올 때까지 멈춘다.",
    inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"], additionalProperties: false },
  },
];

const str = (input: unknown, key: string): string => {
  const value = (input as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value;
};

/**
 * 워크스페이스 툴 집합. `ask_user`는 파일 툴이 아니라 실행기가 가로채는 특별 툴이다 — 여기서는 정의만
 * 내주고 `execute`로 오면 오류다.
 */
export const createWorkspaceTools = (workspace: WorkspaceAccess): IAgentTools => ({
  definitions: DEFINITIONS,
  execute: async (name, input): Promise<ToolOutcome> => {
    try {
      switch (name) {
        case "list_directory":
          return { output: await workspace.list(str(input, "path")), isError: false };
        case "read_file":
          return { output: await workspace.read(str(input, "path")), isError: false };
        case "write_file":
          await workspace.write(str(input, "path"), str(input, "content"));
          return { output: { ok: true }, isError: false };
        case "create_entry": {
          const type = str(input, "type");
          if (type !== "file" && type !== "dir") return { output: { error: "type must be file or dir" }, isError: true };
          await workspace.create(str(input, "path"), type);
          return { output: { ok: true }, isError: false };
        }
        default:
          return { output: { error: `unknown tool: ${name}` }, isError: true };
      }
    } catch (error) {
      return { output: { error: error instanceof Error ? error.message : String(error) }, isError: true };
    }
  },
});

export const ASK_USER_TOOL = "ask_user";
/** 워크스페이스를 바꾸는 툴 — `confirmWrites`가 켜져 있으면 실행 전에 사용자에게 묻는다. */
export const WRITING_TOOLS: ReadonlySet<string> = new Set(["write_file", "create_entry"]);
/** 허락으로 치는 답. 나머지는 전부 거부다 — 모호하면 안 바꾸는 쪽이 안전하다. */
export const isApproval = (answer: string): boolean => /^(?:예|네|응|허용|승인|y|yes|ok|okay)\s*[.!]?$/iu.test(answer.trim());
