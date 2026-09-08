import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cacheControlFor, contentTypeFor, KILL_SWITCH_SW, pickFile, resolveWithin } from './staticFiles';

const ROOT = '/app/dist';
/** 디스크 대신 이 목록에 있으면 존재하는 것으로 친다. */
const having =
  (...files: string[]) =>
  (candidate: string): boolean =>
    files.map((f) => path.join(ROOT, f)).includes(candidate);

describe('resolveWithin — 경로 탈출 방어', () => {
  it('평범한 경로는 root 아래로 푼다', () => {
    expect(resolveWithin(ROOT, '/assets/index-abc.js')).toBe('/app/dist/assets/index-abc.js');
  });

  it('쿼리스트링을 떼고 본다', () => {
    expect(resolveWithin(ROOT, '/index.html?v=2')).toBe('/app/dist/index.html');
  });

  it('평문 .. 로 root 를 벗어날 수 없다', () => {
    // normalize 가 `/../..` 를 `/` 로 접으므로 root 안에 머문다 — 뚫리지 않는다.
    expect(resolveWithin(ROOT, '/../../etc/passwd')).toBe('/app/dist/etc/passwd');
  });

  it('퍼센트 인코딩으로 위장한 .. 도 막는다', () => {
    expect(resolveWithin(ROOT, '/..%2f..%2fetc%2fpasswd')).toBe('/app/dist/etc/passwd');
  });

  it('깨진 퍼센트 인코딩은 거부한다', () => {
    expect(resolveWithin(ROOT, '/%')).toBeUndefined();
  });

  it('널 바이트는 거부한다', () => {
    expect(resolveWithin(ROOT, '/index.html%00.png')).toBeUndefined();
  });

  it('root 자신은 허용한다 — 접두사 검사가 / 를 잘라내지 않는다', () => {
    expect(resolveWithin(ROOT, '/')).toBe(ROOT);
  });

  it('어떤 .. 조합을 넣어도 root 밖 경로가 나오지 않는다', () => {
    // normalize 가 resolve 보다 먼저 `..` 를 접기 때문에, URL 로는 root 를 벗어날 수 없다.
    // resolveWithin 의 접두사 검사는 그 뒤에 놓인 두 번째 그물이라 여기서 걸릴 입력이 없다.
    for (const url of ['/..', '/../..', '/a/../../..', '/./../%2e%2e/', '//../etc']) {
      const resolved = resolveWithin(ROOT, url);
      expect(resolved).toBeDefined();
      expect(resolved === ROOT || resolved!.startsWith(`${ROOT}/`)).toBe(true);
    }
  });
});

describe('pickFile', () => {
  it('있는 파일을 그대로 고른다', () => {
    expect(pickFile(ROOT, '/assets/a.js', having('assets/a.js', 'index.html'))).toEqual({
      filePath: '/app/dist/assets/a.js',
      relativePath: 'assets/a.js',
    });
  });

  it('없는 라우트는 index.html 로 떨어진다 — 클라이언트 라우팅', () => {
    expect(pickFile(ROOT, '/explorer/src', having('index.html'))?.relativePath).toBe('index.html');
  });

  it('확장자가 있으면 없는 대로 404 다 — HTML 을 스크립트로 받으면 화면이 죽는다', () => {
    expect(pickFile(ROOT, '/assets/gone.js', having('index.html'))).toBeUndefined();
    expect(pickFile(ROOT, '/gone.js', having('index.html'))).toBeUndefined();
    expect(pickFile(ROOT, '/manifest.webmanifest', having('index.html'))).toBeUndefined();
    expect(pickFile(ROOT, '/favicon.ico', having('index.html'))).toBeUndefined();
  });

  it('/sw.js 를 index.html 로 삼키지 않는다 — 이걸 삼켜서 옛 Service Worker 가 영구히 남았다', () => {
    // 브라우저는 SW 스크립트가 JS MIME 이 아니면 업데이트를 실패로 처리하고 기존 SW 를 유지한다.
    // 즉 여기서 HTML 이 나가면 회수 수단 자체가 막힌다.
    expect(pickFile(ROOT, '/sw.js', having('index.html'))).toBeUndefined();
  });

  it('새 PWA 의 app-sw.js/manifest.webmanifest 는 실존하면 그대로 서빙된다 — kill-switch(/sw.js)와 별도 경로', () => {
    expect(pickFile(ROOT, '/app-sw.js', having('app-sw.js', 'index.html'))?.relativePath).toBe('app-sw.js');
    expect(pickFile(ROOT, '/manifest.webmanifest', having('manifest.webmanifest', 'index.html'))?.relativePath).toBe(
      'manifest.webmanifest',
    );
  });

  it('dist 가 통째로 없으면 undefined — 개발 중 정상 상태다', () => {
    expect(pickFile(ROOT, '/', having())).toBeUndefined();
  });
});

describe('헤더', () => {
  it('해시 이름이 박힌 assets 만 영구 캐시한다', () => {
    expect(cacheControlFor('assets/index-abc.js')).toBe('public, max-age=31536000, immutable');
    expect(cacheControlFor('index.html')).toBe('no-store');
  });

  it('확장자로 content-type 을 정하고, 모르면 octet-stream 이다', () => {
    expect(contentTypeFor('/x/index.html')).toBe('text/html; charset=utf-8');
    expect(contentTypeFor('/x/a.JS')).toBe('text/javascript; charset=utf-8');
    expect(contentTypeFor('/x/a.bin')).toBe('application/octet-stream');
  });

  it('.webmanifest 는 manifest MIME 이다', () => {
    expect(contentTypeFor('/manifest.webmanifest')).toBe('application/manifest+json; charset=utf-8');
  });
});

describe('kill-switch service worker', () => {
  it('스스로를 해제하고 캐시를 비운다 — 옛 PWA 를 회수하는 유일한 서버 수단이다', () => {
    expect(KILL_SWITCH_SW).toContain('self.registration.unregister()');
    expect(KILL_SWITCH_SW).toContain('caches.delete');
  });

  it('기다리지 않고 즉시 활성화된다 — 다음 방문 한 번으로 끝나야 한다', () => {
    expect(KILL_SWITCH_SW).toContain('skipWaiting');
  });

  it('해제 뒤 열린 탭을 새로고침한다 — 그러지 않으면 그 탭은 계속 옛 화면이다', () => {
    expect(KILL_SWITCH_SW).toContain('client.navigate');
  });
});
