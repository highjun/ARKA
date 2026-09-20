import type { Disposable } from "#core/di";
import type { IErrorLog } from "../model/IErrorLog";
import type { INotifications } from "../model/INotifications";

export const createErrorNotifier = ({
  errorLog,
  notifications,
}: {
  errorLog: IErrorLog;
  notifications: INotifications;
}): Disposable => {
  let seen = errorLog.entries.length;
  const subscription = errorLog.onDidChange(() => {
    for (const entry of errorLog.entries.slice(seen)) notifications.notify("error", `${entry.name}: ${entry.message}`);
    seen = errorLog.entries.length;
  });
  return { dispose: () => subscription.dispose() };
};
