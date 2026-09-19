import type { Disposable } from "#core/di";
import type { ISettings } from "#core/settings";

/** 밀도 설정의 id. 조립부가 `ISettings.schema`에 이 id로 더한다. */
export const DENSITY_SETTING_ID = "workbench.density";

/**
 * 밀도를 `<html data-density>`에 반영한다. `auto`는 포인터가 coarse(터치)면 touch, 아니면 compact.
 * CSS는 이 속성만 본다 — 컴포넌트는 `--arka-row-height` 같은 변수만 참조한다. 만드는 순간 켜진다.
 */
export const createDocumentDensity = ({ settings }: { settings: ISettings }): Disposable => {
  const coarse = window.matchMedia("(pointer: coarse)");
  const apply = () => {
    const density = settings.get<string>(DENSITY_SETTING_ID);
    document.documentElement.dataset["density"] = density === "auto" ? (coarse.matches ? "touch" : "compact") : density;
  };
  apply();
  const subscription = settings.onDidChange((id) => {
    if (id === DENSITY_SETTING_ID) apply();
  });
  coarse.addEventListener("change", apply);
  return {
    dispose: () => {
      subscription.dispose();
      coarse.removeEventListener("change", apply);
      delete document.documentElement.dataset["density"];
    },
  };
};
