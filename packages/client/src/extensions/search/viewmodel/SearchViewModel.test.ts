import { URI } from "#contracts";
import { CommandService } from "#core/commands";
import { describe, expect, it } from "vitest";
import { MockSearchService } from "../model/MockSearchService";
import { SearchModel } from "../model/SearchModel";
import { SearchViewModel } from "./SearchViewModel";

const settled = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
/** 실행된 명령을 `[id, context]`로 쌓는 레지스트리 — 검색은 명령을 부를 뿐이라 그것만 본다. */
const recordingCommands = () => {
  const executed: [string, unknown][] = [];
  const commands = new CommandService({
    overridesStore: { load: () => ({}), save: () => undefined },
    reportError: () => undefined,
  });
  for (const id of ["arka.workbench.open", "arka.filesystem.reveal"])
    commands.actions.add({ id, label: id, execute: (context) => void executed.push([id, context]) });
  return { commands, executed };
};
const make = () => {
  const model = new SearchModel({ searchService: new MockSearchService({ "a.md": "hello\nhello", "b.md": "hello" }) });
  return new SearchViewModel({
    searchModel: model,
    commandCenterRegistry: recordingCommands().commands,
    debounceMs: 1,
  });
};

describe("SearchViewModel", () => {
  it("입력하면 디바운스 뒤 찾고 파일별로 묶는다", async () => {
    const viewModel = make();
    viewModel.setQuery("hello");
    expect(viewModel.rows).toEqual([]);
    await settled();
    expect(viewModel.rows.map((r) => [r.path, r.matches.length])).toEqual([
      ["a.md", 2],
      ["b.md", 1],
    ]);
    expect(viewModel.summary).toBe("2개 파일에서 3개");
    expect(viewModel.searching).toBe(false);
  });

  it("submit은 바로 찾는다", async () => {
    const viewModel = make();
    viewModel.setQuery("hello");
    viewModel.submit();
    await settled(0);
    expect(viewModel.rows).toHaveLength(2);
  });

  it("토글이 조건을 바꾸고 다시 찾는다", async () => {
    const viewModel = make();
    viewModel.setQuery("HELLO");
    await settled();
    expect(viewModel.rows).toHaveLength(2);
    viewModel.toggleCaseSensitive();
    expect(viewModel.caseSensitive).toBe(true);
    await settled();
    expect(viewModel.rows).toHaveLength(0);
    expect(viewModel.summary).toBe("결과 없음");
  });
});

describe("SearchViewModel — 결과 열기", () => {
  it("위치 요청을 먼저 담고 미리보기로 연다", () => {
    const { commands, executed } = recordingCommands();
    const model = new SearchModel({ searchService: new MockSearchService({}) });
    const viewModel = new SearchViewModel({ searchModel: model, commandCenterRegistry: commands, debounceMs: 1 });

    viewModel.openResult("docs/a.md", { line: 3, column: 2 });

    expect(executed).toEqual([
      ["arka.filesystem.reveal", { uri: URI.file("docs/a.md"), line: 3, column: 2 }],
      ["arka.workbench.open", { uri: URI.file("docs/a.md"), preview: true }],
    ]);
  });
});
