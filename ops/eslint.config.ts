import ops from "./lint/index.ts";

/** 작업장 자신도 검사한다 — 저장소를 검사하는 코드가 검사를 안 받으면 앞뒤가 안 맞는다. */
export default [
  /*
   * **`figma/`는 검사하지 않는다.** Figma 플러그인 샌드박스 안에서 도는 코드라 `figma` 전역이
   * 있고 모듈 시스템이 없다 — 여기 규칙은 그런 코드를 모른다. 그 자리는 `figma/README.md`가 든다.
   */
  { ignores: ["figma/**"] },
  ...ops.configs.base,
  {
    /*
     * **`allowDefaultProject`를 되돌린다.** 바탕은 `eslint.config.ts`가 어느 tsconfig에도
     * 없다고 보는데(패키지들이 일부러 뺐다 — → ADR 0001의 대가), `ops`는 자기 폴더의 TypeScript를 전부
     * 담아 자기 설정 파일도 타입 검사를 받는다. 둘 다면 파서가 거부한다.
     */
    files: ["**/*.ts"],
    languageOptions: { parserOptions: { projectService: true } },
  },
];
