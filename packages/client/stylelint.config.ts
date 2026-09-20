import primer from "@primer/stylelint-config";

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

export default {
  extends: ["stylelint-config-standard", "@primer/stylelint-config"],
  ignoreFiles: ["**/node_modules/**", "**/.output/**"],
  overrides: [
    {
      files: ["src/workbench/reset.css", "src/shared/component/Markdown/Markdown.module.css"],
      rules: { "selector-max-type": null, "selector-max-id": null, "selector-max-specificity": null },
    },
  ],
  rules: {
    "primer/spacing": null,
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
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    "custom-property-pattern": null,
    "no-descending-specificity": null,
    "plugin/browser-compat": browserCompat,
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global", "local"] }],
    "import-notation": "string",
    "property-no-unknown": [true, { ignoreProperties: ["composes"] }],
  },
};
