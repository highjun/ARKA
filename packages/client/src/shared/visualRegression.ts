export type VisualRegressionPseudo = "hover" | "focus-visible" | "active";

export interface VisualRegressionShot {
  readonly name: string;
  readonly target: string;
  readonly pseudo: readonly VisualRegressionPseudo[];
}

export interface VisualRegressionDeclaration {
  readonly shots: readonly VisualRegressionShot[];
}
