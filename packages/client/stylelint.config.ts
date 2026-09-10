/**
 * CSS Modules의 규율. → docs/adr/0006-design-system.md
 *
 * 값은 Primer 토큰 변수(`--fgColor-*`, `--space-*`, `--borderRadius-*` …)를 참조한다 — 색을
 * 직접 적으면 라이트/다크가 갈리는 순간 한쪽이 깨진다. 규칙마다 `message`로 대안을 적는다.
 */
export default {
  extends: ["stylelint-config-standard"],
  // **검사 대상은 여기가 정한다** — 스크립트는 `"**/*.css"`만 넘긴다. 점 폴더는 stylelint가 기본으로
  // 건너뛰지만 그래도 적어 둔다: 그 동작이 바뀌면 번들 CSS가 쏟아진다(직접 주면 5122건).
  ignoreFiles: ["**/node_modules/**", "**/.output/**"],
  rules: {
    "color-no-hex": [true, { message: "색을 직접 적지 마세요 — Primer 토큰(`var(--fgColor-*)`, `var(--bgColor-*)`)을 참조하세요." }],
    "color-named": ["never", { message: "색 이름을 쓰지 마세요 — Primer 토큰을 참조하세요." }],
    "function-disallowed-list": [
      ["rgb", "rgba", "hsl", "hsla"],
      { message: "색 함수를 직접 쓰지 마세요 — Primer 토큰을 참조하세요. 투명도가 필요하면 `--overlay-*`·`--*-muted` 토큰이 있습니다." },
    ],
    // CSS Modules의 클래스명·keyframes 이름은 JS 식별자다(`styles['brandGroup']`) — kebab-case 강제를 끈다.
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    // Primer 토큰이 camelCase다(`--fgColor-default`). 우리가 정한 이름이 아니라 검사 대상이 아니다.
    "custom-property-pattern": null,
    // 컴포넌트마다 파일이 갈리는 CSS Modules에서는 특이도 순서가 파일 간에 의미가 없다.
    "no-descending-specificity": null,
    // CSS Modules의 `:global`/`:local`.
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global", "local"] }],
    // Vite는 `@import '패키지'`(문자열)로 npm 패키지 CSS를 푼다 — `url()`로 바꾸면 그 해석이 달라진다.
    "import-notation": "string",
    // `composes`·Radix의 `data-*` 상태 선택자 등 CSS Modules 관용구를 허용한다.
    "property-no-unknown": [true, { ignoreProperties: ["composes"] }],
  },
};
