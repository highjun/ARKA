import { createContainer, singleton, scoped } from "#core/di";
import { ViewModelProvider } from "#core/viewmodel";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatModel } from "../model/ChatModel";
import { ChatModelToken } from "../model/IChatModel";
import { MockAgentBackend } from "../model/MockAgentBackend";
import { ChatViewModel } from "../viewmodel/ChatViewModel";
import { ChatViewModelToken } from "../viewmodel/IChatViewModel";
import { ChatSessionsInlineActions, ChatSessionsView } from "./ChatSessionsView";

const mount = async (onOpenTab = vi.fn()) => {
  const backend = new MockAgentBackend({ now: () => 1 });
  await backend.createSession("첫 대화");
  const container = createContainer("test");
  container.register(
    ChatModelToken,
    singleton(() => new ChatModel({ api: backend, events: backend })),
  );
  container.register(
    ChatViewModelToken,
    scoped((c) => new ChatViewModel({ chatModel: c.resolve(ChatModelToken) })),
  );
  // 머리는 커널이 그린다 — 본문과 액션이 따로 붙으므로 테스트도 둘을 같은 스코프에 세운다.
  // `ChatSessionsMenuActions`는 `Menu.Item` 하나라 `Menu` 밖에서 못 선다 — `Shell`이 감싼다.
  render(
    <ViewModelProvider container={container.createScope("view")}>
      <ChatSessionsInlineActions onOpenTab={onOpenTab} />
      <ChatSessionsView onOpenTab={onOpenTab} />
    </ViewModelProvider>,
  );
  return { onOpenTab };
};

describe("ChatSessionsView", () => {
  it("세션을 나열하고 고르면 대화 탭을 연다", async () => {
    const { onOpenTab } = await mount();
    fireEvent.click(await screen.findByText("첫 대화"));
    expect(onOpenTab).toHaveBeenCalledWith({ id: "id1", kind: "chat", title: "첫 대화" });
  });

  it("새 대화를 만들면 그 탭을 연다", async () => {
    const { onOpenTab } = await mount();
    await screen.findByText("첫 대화");
    fireEvent.click(screen.getByRole("button", { name: /새 대화/u }));
    await vi.waitFor(() =>
      expect(onOpenTab).toHaveBeenCalledWith(expect.objectContaining({ kind: "chat", title: "새 대화" })),
    );
  });
});
