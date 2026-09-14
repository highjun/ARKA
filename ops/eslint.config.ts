import ops from "./lint/index.ts";

/** 작업장 자신도 검사한다 — 저장소를 검사하는 코드가 검사를 안 받으면 앞뒤가 안 맞는다. */
export default [
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
