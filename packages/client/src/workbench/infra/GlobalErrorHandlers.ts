import type { IErrorLog } from "../model/IErrorLog";
import type { IWorkbenchStartup } from "../model/IWorkbenchStartup";

/**
 * React 트리 밖에서 새는 오류 — 이벤트 핸들러·타이머·기다리지 않은 Promise — 를 `IErrorLog`로
 * 보낸다. ErrorBoundary는 렌더 중 오류만 잡으므로 이 둘이 짝이다.
 *
 * `console.error`도 그대로 남긴다 — 개발자 도구에서 보던 것을 빼앗지 않는다.
 */
export const createGlobalErrorHandlers = ({ errorLog }: { errorLog: IErrorLog }): IWorkbenchStartup => {
  const onError = (event: ErrorEvent): void => {
    errorLog.report(event.error ?? event.message, "window.error");
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    errorLog.report(event.reason, "unhandledrejection");
  };
  return {
    start: () => {
      window.addEventListener("error", onError);
      window.addEventListener("unhandledrejection", onUnhandledRejection);
    },
    stop: () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    },
  };
};
