import primer from "@primer/stylelint-config";

/*
 * 프리셋의 `browser-compat` 설정에 **점진적 향상 셋만 더한다**. 셋 다 없으면 조용히 안 걸리는
 * 속성이라 깨지는 화면이 없다 — 높이 애니메이션이 빠지고, 보통 줄바꿈으로 돌아가고, WebKit
 * 밖에선 탭 강조가 원래 없다. 규칙을 끄지 않는 이유는 **다음 속성은 잡혀야** 해서다.
 */
const [level, options] = primer.rules["plugin/browser-compat"] as [boolean, { allow: { features: string[] } }];
const browserCompat = [
  level,
  {
    ...options,
    allow: {
      ...options.allow,
      features: [
        ...options.allow.features,
        "properties.interpolate-size",
        "properties.text-wrap",
        "properties.-webkit-tap-highlight-color",
      ],
    },
  },
];

/**
 * CSS Modules의 규율.
 *
 * 값은 Primer 토큰 변수(`--fgColor-*`, `--space-*`, `--borderRadius-*` …)를 참조한다 — 색을
 * 직접 적으면 라이트/다크가 갈리는 순간 한쪽이 깨진다. 규칙마다 `message`로 대안을 적는다.
 */
export default {
  extends: ["stylelint-config-standard", "@primer/stylelint-config"],
  // **검사 대상은 여기가 정한다** — 스크립트는 `"**/*.css"`만 넘긴다. 점 폴더는 stylelint가 기본으로
  // 건너뛰지만 그래도 적어 둔다: 그 동작이 바뀌면 번들 CSS가 쏟아진다(직접 주면 5122건).
  ignoreFiles: ["**/node_modules/**", "**/.output/**"],
  overrides: [
    {
      // 리셋과 마크다운 렌더러는 **원소 자체**를 스타일한다 — 리셋은 그것이 정의이고, 마크다운은
      // 그려지는 원소를 우리가 만들지 않아서(렌더러가 낸다) 클래스를 붙일 자리가 없다. GitHub의
      // `markdown-body`도 같은 모양이다. 컴포넌트 CSS에는 이 규칙이 그대로 걸린다.
      files: ["src/workbench/reset.css", "src/shared/component/Markdown/Markdown.module.css"],
      rules: { "selector-max-type": null, "selector-max-id": null, "selector-max-specificity": null },
    },
  ],
  rules: {
    // Primer 자신의 `--space-*` 토큰(primitives 11에 정의돼 있고 문서 주석까지 달려 있다)을 이
    // 규칙이 거부한다 — 규칙이 그 토큰 세트보다 낡았다. 값·간격 토큰은 `primer/colors` 등
    // 나머지 규칙과 리뷰가 본다.
    "primer/spacing": null,
    // 토큰 정의가 `@primer/primitives`의 CSS 안에 있어서 이 규칙이 해석하지 못한다 — 우리
    // 파일에 없는 이름을 전부 미지의 것으로 본다(172건). 실재 여부는 타입이 아니라 브라우저가
    // 판정하고, 없는 토큰은 값이 비어 화면에서 즉시 드러난다(2026-08-23에 그렇게 발견했다).
    "csstools/value-no-unknown-custom-properties": null,
    "color-no-hex": [
      true,
      { message: "색을 직접 적지 마세요 — Primer 토큰(`var(--fgColor-*)`, `var(--bgColor-*)`)을 참조하세요." },
    ],
    "color-named": ["never", { message: "색 이름을 쓰지 마세요 — Primer 토큰을 참조하세요." }],
    "function-disallowed-list": [
      ["rgb", "rgba", "hsl", "hsla"],
      {
        message:
          "색 함수를 직접 쓰지 마세요 — Primer 토큰을 참조하세요. 투명도가 필요하면 `--overlay-*`·`--*-muted` 토큰이 있습니다.",
      },
    ],
    // CSS Modules의 클래스명·keyframes 이름은 JS 식별자다(`styles['brandGroup']`) — kebab-case 강제를 끈다.
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    // Primer 토큰이 camelCase다(`--fgColor-default`). 우리가 정한 이름이 아니라 검사 대상이 아니다.
    "custom-property-pattern": null,
    // 컴포넌트마다 파일이 갈리는 CSS Modules에서는 특이도 순서가 파일 간에 의미가 없다.
    "no-descending-specificity": null,
    /*
     * 점진적 향상 셋을 허용 목록에 **더한다**. 통째로 덮으면 프리셋의 `partialImplementation`·
     * `browserslist`까지 사라져 `resize` 같은 것이 새로 뜬다(2026-09-14 실측).
     */
    "plugin/browser-compat": browserCompat,
    // CSS Modules의 `:global`/`:local`.
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global", "local"] }],
    // Vite는 `@import '패키지'`(문자열)로 npm 패키지 CSS를 푼다 — `url()`로 바꾸면 그 해석이 달라진다.
    "import-notation": "string",
    // `composes`·Radix의 `data-*` 상태 선택자 등 CSS Modules 관용구를 허용한다.
    "property-no-unknown": [true, { ignoreProperties: ["composes"] }],
  },
};
