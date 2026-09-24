import type { VisualRegressionDeclaration } from "#lib/visualRegression";

const declaration: VisualRegressionDeclaration = {
  shots: [
    { name: "narrow", viewport: { width: 390, height: 120 } },
    { name: "hover", target: '[data-component="TitleBar/Actions"] button', pseudo: ["hover"] },
  ],
};

export default declaration;
