import { createContext, useContext, type ReactNode } from 'react';

/**
 * 오버레이(ContextMenu·CommandPalette 등)가 어디로 포탈될지를 정하는 공유 자리 — 자기 DOM을
 * 그리지 않는 순수 Context 래퍼라 `src/components/`(화이트리스트가 `<Name>.module.css` 등
 * 렌더링 컴포넌트를 전제로 하는 자리) 대신 여기 둔다.
 *
 * 기본값은 `undefined` — Provider 없이 쓰면 각 컴포넌트가 알아서 `document.body`로 떨어진다.
 * Storybook처럼 앱(Shell)이 없는 자리에서도 컴포넌트가 그대로 동작해야 하기 때문이다.
 */
const PortalContext = createContext<HTMLElement | undefined>(undefined);

/** `container`가 `undefined`면 각 컴포넌트가 자기 기본값(대개 `document.body`)으로 떨어진다. */
export const PortalProvider = ({ container, children }: { readonly container: HTMLElement | undefined; readonly children: ReactNode }) => (
  <PortalContext value={container}>{children}</PortalContext>
);

/** Provider가 없으면 `undefined` — 컴포넌트마다 자기 라이브러리의 기본 포탈 대상(대개 `document.body`)에 맡긴다. */
export const usePortalContainer = (): HTMLElement | undefined => useContext(PortalContext);
