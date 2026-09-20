import type { Disposable } from "#core/di";
import type { ISettings } from "#core/settings";

export const DENSITY_SETTING_ID = "workbench.density";

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
