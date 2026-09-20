import { CommandService } from "#core/commands";
import { describe, expect, it, vi } from "vitest";
import { Notifications } from "../model/Notifications";
import { NotificationViewModel } from "./NotificationViewModel";

const make = () => {
  const notifications = new Notifications({ newId: () => "n", now: () => 1_000 });
  const commands = new CommandService({
    overridesStore: { load: () => ({}), save: () => undefined },
    reportError: () => undefined,
  });
  const open = vi.fn();
  commands.actions.add({ id: "arka.workbench.open", label: "탭으로 열기", execute: open });
  const viewModel = new NotificationViewModel({ notifications, commands });
  return { notifications, commands, viewModel, open };
};

describe("INotificationViewModel", () => {
  it("알림 서비스의 것을 그대로 내고, 닫으면 사라진다", () => {
    const { notifications, viewModel } = make();

    notifications.notify("error", "실패");
    expect(viewModel.items).toEqual([{ id: "n", severity: "error", message: "실패", at: 1_000, isRead: false }]);

    viewModel.dismiss("n");
    expect(viewModel.items).toEqual([]);
  });

  it("안 읽은 수를 센다 — 닫지 않은 수가 아니다", () => {
    const { notifications, viewModel } = make();
    notifications.notify("error", "실패");
    expect(viewModel.unreadCount).toBe(1);

    viewModel.markAllRead();

    expect(viewModel.items).toHaveLength(1);
    expect(viewModel.unreadCount).toBe(0);
  });

  it("여는 명령을 스스로 등록하고, 열면서 다 읽음으로 만든다", () => {
    const { notifications, commands, viewModel, open } = make();
    notifications.notify("warning", "느리다");

    commands.execute("shell.openNotifications");

    expect(open).toHaveBeenCalledTimes(1);
    expect(viewModel.unreadCount).toBe(0);
  });

  it("모두 지우면 목록이 빈다", () => {
    const { notifications, viewModel } = make();
    notifications.notify("info", "저장했다");

    viewModel.clear();

    expect(viewModel.items).toEqual([]);
  });
});
