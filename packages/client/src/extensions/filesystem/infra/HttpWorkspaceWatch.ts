import { apiHeaders, readSse, sleep } from '#core/http';
import { WatchEvent } from '#contracts';
import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from '../model/IWorkspaceWatch';

/** 서버 재시작 등으로 스트림이 뜻하지 않게 끊기면 이만큼 쉬고 다시 붙는다. */
const RETRY_MS = 2_000;

/** `document` 중 여기서 쓰는 것만 — Node 타입만 있는 곳(test/contract)에서도 컴파일되게 DOM 타입을 피한다. */
type VisibilityDocument = {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
};
const documentOf = (): VisibilityDocument | null => ('document' in globalThis ? (globalThis as unknown as { document: VisibilityDocument }).document : null);

/**
 * 서버의 파일 변경 SSE(`/api/files/watch`)를 읽는 구현. 스트림 읽기는 `core/http/readSse`가 맡는다
 * (프레임 파싱·idle 타임아웃·abort). 여기는 재연결과 `WatchEvent` 해석만 한다.
 *
 * 배경에서 무기한 도는 구독이라 `watch()` 자신은 기다리지 않는다 — 연결·재연결은 안에서 알아서
 * 하고, 부르는 쪽은 해지 함수만 쥐고 있으면 된다.
 */
class HttpWorkspaceWatchAdapter implements IWorkspaceWatch {
  watch(paths: readonly string[], onChange: (changed: readonly string[]) => void): WorkspaceWatchUnsubscribe {
    if (paths.length === 0) return () => undefined;
    const controller = new AbortController();
    void this.#loop(paths, onChange, controller);
    return () => controller.abort();
  }

  /**
   * 끊기면(서버 재시작, 네트워크 흔들림, idle 타임아웃) 해지되지 않은 한 다시 붙는다.
   *
   * 시도마다 별도 `AbortController`(`attempt`)를 두고 바깥 `controller`(구독 전체 해지)의 abort를
   * 그쪽으로 전달한다 — 포그라운드로 돌아올 때 "지금 시도만 끊고 다시 붙는다"(`visibilitychange`)와
   * "완전히 해지한다"를 같은 메커니즘으로 다루면서 구분할 수 있다.
   */
  async #loop(paths: readonly string[], onChange: (changed: readonly string[]) => void, controller: AbortController): Promise<void> {
    const query = new URLSearchParams();
    for (const path of paths) query.append('path', path);
    const url = `/api/files/watch?${query.toString()}`;

    let attempt: AbortController | null = null;
    const doc = documentOf();
    const onVisible = (): void => {
      if (doc?.visibilityState === 'visible') attempt?.abort();
    };
    doc?.addEventListener('visibilitychange', onVisible);

    try {
      for (;;) {
        if (controller.signal.aborted) return;
        attempt = new AbortController();
        const forwardAbort = (): void => attempt?.abort();
        controller.signal.addEventListener('abort', forwardAbort, { once: true });
        try {
          await readSse(url, { headers: apiHeaders(), signal: attempt.signal }, (data) => {
            const changed = parse(data);
            // 빈 배열은 하트비트다 — 실제 변경이 아니므로 onChange를 부르지 않는다.
            if (changed !== null && changed.length > 0) onChange(changed);
          });
        } catch {
          // 연결 실패거나 중간에 끊겼다(idle 타임아웃·visibility 강제 재연결 포함) — 해지된 게 아니면 아래서 다시 시도한다.
        } finally {
          controller.signal.removeEventListener('abort', forwardAbort);
        }
        if (controller.signal.aborted) return;
        await sleep(RETRY_MS, controller.signal);
      }
    } finally {
      doc?.removeEventListener('visibilitychange', onVisible);
    }
  }
}

/** 프레임 하나를 경로 목록으로. 깨진 프레임은 `null` — 하나 때문에 스트림을 끊지 않는다. */
const parse = (data: string): readonly string[] | null => {
  try {
    const event = WatchEvent.safeParse(JSON.parse(data));
    return event.success ? event.data.paths : null;
  } catch {
    return null;
  }
};

/** `IWorkspaceWatch`의 실제 구현(`HttpWorkspaceWatchAdapter`)을 만든다. */
export const createWorkspaceWatchPort = (): IWorkspaceWatch => new HttpWorkspaceWatchAdapter();
