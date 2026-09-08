import { apiHeaders } from '#core/http';
import { WatchEvent } from 'contracts';
import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from '../model/IWorkspaceWatch';

/**
 * 세션 서버(`server/watch.ts`)의 SSE 를 읽는 구현.
 *
 * `EventSource` 를 쓰지 않는다 — 프로토콜 헤더(→ ADR 0017)를 실어야 하는데 `EventSource` 는 헤더를
 * 붙일 수 없다.
 *
 * 배경에서 무기한 도는 구독이라 `watch()` 자신은 기다리지 않는다 — 연결·재연결은 안에서 알아서
 * 하고, 부르는 쪽은 해지 함수만 쥐고 있으면 된다.
 */
class HttpWorkspaceWatchAdapter implements IWorkspaceWatch {
  /** 서버 재시작 등으로 스트림이 뜻하지 않게 끊기면 이만큼 쉬고 다시 붙는다. */
  static readonly #RETRY_MS = 2_000;

  /**
   * 이 시간 안에 아무 프레임(하트비트 포함)도 못 받으면 연결이 조용히 죽었다고 본다.
   * 서버 하트비트 간격(15초, `server/watch/watch.controller.ts`)의 3배 여유 — 코얼레싱·
   * 네트워크 지연을 감안해도 넉넉하다. 모바일 통신사 NAT/프록시가 트래픽 없는 연결을 FIN
   * 없이 조용히 끊는 경우, `reader.read()` 만으로는 영원히 알아챌 수 없어서 필요하다.
   */
  static readonly #IDLE_TIMEOUT_MS = 45_000;

  watch(paths: readonly string[], onChange: (changed: readonly string[]) => void): WorkspaceWatchUnsubscribe {
    if (paths.length === 0) return () => undefined;

    const controller = new AbortController();
    void this.#loop(paths, onChange, controller);
    return () => controller.abort();
  }

