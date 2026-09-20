import { act, fireEvent, render, screen } from "@testing-library/react";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { describe, expect, it } from "vitest";
import { Container } from "#core/di";
import { ContainerProvider, MissingContainerProviderError, useViewModel } from "#core/viewmodel";

declare module "#core/di" {
  interface InstanceMap {
    "test.workspaceViewModel": WorkspaceViewModel;
    "test.plainRegistry": PlainRegistry;
  }
}

interface WorkspaceViewModel {
  readonly openFileId: string | null;
  readonly isDirty: boolean;
  readonly label: string;
  openFile(fileId: string): void;
  markDirty(): void;
}

class WorkspaceViewModelImpl implements WorkspaceViewModel {
  openFileId: string | null = null;
  isDirty = false;
  readonly label = "workspace";

  constructor() {
    makeAutoObservable(this);
  }

  openFile(fileId: string): void {
    this.openFileId = fileId;
  }

  markDirty(): void {
    this.isDirty = true;
  }
}

class PlainRegistry {
  readonly items: readonly string[] = ["a", "b"];
}

const WorkspaceView = observer(function WorkspaceView() {
  const vm = useViewModel("test.workspaceViewModel");
  return (
    <button type="button" onClick={() => vm.openFile("readme.md")}>
      {vm.label}: {vm.openFileId ?? "none"}
      {vm.isDirty ? " *" : ""}
    </button>
  );
});

const setup = () => {
  const root = new Container();
  root.register("test.workspaceViewModel", "scoped", () => new WorkspaceViewModelImpl());
  return root.createChild("test");
};

describe("useViewModel", () => {
  it("VM 인스턴스를 꺼내 값을 그린다", () => {
    render(
      <ContainerProvider container={setup()}>
        <WorkspaceView />
      </ContainerProvider>,
    );

    expect(screen.getByRole("button").textContent).toBe("workspace: none");
  });

  it("VM 값이 바뀌면 observer가 다시 그린다", () => {
    render(
      <ContainerProvider container={setup()}>
        <WorkspaceView />
      </ContainerProvider>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button").textContent).toBe("workspace: readme.md");
  });

  it("필드가 여러 개여도 각각 정확한 값으로 반영한다", () => {
    const container = setup();
    const vm = container.resolve("test.workspaceViewModel");

    render(
      <ContainerProvider container={container}>
        <WorkspaceView />
      </ContainerProvider>,
    );
    act(() => vm.markDirty());
    expect(screen.getByRole("button").textContent).toBe("workspace: none *");

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("workspace: readme.md *");
  });

  it("다시 그려도 같은 인스턴스다 — 프록시도 캐시도 없다", () => {
    const container = setup();
    const seen: WorkspaceViewModel[] = [];
    const ProbeView = observer(function ProbeView() {
      const probed = useViewModel("test.workspaceViewModel");
      seen.push(probed);
      return <span>{probed.openFileId ?? "none"}</span>;
    });

    render(
      <ContainerProvider container={container}>
        <ProbeView />
      </ContainerProvider>,
    );
    act(() => container.resolve("test.workspaceViewModel").openFile("readme.md"));

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every((instance) => instance === seen[0])).toBe(true);
    expect(seen[0]).toBe(container.resolve("test.workspaceViewModel"));
  });

  it("겹친 ContainerProvider 안에서는 안쪽 컨테이너에서 꺼낸다", () => {
    const root = new Container();
    root.register("test.workspaceViewModel", "scoped", () => new WorkspaceViewModelImpl());
    const outer = root.createChild("outer");
    const inner = root.createChild("inner");
    inner.resolve("test.workspaceViewModel").openFile("inner.md");

    render(
      <ContainerProvider container={outer}>
        <ContainerProvider container={inner}>
          <WorkspaceView />
        </ContainerProvider>
      </ContainerProvider>,
    );

    expect(screen.getByRole("button").textContent).toBe("workspace: inner.md");
  });

  it("ViewModel이 아닌 것도 그대로 돌려준다", () => {
    const root = new Container();
    root.register("test.plainRegistry", "singleton", () => new PlainRegistry());
    const RegistryView = function RegistryView() {
      return <span>{useViewModel("test.plainRegistry").items.join(",")}</span>;
    };

    render(
      <ContainerProvider container={root}>
        <RegistryView />
      </ContainerProvider>,
    );

    expect(screen.getByText("a,b")).toBeTruthy();
  });

  it("ContainerProvider 밖에서 부르면 MissingContainerProviderError를 던진다", () => {
    expect(() => render(<WorkspaceView />)).toThrow(MissingContainerProviderError);
  });
});
