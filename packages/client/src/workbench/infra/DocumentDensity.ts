import type { Disposable } from '#core/di';
import type { ISettingsModel } from '../model/ISettingsModel';
import type { IWorkbenchStartup } from '../model/IWorkbenchStartup';

/**
 * 밀도를 `<html data-density>`에 반영한다. `auto`는 포인터가 coarse(터치)면 touch, 아니면 compact.
 * CSS는 이 속성만 본다 — 컴포넌트는 `--arka-row-height` 같은 변수만 참조한다.
 */
export const createDocumentDensity = ({ settingsModel }: { settingsModel: ISettingsModel }): IWorkbenchStartup => {
  let subscription: Disposable | null = null;
  const coarse = window.matchMedia('(pointer: coarse)');
  const apply = () => {
    const { density } = settingsModel.settings;
    document.documentElement.dataset['density'] = density === 'auto' ? (coarse.matches ? 'touch' : 'compact') : density;
  };
  return {
    start: () => {
      apply();
      subscription = settingsModel.onDidChange(apply);
      coarse.addEventListener('change', apply);
    },
    stop: () => {
      subscription?.dispose();
      subscription = null;
      coarse.removeEventListener('change', apply);
      delete document.documentElement.dataset['density'];
    },
  };
};
