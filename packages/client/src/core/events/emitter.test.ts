import { describe, expect, it, vi } from "vitest";
import { Emitter } from ".";

describe("Emitter", () => {
  it("구독자에게 값을 전달한다", () => {
    const emitter = new Emitter<number>();
    const listener = vi.fn();
    emitter.event(listener);

    emitter.fire(7);

    expect(listener).toHaveBeenCalledWith(7);
  });

  it("여러 구독자를 모두 부른다", () => {
    const emitter = new Emitter();
    const first = vi.fn();
    const second = vi.fn();
    emitter.event(first);
    emitter.event(second);

    emitter.fire();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("dispose하면 더 이상 받지 않는다", () => {
    const emitter = new Emitter();
    const listener = vi.fn();
    const subscription = emitter.event(listener);

    subscription.dispose();
    emitter.fire();

    expect(listener).not.toHaveBeenCalled();
  });

  it("리스너가 도중에 구독을 끊어도 순회가 깨지지 않는다", () => {
    const emitter = new Emitter();
    const second = vi.fn();
    const first: { subscription?: { dispose(): void } } = {};
    first.subscription = emitter.event(() => first.subscription?.dispose());
    emitter.event(second);

    expect(() => emitter.fire()).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("emitter를 dispose하면 모든 구독이 끊긴다", () => {
    const emitter = new Emitter();
    const listener = vi.fn();
    emitter.event(listener);

    emitter.dispose();
    emitter.fire();

    expect(listener).not.toHaveBeenCalled();
  });
});
