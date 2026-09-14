import { afterEach, describe, expect, it } from "vitest";
import { createGitServicePort } from "./HttpGitService";

type Call = { url: string; method: string; body: string | undefined };
const originalFetch = globalThis.fetch;
const serverReplies = (body: unknown, status = 200) => {
  const calls: Call[] = [];
  globalThis.fetch = ((input: unknown, init?: { method?: string; body?: string }) => {
    calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body });
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;
  return calls;
};

describe("HttpGitService", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("상태를 계약대로 읽는다", async () => {
    const body = { repository: true, branch: "main", files: [{ path: "a", staged: null, unstaged: "modified" }] };
    serverReplies(body);
    expect(await createGitServicePort().status()).toEqual(body);
  });

  it("diff·stage·commit 요청 모양", async () => {
    const calls = serverReplies({ diff: "+x" });
    expect(await createGitServicePort().diff("a b.ts", true)).toBe("+x");
    expect(calls[0]?.url).toBe("/api/git/diff?path=a+b.ts&staged=true");
    globalThis.fetch = originalFetch;
    const staged = serverReplies(null, 204);
    await createGitServicePort().stage(["a"]);
    expect(staged[0]).toMatchObject({ url: "/api/git/stage", method: "POST", body: JSON.stringify({ paths: ["a"] }) });
  });

  it("실패하면 서버 사유를 담아 던진다", async () => {
    serverReplies({ code: "NothingToCommit", message: "nothing staged to commit" }, 409);
    await expect(createGitServicePort().commit("x")).rejects.toThrow(/409.*nothing staged/u);
  });
});
