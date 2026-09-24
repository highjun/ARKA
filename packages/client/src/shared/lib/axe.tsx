import axe from "axe-core";

export const expectNoA11yViolations = async (
  container: Element,
  options?: { readonly rules?: Record<string, { readonly enabled: boolean }> },
): Promise<void> => {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false }, ...options?.rules },
  });
  if (results.violations.length === 0) return;
  const detail = results.violations
    .map((v) => `${v.id}(${v.impact ?? "?"}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`)
    .join("\n\n");
  throw new Error(`axe 위반 ${String(results.violations.length)}건:\n\n${detail}`);
};
