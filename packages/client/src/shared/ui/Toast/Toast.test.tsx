import { composeStories } from "@storybook/react-vite";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from "#lib/testing";
import { Button } from "@primer/react";
import { Toast } from "./Toast";
import * as stories from "./Toast.stories";

const { Default } = composeStories(stories);

describe("Toast", () => {
  implementsClassName((extra) => <Toast {...extra} />);
  implementsDataComponent((extra) => <Toast {...extra} />, "Toast");
  implementsRef((extra) => <Toast {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => (
    <Toast>
      <Toast.Item severity="info" message="저장했다" />
    </Toast>
  ));

  it("`Default` 스토리는 줄 셋을 쌓는다", () => {
    render(<Default />);

    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("action을 주면 동작 단추를 아래에 둔다", () => {
    render(
      <Toast>
        <Toast.Item
          severity="error"
          message="저장하지 못했다"
          action={
            <Button size="small" variant="invisible">
              다시 시도
            </Button>
          }
        />
      </Toast>,
    );

    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("×를 누르면 알린다 — 지우는 것은 받는 쪽이 한다", () => {
    const onDismiss = vi.fn();
    render(
      <Toast>
        <Toast.Item severity="info" message="저장했다" onDismiss={onDismiss} />
      </Toast>,
    );

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("쌓는 자리를 `data-placement`로 드러낸다", () => {
    const { container } = render(<Toast placement="bottom-left" />);

    expect(container.querySelector('[data-placement="bottom-left"]')).toBeInTheDocument();
  });

  describe("수명", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("`timeout`을 주면 그만큼 뒤에 스스로 닫는다", () => {
      const onDismiss = vi.fn();
      render(<Toast.Item severity="info" message="저장했다" timeout={3000} onDismiss={onDismiss} />);
      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("`onTimeout`을 주면 시계는 그쪽으로 간다 — ×와 구별된다", () => {
      const onDismiss = vi.fn();
      const onTimeout = vi.fn();
      render(
        <Toast.Item severity="info" message="저장했다" timeout={3000} onDismiss={onDismiss} onTimeout={onTimeout} />,
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("`timeout`이 없으면 시계가 안 돈다 — ×로만 닫힌다", () => {
      const onDismiss = vi.fn();
      render(<Toast.Item severity="error" message="터졌다" onDismiss={onDismiss} />);

      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
