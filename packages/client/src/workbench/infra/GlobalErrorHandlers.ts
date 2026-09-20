import type { Disposable } from "#core/di";
import type { IErrorLog } from "../model/IErrorLog";

export const createGlobalErrorHandlers = ({ errorLog }: { errorLog: IErrorLog }): Disposable => {
  const onError = (event: ErrorEvent): void => {
    errorLog.report(event.error ?? event.message, "window.error");
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    errorLog.report(event.reason, "unhandledrejection");
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  return {
    dispose: () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    },
  };
};
