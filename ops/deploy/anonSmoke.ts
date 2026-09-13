/**
 * 배포된 오리진에 **익명으로** 붙어 본다(→ ADR 0014).
 *
 * 앱에는 인증이 0이므로 Cloudflare Access가 유일한 게이트다. **익명 요청이 200을 받으면
 * 워크스페이스 전체가 공개된 것**이라 실패로 본다.
 *
 * 호스트 이름은 인자로 받는다 — **리포에 적지 않는다.** 실배포의 값은 이 기계의
 * `~/ARKA/secure/env/ade.env`의 `ADE_ORIGIN`에 있다.
 *
 *     pnpm --filter ops run test:smoke:anon "$ADE_ORIGIN"
 */
const origin = process.argv[2];
if (origin === undefined || origin === "") throw new Error("오리진 URL이 필요하다 — 예: https://<호스트>");

/** /api/*는 프로토콜 헤더가 있어야 통과한다(→ ADR 0017). */
const HEADERS = { "x-ade-protocol": "1" };
const PATHS = ["/api/files?path=", "/api/agent/sessions", "/"];

const check = async (path: string): Promise<boolean> => {
  // **리다이렉트를 따라가지 않는다.** 기본값(`follow`)이면 Access의 302가 로그인 페이지의 200으로
  // 바뀌어, 막혀 있는 것을 뚫린 것으로 읽는다 — 이 검사가 통째로 뒤집힌다.
  const { status } = await fetch(`${origin}${path}`, { headers: HEADERS, redirect: "manual" });
  if (status === 200) {
    console.error(`FAIL ${path}: 익명 요청이 200을 받았다 — 오리진 앞에 Access가 없다`);
    return false;
  }
  if (status === 302 || status === 401 || status === 403) {
    console.log(`ok   ${path}: ${String(status)}`);
    return true;
  }
  console.error(`FAIL ${path}: 예상 밖 ${String(status)}`);
  return false;
};

const results = await Promise.all(PATHS.map(check));
if (results.includes(false)) process.exit(1);