  /**
   * 연결이 끊기면(서버 재시작, 네트워크 흔들림, idle-timeout) 해지되지 않은 한 다시 붙는다 —
   * 배경 기능이라 실패가 눈에 안 띄므로 스스로 복구하는 것이 중요하다. `#sleep` 이 대기 중에도
   * 해지를 즉시 반영하므로, 재시도 대기 중에 해지해도 다음 요청이 나가지 않는다.
   *
   * 시도마다 별도 `AbortController`(`attempt`)를 두고 바깥 `controller`(구독 전체 해지)의
   * abort를 그쪽으로 전달한다 — 그래야 "포그라운드 복귀 시 지금 시도만 강제로 끊고 다시
   * 붙는다"(아래 `visibilitychange`)와 "완전히 해지한다"를 같은 메커니즘으로 다루면서도
   * 서로 구분할 수 있다.
   */
  async #loop(
    paths: readonly string[],
    onChange: (changed: readonly string[]) => void,
    controller: AbortController,
  ): Promise<void> {
    let attempt: AbortController | null = null;
    // 포그라운드로 돌아오면 지금 시도를 무조건 끊고 다시 붙는다 — "얼마나 지났는지" 추적하는
    // 상태를 따로 안 든다, 재연결 자체가 저렴하다(RETRY_MS 뒤 재시도).
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') attempt?.abort();
    };
    document.addEventListener('visibilitychange', onVisible);

    try {
      for (;;) {
        if (controller.signal.aborted) return;
        attempt = new AbortController();
        const forwardAbort = (): void => attempt?.abort();
        controller.signal.addEventListener('abort', forwardAbort, { once: true });
        try {
          await this.#connect(paths, onChange, attempt.signal);
        } catch {
          // 연결 실패거나 중간에 끊겼다(idle-timeout·visibility 강제 재연결 포함) — 해지된
          // 게 아니면 아래서 다시 시도한다.
        } finally {
          controller.signal.removeEventListener('abort', forwardAbort);
        }
        if (controller.signal.aborted) return;
        await this.#sleep(HttpWorkspaceWatchAdapter.#RETRY_MS, controller.signal);
      }
    } finally {
      document.removeEventListener('visibilitychange', onVisible);
    }
  }

  async #connect(
    paths: readonly string[],
    onChange: (changed: readonly string[]) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const query = new URLSearchParams();
    for (const path of paths) query.append('path', path);

    const response = await fetch(`/api/files/watch?${query.toString()}`, { headers: apiHeaders(), signal });
    if (!response.ok) throw new Error(`감시 연결이 실패했다 (${String(response.status)}).`);
    if (!response.body) throw new Error('감시 응답에 본문이 없다.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const chunk = await this.#readWithIdleTimeout(reader, signal);
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      // SSE 는 빈 줄로 프레임을 가른다. 마지막 조각은 아직 안 끝났을 수 있어 버퍼에 남긴다.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const changed = this.#parse(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        // 빈 배열은 하트비트다(`server/watch/watch.controller.ts`) — 실제 변경이 아니므로
        // onChange를 부르지 않는다. `watchPaths`는 실제 변경이 있을 때만 부르므로 진짜
        // 변경이 빈 배열로 오는 경우는 없다.
        if (changed && changed.length > 0) onChange(changed);
        boundary = buffer.indexOf('\n\n');
      }
    }
  }

  /**
   * `reader.read()`가 idle-timeout 안에 안 끝나면 연결을 죽었다고 보고 던진다. 매 반복마다
   * 새로 거는 것이라(반복 자체가 "다음 프레임을 기다린다"는 뜻) 프레임을 받을 때마다 자연히
   * 다시 시작된다 — 별도로 "마지막으로 받은 시각"을 추적할 필요가 없다.
   *
   * `signal`도 같이 경쟁시킨다 — `reader.read()` 자신은 abort를 안 듣는다(`fetch`의 `signal`은
   * 최초 연결에만 걸리고, 이미 열린 스트림의 개별 read를 끊지는 않는다). `visibilitychange`로
   * 지금 시도를 강제로 끊을 때(`#loop`) 이 경쟁이 없으면 이미 걸려 있는 `reader.read()`가
   * 끝나지 않아 강제 재연결이 실제로는 아무 효과가 없다.
   */
  async #readWithIdleTimeout(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
  ): Promise<ReadableStreamReadResult<Uint8Array>> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('감시 연결이 idle 상태로 방치됐다.')), HttpWorkspaceWatchAdapter.#IDLE_TIMEOUT_MS);
    });
    const aborted = new Promise<never>((_, reject) => {
      if (signal.aborted) {
        reject(new Error('감시 연결이 해지됐다.'));
        return;
      }
      onAbort = () => reject(new Error('감시 연결이 해지됐다.'));
      signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      return await Promise.race([reader.read(), timeout, aborted]);
    } catch (error) {
      // 죽었다고 판단한 연결을 실제로 끊는다 — 안 그러면 새 연결을 여는 동안 좀비 연결이 하나 더 쌓인다.
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      clearTimeout(timer);
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
  }

  /** 대기 중에 해지되면 남은 시간을 기다리지 않고 즉시 풀린다 — 그래야 재시도가 새지 않는다. */
  async #sleep(ms: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }


  #parse(frame: string): readonly string[] | null {
    const payload = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('');
    if (payload === '') return null;

    try {
      const event = WatchEvent.safeParse(JSON.parse(payload));
      return event.success ? event.data.paths : null;
    } catch {
      // 깨진 프레임 하나 때문에 스트림 전체를 끊지 않는다 — 다음 프레임이 정상일 수 있다.
      return null;
    }
  }
}

/** `IWorkspaceWatch`의 실제 구현(`HttpWorkspaceWatchAdapter`)을 만든다. */
export const createWorkspaceWatchPort = (): IWorkspaceWatch => new HttpWorkspaceWatchAdapter();
