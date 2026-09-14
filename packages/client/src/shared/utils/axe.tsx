import axe from "axe-core";

/**
 * jsdom엔 실제 레이아웃·페인트가 없어 `color-contrast`(실제 렌더링된 색 대비 계산)는 신뢰할 수
 * 없다. 여기서는 구조적 규칙(role·label·중복 id 등, DOM 트리만으로 판정 가능한 것)만 본다.
 *
 * 색 대비는 실제 브라우저에서 본다 — 스토리북의 a11y 애드온이 패널에 띄우지만 **아무것도
 * 실패시키지 않는다.** 자동으로 막으려면 관문이 필요하다(TASK-35).
 *
 * `region`도 못 지킨다 — 컴포넌트 단위 테스트는 앱 셸의 랜드마크 없이 `document.body`에 바로
 * 렌더하고, Portal 컴포넌트는 `document.body`를 봐야 해서 이 페이지-레벨 규칙이 항상 걸린다.
 */
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
