export type VisualRegressionPseudo = "hover" | "focus-visible" | "active";

export interface VisualRegressionViewport {
  readonly width: number;
  readonly height: number;
}

export interface VisualRegressionShot {
  readonly name: string;
  /** 상태를 걸 요소. pseudo 를 줄 때만 쓴다. */
  readonly target?: string;
  readonly pseudo?: readonly VisualRegressionPseudo[];
  /** 이 장만 다른 창 크기로 찍는다. */
  readonly viewport?: VisualRegressionViewport;
}

export interface VisualRegressionDeclaration {
  readonly shots: readonly VisualRegressionShot[];
}
