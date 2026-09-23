import type { VisualRegressionDeclaration } from "#visual-regression";

const declaration: VisualRegressionDeclaration = {
  shots: [
    { name: "hover", target: '[data-component^="ActivityBar/"] button', pseudo: ["hover"] },
    {
      name: "focus-visible",
      target: '[data-component="ActivityBar/Top"] [aria-pressed="true"]',
      pseudo: ["focus-visible"],
    },
  ],
};

export default declaration;
