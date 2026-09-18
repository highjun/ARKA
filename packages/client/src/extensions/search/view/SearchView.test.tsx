import { Container } from "#core/di";
import { ViewModelProvider } from "#core/viewmodel";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MockSearchService } from "../model/MockSearchService";
import { SearchModel } from "../model/SearchModel";
import { SearchViewModel } from "../viewmodel/SearchViewModel";
import { SearchView } from "./SearchView";

const mount = (onFileOpen = vi.fn()) => {
  const container = new Container("test");
  container.register(
    "arka.search.model",
    "singleton",
    () => new SearchModel({ searchService: new MockSearchService({ "src/a.ts": "const hello = 1;" }) }),
  );
  container.register(
    "arka.search.viewModel",
    "scoped",
    (c) => new SearchViewModel({ searchModel: c.resolve("arka.search.model"), debounceMs: 1 }),
  );
  render(
    <ViewModelProvider container={container.createChild("view")}>
      <SearchView onFileOpen={onFileOpen} />
    </ViewModelProvider>,
  );
  return { onFileOpen };
};

describe("SearchView", () => {
  it("입력하면 결과가 뜨고 누르면 파일을 연다", async () => {
    const { onFileOpen } = mount();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("검색어"), { target: { value: "hello" } });
    });
    expect(await screen.findByText("src/a.ts")).toBeInTheDocument();
    expect(screen.getByText("1개 파일에서 1개")).toBeInTheDocument();
    fireEvent.click(screen.getByText("const hello = 1;"));
    expect(onFileOpen).toHaveBeenCalledWith("src/a.ts", { line: 1, column: 7 });
  });
});
