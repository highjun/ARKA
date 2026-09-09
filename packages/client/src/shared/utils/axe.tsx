import axe from 'axe-core';

/**
 * jsdom엔 실제 레이아웃·페인트가 없어 `color-contrast`(실제 렌더링된 색 대비 계산)는 신뢰할 수
 * 없다. 여기서는 구조적 규칙(role·label·중복 id 등, DOM 트리만으로 판정 가능한 것)만 본다.
 *
 * 색 대비는 실제 브라우저에서 본다 — `.storybook/main.ts`의 `@storybook/addon-a11y`가 스토리마다
 * 검사해 패널에 띄운다. **다만 아무것도 실패시키지 않는다** — 사람이 스토리북을 열어 봐야 안다.
 * 자동으로 막으려면 test-runner가 필요하고, 그건 VRT·E2E와 같은 "관문을 어디에 둘 것인가"
 * 문제다(TASK-35).
 *
 * `region`(페이지 전체 콘텐츠가 랜드마크 안에 있어야 한다)도 여기선 못 지킨다 — 컴포넌트 단위
 * 테스트는 `<main>` 같은 앱 셸의 랜드마크 구조 없이 `document.body`에 바로 렌더한다. Portal로
 * 뜨는 컴포넌트(`ContextMenu`·`CommandPalette` 등)는 실제로 뜬 걸 검사하려면 RTL의 `container`가
 * 아니라 `document.body`를 봐야 하는데, 그러면 이 페이지-레벨 규칙이 항상 걸린다 — 랜드마크 배치는
 * 이 컴포넌트가 아니라 그걸 쓰는 앱의 책임이다.
 */
export const expectNoA11yViolations = async (
  container: Element,
  options?: { readonly rules?: Record<string, { readonly enabled: boolean }> },
): Promise<void> => {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, ...options?.rules },
  });
  if (results.violations.length === 0) return;
  const detail = results.violations
    .map(
      (v) =>
        `${v.id}(${v.impact ?? '?'}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
    )
    .join('\n\n');
  throw new Error(`axe 위반 ${String(results.violations.length)}건:\n\n${detail}`);
};
