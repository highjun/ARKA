const origin = process.argv[2];
if (origin === undefined || origin === "") throw new Error("오리진 URL이 필요하다 — 예: https://<호스트>");

const HEADERS = { "x-arka-protocol": "1" };
const PATHS = ["/api/files?path=", "/api/agent/sessions", "/"];

const check = async (path: string): Promise<boolean> => {
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
