import { readSse, sleep } from "#core/http";
import { WatchEvent, protocolHeaders } from "#contracts";
import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from "../model/IWorkspaceWatch";

const RETRY_MS = 2_000;

type VisibilityDocument = {
  readonly visibilityState: string;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};
const documentOf = (): VisibilityDocument | null =>
  "document" in globalThis ? (globalThis as unknown as { document: VisibilityDocument }).document : null;

class HttpWorkspaceWatchAdapter implements IWorkspaceWatch {
  watch(paths: readonly string[], onChange: (changed: readonly string[]) => void): WorkspaceWatchUnsubscribe {
    if (paths.length === 0) return () => undefined;
    const controller = new AbortController();
    void this.#loop(paths, onChange, controller);
    return () => controller.abort();
  }

  async #loop(
    paths: readonly string[],
    onChange: (changed: readonly string[]) => void,
    controller: AbortController,
  ): Promise<void> {
    const query = new URLSearchParams();
    for (const path of paths) query.append("path", path);
    const url = `/api/files/watch?${query.toString()}`;

    let attempt: AbortController | null = null;
    const doc = documentOf();
    const onVisible = (): void => {
      if (doc?.visibilityState === "visible") attempt?.abort();
    };
    doc?.addEventListener("visibilitychange", onVisible);

    try {
      for (;;) {
        if (controller.signal.aborted) return;
        attempt = new AbortController();
        const forwardAbort = (): void => attempt?.abort();
        controller.signal.addEventListener("abort", forwardAbort, { once: true });
        try {
          await readSse(url, { headers: protocolHeaders(), signal: attempt.signal }, (data) => {
            const changed = parse(data);
            if (changed !== null && changed.length > 0) onChange(changed);
          }).catch(() => undefined);
        } finally {
          controller.signal.removeEventListener("abort", forwardAbort);
        }
        if (controller.signal.aborted) return;
        await sleep(RETRY_MS, controller.signal);
      }
    } finally {
      doc?.removeEventListener("visibilitychange", onVisible);
    }
  }
}

const parse = (data: string): readonly string[] | null => {
  try {
    const event = WatchEvent.safeParse(JSON.parse(data));
    return event.success ? event.data.paths : null;
  } catch {
    return null;
  }
};

export const createWorkspaceWatchPort = (): IWorkspaceWatch => new HttpWorkspaceWatchAdapter();
