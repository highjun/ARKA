import type { IThemeModel } from "../model/IThemeModel";
import type { IWorkbenchStartup } from "../model/IWorkbenchStartup";
import type { Disposable } from "#core/di";

/**
 * 테마를 `<html>`의 `color-scheme`에 반영한다.
 *
 * 여기가 유일한 자리다 — 브라우저 자체의 캔버스·스크롤바 기본색은 컴포넌트 트리 밖이라
 * React로는 닿지 않는다. `viewmodel/`은 DOM 조작이 금지고 `model/`은 `document`를 모르므로
 * `infra/`가 남는다.
 */
export const createDocumentTheme = ({ themeModel }: { themeModel: IThemeModel }): IWorkbenchStartup => {
  let subscription: Disposable | null = null;
  const apply = () => {
    document.documentElement.style.colorScheme = themeModel.theme;
  };
  return {
    start: () => {
      apply();
      subscription = themeModel.onDidChange(apply);
    },
    stop: () => {
      subscription?.dispose();
      subscription = null;
    },
  };
};
