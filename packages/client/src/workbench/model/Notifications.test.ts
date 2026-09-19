import { describe, expect, it, vi } from "vitest";
import { Notifications } from "./Notifications";

const make = () => {
  let id = 0;
  return new Notifications({ newId: () => `n${String(++id)}` });
};

describe("Notifications", () => {
  it("알림을 띄우고 id를 돌려주며 알린다", () => {
    const notifications = make();
    const listener = vi.fn();
    notifications.onDidChange(listener);
    expect(notifications.notify("error", "실패")).toBe("n1");
    expect(notifications.items).toEqual([{ id: "n1", severity: "error", message: "실패" }]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("같은 메시지는 하나로 합친다", () => {
    const notifications = make();
    expect(notifications.notify("error", "끊김")).toBe(notifications.notify("error", "끊김"));
    expect(notifications.items).toHaveLength(1);
    notifications.notify("info", "끊김");
    expect(notifications.items).toHaveLength(2);
  });

  it("닫으면 사라지고, 없는 id는 아무 일도 없다", () => {
    const notifications = make();
    const listener = vi.fn();
    const id = notifications.notify("info", "a");
    notifications.onDidChange(listener);
    notifications.dismiss(id);
    notifications.dismiss(id);
    expect(notifications.items).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("상한을 넘으면 오래된 것부터 버린다", () => {
    const notifications = make();
    for (let i = 0; i < Notifications.MAX + 2; i += 1) notifications.notify("info", String(i));
    expect(notifications.items).toHaveLength(Notifications.MAX);
    expect(notifications.items[0]?.message).toBe("2");
  });
});
