import { describe, expect, it } from "vitest";
import { ErrorLog } from "../model/ErrorLog";
import { Notifications } from "../model/Notifications";
import { createErrorNotifier } from "./ErrorNotifier";

describe("createErrorNotifier", () => {
  it("만든 뒤의 오류만 알림이 되고, dispose 뒤에는 안 된다", () => {
    const errorLog = new ErrorLog();
    const notifications = new Notifications();
    errorLog.report(new Error("이전"), "x");
    const notifier = createErrorNotifier({ errorLog, notifications });
    errorLog.report(new TypeError("이후"), "x");
    expect(notifications.items.map((n) => n.message)).toEqual(["TypeError: 이후"]);
    notifier.dispose();
    errorLog.report(new Error("정지 뒤"), "x");
    expect(notifications.items).toHaveLength(1);
  });
});
