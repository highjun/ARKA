import { createContext, useContext, type ReactNode } from "react";

const PortalContext = createContext<HTMLElement | undefined>(undefined);

export const PortalProvider = ({
  container,
  children,
}: {
  readonly container: HTMLElement | undefined;
  readonly children: ReactNode;
}) => <PortalContext value={container}>{children}</PortalContext>;

export const usePortalContainer = (): HTMLElement | undefined => useContext(PortalContext);
