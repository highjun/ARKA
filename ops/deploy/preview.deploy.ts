import { DeploySpec } from "./spec.ts";

/**
 * **PR 미리보기의 스펙.** 실배포와 갈라 두는 것 자체가 방어다.
 *
 * `ade.deploy.ts`는 `/home/highjun/ARKA`(사용자의 개인 지식 디렉터리 전체)를 마운트한다.
 * 미리보기는 **PR의 코드가 도는 자리**라 그것을 절대 붙이지 않는다 — 파일이 갈려 있으면
 * 실수로 섞일 길이 없다.
 */

const number = process.env["ADE_PREVIEW_PR"];
if (number === undefined || !/^[0-9]+$/u.test(number)) {
  throw new Error(`ADE_PREVIEW_PR에 PR 번호가 필요합니다 (받은 값: ${String(number)})`);
}

const workspace = process.env["ADE_PREVIEW_WORKSPACE"];
if (workspace === undefined) throw new Error("ADE_PREVIEW_WORKSPACE에 워크스페이스 경로가 필요합니다");

/**
 * PR 하나의 미리보기.
 *
 * 호스트 이름을 **점이 아니라 하이픈**으로 잇는다 — 무료 인증서가 한 단계 와일드카드만
 * 덮으므로 `pr-12.arka.sangjun.dev`는 TLS가 서지 않는다.
 */
export const previewDeploy: DeploySpec = DeploySpec.parse({
  name: `pr-${number}`,
  hostname: `pr-${number}-arka.${process.env["PREVIEW_DOMAIN"] ?? "sangjun.dev"}`,
  image: `ade:pr-${number}`,
  port: 3000,
  healthPath: "/api/health",

  // **워크스페이스는 그 PR의 체크아웃 사본이다.** 비워 두면 파일 트리와 소스 제어 탭이
  // 볼 것이 없어 미리보기의 값이 크게 준다.
  mounts: [{ source: workspace, target: "/workspace", readOnly: false }],

  // `/data`를 마운트하지 않는다 — 이미지의 `VOLUME`이 익명 볼륨을 만들어 주므로
  // **PR별 SQLite가 저절로 갈리고**, `down -v`가 함께 지운다.

  // 실배포와 같은 사람만 들어온다. 미리보기라고 문을 열어 두지 않는다.
  accessEmails: ["highjun10170@gmail.com"],
});
