import type { IColorMode } from "../model/IColorMode";
import type { Disposable } from "#core/di";

export const createDocumentTheme = ({ colorMode }: { colorMode: IColorMode }): Disposable => {
  const apply = () => {
    document.documentElement.style.colorScheme = colorMode.mode;
  };
  apply();
  const subscription = colorMode.onDidChange(apply);
  return { dispose: () => subscription.dispose() };
};
