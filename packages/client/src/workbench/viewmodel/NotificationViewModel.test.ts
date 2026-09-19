import { describe, expect, it } from "vitest";
import { Notifications } from "../model/Notifications";
import { NotificationViewModel } from "./NotificationViewModel";

describe("INotificationViewModel", () => {
  it("알림 서비스의 것을 그대로 내고, 닫으면 사라진다", () => {
    const notifications = new Notifications({ newId: () => "n" });
    const viewModel = new NotificationViewModel({ notifications });

    notifications.notify("error", "실패");
    expect(viewModel.items).toEqual([{ id: "n", severity: "error", message: "실패" }]);

    viewModel.dismiss("n");
    expect(viewModel.items).toEqual([]);
  });
});
