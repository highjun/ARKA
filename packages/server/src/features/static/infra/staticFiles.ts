import path from "node:path";
import fs from "node:fs";

/**
 * 빌드된 SPA 를 이 서버가 직접 내보낸다.
 *
 * 앞단에 nginx 를 세우지 않는 이유는 배포 규칙이다 — cloudflared 가 앱 컨테이너 **하나**에
 * 직결하므로(→ `compose.yml`), 정적 파일을 맡을 자리가 여기밖에 없다.
 *
 * 순수 함수로 둔다 — 라우트(`transport/staticRoutes.ts`)가 `dist/client` 경로를 채워 부를 뿐,
 * 여기 로직은 프레임워크와 무관하게 독립적으로 테스트한다(`staticFiles.test.ts`, 디스크
 * 없이 `exists` 함수를 주입한다).
 */

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

/** 모르는 확장자는 `application/octet-stream`이다 — 브라우저가 실행하지 않고 내려받는다. */
export const contentTypeFor = (filePath: string): string =>
  CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

/**
 * 이름에 내용 해시가 박힌 것만 영구 캐시한다.
 *
 * `index.html` 은 그 해시 이름들을 가리키는 표다 — 캐시되면 배포한 뒤에도 낡은 표가 살아남아
 * 이미 사라진 자산을 가리킨다.
 */
export const cacheControlFor = (relativePath: string): string =>
  relativePath.startsWith("assets") ? "public, max-age=31536000, immutable" : "no-store";

/**
 * URL 을 `root` 안의 절대경로로 바꾼다. 밖으로 나가면 `undefined`.
 *
 * 두 단계로 막는다 — ① 퍼센트 인코딩을 먼저 풀어서 `%2e%2e` 로 위장한 `..` 를 드러내고,
 * ② 정규화한 결과가 `root` 아래인지 확인한다. ① 만으로는 `/etc/passwd` 같은 절대경로를,
 * ② 만으로는 인코딩된 탈출을 놓친다.
 */
export const resolveWithin = (root: string, url: string): string | undefined => {
  const rawPath = url.split("?")[0] ?? "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // 깨진 퍼센트 인코딩
    return undefined;
  }
  if (decoded.includes("\0")) return undefined;

  const normalized = path.posix.normalize(decoded.startsWith("/") ? decoded : `/${decoded}`);
  // 선행 `/` 를 `.` 으로 바꿔 상대경로로 만든다 — 그러지 않으면 resolve 가 root 를 통째로 무시한다.
  const resolved = path.resolve(root, `.${normalized}`);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return undefined;
  return resolved;
};

/** 실재가 확인된 파일. `relativePath`는 캐시 정책을 고를 때 쓴다. */
export type StaticFile = { readonly filePath: string; readonly relativePath: string };

const onDisk = (candidate: string): boolean => fs.existsSync(candidate) && fs.statSync(candidate).isFile();

/**
 * 요청에 내보낼 파일을 고른다.
 *
 * 없는 경로를 `index.html` 로 떨어뜨리는 것은 **확장자가 없을 때뿐**이다. `/explorer/src` 같은
 * 클라이언트 라우트는 디스크에 없고 확장자도 없다.
 *
 * **확장자가 있으면 없는 대로 404 다.** 없는 `.js` 를 200 HTML 로 돌려주는 것은 그 자체로 틀렸다 —
 * 브라우저가 스크립트 자리에서 HTML 을 파싱하다 죽거나, 더 나쁘게는 조용히 실패한다. 실제로
 * 그렇게 당했다: 이 호스트명에 옛 PWA 가 남긴 `/sw.js` 를 브라우저가 갱신하려 할 때마다
 * `text/html` 이 돌아가 **업데이트가 실패하고 옛 Service Worker 가 영구히 살아남았다.**
 */
export const pickFile = (
  root: string,
  url: string,
  exists: (candidate: string) => boolean = onDisk,
): StaticFile | undefined => {
  const resolved = resolveWithin(root, url);
  if (resolved === undefined) return undefined;

  if (exists(resolved)) return { filePath: resolved, relativePath: path.relative(root, resolved) };
  if (path.extname(resolved) !== "") return undefined;

  const indexPath = path.join(root, "index.html");
  return exists(indexPath) ? { filePath: indexPath, relativePath: "index.html" } : undefined;
};

/**
 * 옛 Service Worker 를 걷어내는 스크립트.
 *
 * 이 호스트명에는 예전에 PWA 였던 앱이 있었고, 그 앱을 내린 뒤에도 사용자
 * 기기의 Service Worker 는 살아남아 같은 오리진 요청을 가로채 **옛 앱 셸을 계속 돌려준다.**
 * 배포를 내리는 것으로는 회수되지 않는다 — 서버가 할 수 있는 유일한 수단이 이것이다.
 *
 * `registerType: 'autoUpdate'` 라 브라우저가 방문마다 이 경로를 다시 받는다. 그때 이 스크립트를
 * 받으면 캐시를 비우고 스스로를 해제한 뒤 열린 탭을 새로고침한다. 한 번 돌면 끝난다.
 *
 * **지우지 않고 남긴다** — 언제 다시 방문할지 모르는 기기가 있으므로 기한을 정하지 않는다.
 */
export const KILL_SWITCH_SW = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;
