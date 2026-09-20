import { createContext, type ReactNode } from "react";
import type { Container } from "#core/di";
import { CoreError } from "#core/errors";

export class MissingContainerProviderError extends CoreError {
  constructor() {
    super("useViewModel must be used within a ContainerProvider.");
  }
}

export const ContainerContext = createContext<Container | null>(null);

export const ContainerProvider = ({ container, children }: { container: Container; children: ReactNode }) => (
  <ContainerContext value={container}>{children}</ContainerContext>
);
