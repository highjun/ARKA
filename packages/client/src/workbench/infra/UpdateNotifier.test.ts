import { describe, expect, it, vi } from "vitest";
import { Emitter } from "#core/events";
import type { IAppLifetime } from "../model/IAppLifetime";
import { Notifications } from "../model/Notifications";
import { createUpdateNotifier } from "./UpdateNotifier";

const lifetime = () => {
  const changed = new Emitter();
  const state = { isOutdated: false, isUpdateAvailable: false };
  const requestReload = vi.fn();
  const appLifetime: IAppLifetime = {
    get isOutdated() {
      return state.isOutdated;
    },
    get isUpdateAvailable() {
      return state.isUpdateAvailable;
    },
    builtAt: "",
    gitSha: "",
    load: () => Promise.resolve(),
    requestReload,
    onDidChange: (listener) => changed.event(listener),
  };
  return { appLifetime, state, requestReload, fire: () => changed.fire() };
};

describe("createUpdateNotifier", () => {
  it("새 배포가 보이면 단추 달린 알림을 한 번만 띄운다", () => {
    const { appLifetime, state, requestReload, fire } = lifetime();
    const notifications = new Notifications();
    createUpdateNotifier({ appLifetime, notifications });

    expect(notifications.items).toEqual([]);
    state.isUpdateAvailable = true;
    fire();
    fire();

    expect(notifications.items.map((n) => [n.severity, n.action?.label])).toEqual([["info", "다시 불러오기"]]);
    notifications.items[0]?.action?.run();
    expect(requestReload).toHaveBeenCalledWith("userRequested");
  });

  it("프로토콜이 다르면 경고로 띄우고 새 배포 알림은 안 겹친다", () => {
    const { appLifetime, state, fire } = lifetime();
    const notifications = new Notifications();
    createUpdateNotifier({ appLifetime, notifications });

    state.isOutdated = true;
    state.isUpdateAvailable = true;
    fire();

    expect(notifications.items.map((n) => n.severity)).toEqual(["warning"]);
  });

  it("만들 때 이미 새 배포면 바로 띄운다", () => {
    const { appLifetime, state } = lifetime();
    state.isUpdateAvailable = true;
    const notifications = new Notifications();
    createUpdateNotifier({ appLifetime, notifications });

    expect(notifications.items).toHaveLength(1);
  });

  it("dispose 뒤에는 듣지 않는다", () => {
    const { appLifetime, state, fire } = lifetime();
    const notifications = new Notifications();
    createUpdateNotifier({ appLifetime, notifications }).dispose();

    state.isUpdateAvailable = true;
    fire();

    expect(notifications.items).toEqual([]);
  });
});
