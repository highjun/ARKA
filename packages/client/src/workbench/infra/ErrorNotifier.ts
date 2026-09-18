import type { Disposable } from "#core/di";
import type { IErrorLog } from "../model/IErrorLog";
import type { INotifications } from "../model/INotifications";
import type { IWorkbenchStartup } from "../model/IWorkbenchStartup";

/**
 * `IErrorLog`에 새 오류가 남으면 알림으로 띄운다 — 화면이 죽지 않은 오류(이벤트 핸들러·Promise)도
 * 사용자가 알게 된다. 기록과 표시를 갈라 둔 것은, 기록은 항상 남기고 표시는 정책이기 때문이다.
 */
export const createErrorNotifier = ({
  errorLog,
  notifications,
}: {
  errorLog: IErrorLog;
  notifications: INotifications;
}): IWorkbenchStartup => {
  let subscription: Disposable | null = null;
  let seen = 0;
  return {
    start: () => {
      seen = errorLog.entries.length;
      subscription = errorLog.onDidChange(() => {
        for (const entry of errorLog.entries.slice(seen))
          notifications.notify("error", `${entry.name}: ${entry.message}`);
        seen = errorLog.entries.length;
      });
    },
    stop: () => {
      subscription?.dispose();
      subscription = null;
    },
  };
};
