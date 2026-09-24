import type { Disposable } from "#core/di";
import type { IAppLifetime } from "../model/IAppLifetime";

export const UPDATE_CHECK_INTERVAL = 5 * 60_000;

/** 탭이 다시 보일 때와 일정 간격으로 서버에 다시 물어 새 배포를 알아챈다. 안 보이는 탭은 묻지 않는다. */
export const createUpdateWatch = ({
  appLifetime,
  interval = UPDATE_CHECK_INTERVAL,
}: {
  appLifetime: IAppLifetime;
  interval?: number;
}): Disposable => {
  const check = () => {
    if (document.visibilityState === "visible") void appLifetime.load();
  };
  document.addEventListener("visibilitychange", check);
  const timer = setInterval(check, interval);
  return {
    dispose: () => {
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    },
  };
};
