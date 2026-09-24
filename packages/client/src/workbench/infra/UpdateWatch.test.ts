import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IAppLifetime } from "../model/IAppLifetime";
import { createUpdateWatch } from "./UpdateWatch";

const lifetime = (): IAppLifetime & { readonly load: ReturnType<typeof vi.fn> } => ({
  isOutdated: false,
  isUpdateAvailable: false,
  builtAt: "",
  gitSha: "",
  load: vi.fn(() => Promise.resolve()),
  requestReload: () => undefined,
  onDidChange: () => ({ dispose: () => undefined }),
});

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
};

describe("createUpdateWatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("탭이 다시 보이면 서버에 묻는다", () => {
    const appLifetime = lifetime();
    const watch = createUpdateWatch({ appLifetime, interval: 1_000 });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(appLifetime.load).toHaveBeenCalledTimes(1);
    watch.dispose();
  });

  it("간격마다 묻되, 안 보이는 탭은 건너뛴다", () => {
    const appLifetime = lifetime();
    const watch = createUpdateWatch({ appLifetime, interval: 1_000 });

    vi.advanceTimersByTime(2_000);
    expect(appLifetime.load).toHaveBeenCalledTimes(2);

    setVisibility("hidden");
    vi.advanceTimersByTime(1_000);
    expect(appLifetime.load).toHaveBeenCalledTimes(2);
    watch.dispose();
  });

  it("dispose 뒤에는 아무것도 안 묻는다", () => {
    const appLifetime = lifetime();
    const watch = createUpdateWatch({ appLifetime, interval: 1_000 });
    watch.dispose();

    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(3_000);

    expect(appLifetime.load).not.toHaveBeenCalled();
  });
});
