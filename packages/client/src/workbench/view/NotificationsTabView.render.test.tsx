import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { INotificationViewModel } from "../viewmodel/INotificationViewModel";
import { NotificationsTabView } from "./NotificationsTabView";

const mount = (state: Partial<INotificationViewModel>) => {
  const container = new Container("test");
  container.register("arka.workbench.notificationViewModel", "singleton", () => ({
    dispose: () => undefined,
    items: [],
    unreadCount: 0,
    toasts: [],
    dismiss: () => undefined,
    dismissToast: () => undefined,
    markRead: () => undefined,
    clear: () => undefined,
    ...state,
  }));
  render(
    <ContainerProvider container={container}>
      <NotificationsTabView />
    </ContainerProvider>,
  );
};

describe("NotificationsTabView", () => {
  it("단추가 달린 알림은 행에 단추가 보이고 누르면 run이 돈다", () => {
    const run = vi.fn();
    mount({
      items: [
        {
          id: "a",
          severity: "info",
          message: "새 버전",
          at: 0,
          isRead: false,
          action: { label: "다시 불러오기", run },
        },
        { id: "b", severity: "error", message: "실패", at: 0, isRead: true },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button", { name: "알림 지우기" })).toHaveLength(2);
  });
});
