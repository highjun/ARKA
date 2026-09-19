import { URI } from "#contracts";
import { CommandService } from "#core/commands";
import { Container } from "#core/di";
import { ContainerProvider } from "#core/viewmodel";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MockSearchService } from "../model/MockSearchService";
import { SearchModel } from "../model/SearchModel";
import { SearchViewModel } from "../viewmodel/SearchViewModel";
import { SearchView } from "./SearchView";

/** 결과를 누르면 명령을 부른다 — 무엇이 열리는지는 `arka.workbench.open`을 받은 쪽의 일이다. */
const mount = () => {
  const open = vi.fn();
  const commands = new CommandService({
    overridesStore: { load: () => ({}), save: () => undefined },
    reportError: () => undefined,
  });
  commands.actions.add({ id: "arka.workbench.open", label: "열기", execute: open });
  commands.actions.add({ id: "arka.filesystem.reveal", label: "이동", execute: () => undefined });
  const container = new Container("test");
  container.register(
    "arka.search.model",
    "singleton",
    () => new SearchModel({ searchService: new MockSearchService({ "src/a.ts": "const hello = 1;" }) }),
  );
  container.register(
    "arka.search.viewModel",
    "scoped",
    (c) =>
      new SearchViewModel({
        searchModel: c.resolve("arka.search.model"),
        commandCenterRegistry: commands,
        debounceMs: 1,
      }),
  );
  render(
    <ContainerProvider container={container.createChild("view")}>
      <SearchView />
    </ContainerProvider>,
  );
  return { open };
};

describe("SearchView", () => {
  it("입력하면 결과가 뜨고 누르면 파일을 연다", async () => {
    const { open } = mount();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("검색어"), { target: { value: "hello" } });
    });
    expect(await screen.findByText("src/a.ts")).toBeInTheDocument();
    expect(screen.getByText("1개 파일에서 1개")).toBeInTheDocument();
    fireEvent.click(screen.getByText("const hello = 1;"));
    expect(open).toHaveBeenCalledWith({ uri: URI.file("src/a.ts"), preview: true });
  });
});
