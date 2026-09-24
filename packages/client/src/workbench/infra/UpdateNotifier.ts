import type { Disposable } from "#core/di";
import type { IAppLifetime } from "../model/IAppLifetime";
import type { INotifications } from "../model/INotifications";

/** 새 배포나 프로토콜 불일치를 알림 하나로 알린다 — 세션에 한 번만, 단추는 다시 불러오기다. */
export const createUpdateNotifier = ({
  appLifetime,
  notifications,
}: {
  appLifetime: IAppLifetime;
  notifications: INotifications;
}): Disposable => {
  let notified = false;
  const notify = () => {
    if (notified) return;
    if (appLifetime.isOutdated) {
      notified = true;
      notifications.notify("warning", "이 화면은 서버와 다른 프로토콜을 쓴다 — 다시 불러와야 한다", {
        action: { label: "다시 불러오기", run: () => appLifetime.requestReload("versionMismatch") },
      });
      return;
    }
    if (appLifetime.isUpdateAvailable) {
      notified = true;
      notifications.notify("info", "새 버전이 올라왔다 — 다시 불러오면 반영된다", {
        action: { label: "다시 불러오기", run: () => appLifetime.requestReload("userRequested") },
      });
    }
  };
  const subscription = appLifetime.onDidChange(notify);
  notify();
  return { dispose: () => subscription.dispose() };
};
