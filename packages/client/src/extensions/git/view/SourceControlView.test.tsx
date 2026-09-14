import { createContainer, scoped, singleton } from "#core/di";
import { ViewModelProvider } from "#core/viewmodel";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GitModel } from "../model/GitModel";
import { GitModelToken } from "../model/IGitModel";
import { MockGitService } from "../model/MockGitService";
import { SourceControlViewModelToken } from "../viewmodel/ISourceControlViewModel";
import { SourceControlViewModel } from "../viewmodel/SourceControlViewModel";
import { DiffTabView } from "./DiffTabView";
import { SourceControlView } from "./SourceControlView";

const mount = async (onOpenTab = vi.fn(), withDiff: string | null = null) => {
  const service = new MockGitService();
  service.write("a.txt", "one\n");
  await service.stage(["a.txt"]);
  await service.commit("init");
  service.write("a.txt", "two\n");
  const container = createContainer("test");
  container.register(
    GitModelToken,
    singleton(() => new GitModel({ gitService: service })),
  );
  container.register(
    SourceControlViewModelToken,
    scoped((c) => new SourceControlViewModel({ gitModel: c.resolve(GitModelToken) })),
  );
  render(
    <ViewModelProvider container={container.createScope("view")}>
      <SourceControlView onOpenTab={onOpenTab} />
      {withDiff === null ? null : <DiffTabView tabId={withDiff} />}
    </ViewModelProvider>,
  );
  return { onOpenTab };
};

describe("SourceControlView", () => {
  it("변경을 나열하고, 스테이지하고, 커밋한다", async () => {
    await mount();
    expect(await screen.findByText("main")).toBeInTheDocument();
    expect(await screen.findByText("a.txt")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "a.txt 스테이지" }));
    });
    expect(await screen.findByRole("button", { name: "a.txt 해제" })).toBeInTheDocument();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("커밋 메시지"), { target: { value: "둘" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "커밋" }));
    });
    expect(await screen.findByText(/커밋됨/u)).toBeInTheDocument();
    expect(await screen.findByText("변경 없음")).toBeInTheDocument();
  });

  it("행을 누르면 diff 탭을 열고, diff 탭은 줄을 색으로 나눈다", async () => {
    const { onOpenTab } = await mount(vi.fn(), "wt:a.txt");
    fireEvent.click(await screen.findByText("a.txt"));
    expect(onOpenTab).toHaveBeenCalledWith({ id: "wt:a.txt", kind: "diff", title: "a.txt" });
    expect(await screen.findByText("+two")).toHaveAttribute("data-kind", "add");
    expect(screen.getByText("-one")).toHaveAttribute("data-kind", "del");
  });
});
