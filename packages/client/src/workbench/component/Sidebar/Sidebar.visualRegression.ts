import type { VisualRegressionDeclaration } from "#visual-regression";

const declaration: VisualRegressionDeclaration = {
  shots: [
    { name: "hover", target: '[data-component^="Sidebar/Rail"] button', pseudo: ["hover"] },
    {
      name: "focus-visible",
      target: '[data-component="Sidebar/RailTop"] [aria-pressed="true"]',
      pseudo: ["focus-visible"],
    },
  ],
};

export default declaration;
