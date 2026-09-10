import path from "node:path";
import type { Rule } from "eslint";

/** 디렉터리: camelCase, 또는 컴포넌트 폴더처럼 그 안의 주인 이름을 딴 PascalCase. 하이픈·밑줄은 없다. */
const DIRECTORY = /^[a-zA-Z][a-zA-Z0-9]*$/u;
/**
 * 파일: 클래스·React 컴포넌트·계약(`I<Name>`)은 PascalCase, 함수 모듈은 camelCase.
 * 점으로 이어지는 꼬리(`.test`, `.stories`, `.module`, `.contract`, `.d`)는 소문자다.
 */
const FILE = /^(?:[A-Z][A-Za-z0-9]*|[a-z][A-Za-z0-9]*)(?:\.[a-z][a-z0-9]*)*\.(?:ts|tsx|css|json)$/u;

/**
 * 파일·폴더 이름 규칙(→ ADR 0005·0007).
 *
 * 문장을 실측에 맞춰 만든 규칙이다 — "camelCase, React 컴포넌트만 PascalCase"는 위반이 55건이었는데
 * 규칙성이 있었다(클래스 파일은 PascalCase, 계약은 `I<Name>.ts`, 함수 모듈은 camelCase). 코드
 * 36건을 고치는 것보다 문장을 고치는 쪽이 맞았다.
 *
 * 실측: `model/`·`viewmodel/`·`infra/`의 클래스 파일은 PascalCase, 계약은 `I<Name>.ts`, 함수 모듈은
 * camelCase였다 — kebab-case와 snake_case만 없었다. 그 관행을 그대로 규칙으로 만든다.
 * 검사 대상은 `src/` 아래 경로다. 저장소 밖 규약(`index.html`, 설정 파일)은 대상이 아니다.
 */
export const fileNames: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "src/ 아래 파일·폴더 이름은 camelCase/PascalCase다" },
    messages: {
      directory: "폴더 이름 `{{name}}`에 하이픈·밑줄을 쓰지 않습니다 — camelCase(`viewmodel`) 또는 컴포넌트 폴더의 PascalCase(`FileTree`).",
      file: "파일 이름 `{{name}}`은 PascalCase(클래스·컴포넌트·계약 `I<Name>`) 또는 camelCase(함수 모듈)여야 합니다. 꼬리(`.test`·`.stories`·`.module`)는 소문자입니다.",
    },
    schema: [],
  },
  create(context) {
    const relative = path.relative(context.cwd, context.filename).split(path.sep);
    const src = relative.indexOf("src");
    if (src === -1) return {};
    const segments = relative.slice(src + 1);
    const file = segments.pop() ?? "";
    return {
      Program(node) {
        for (const directory of segments) {
          if (!DIRECTORY.test(directory)) {
            context.report({ node, messageId: "directory", data: { name: directory } });
            return;
          }
        }
        if (!FILE.test(file)) context.report({ node, messageId: "file", data: { name: file } });
      },
    };
  },
};
