import type { ExtensionModule } from "#core/extensions";
import { createSearchServicePort } from "./infra/HttpSearchService";
import { SearchModel } from "./model/SearchModel";
import { SearchView } from "./view/SearchView";
import { SearchViewModel } from "./viewmodel/SearchViewModel";

/** 검색 사이드바의 id. */
const SEARCH_ID = "search";

/** 검색 확장 — 검색 사이드바. 결과를 열고 이동하는 것은 명령(`arka.workbench.open`·`arka.filesystem.reveal`)으로 한다. */
export const search: ExtensionModule = {
  id: "arka.search",
  provides: [
    { id: "arka.search.service", lifetime: "singleton", create: createSearchServicePort },
    {
      id: "arka.search.model",
      lifetime: "singleton",
      create: (c) => new SearchModel({ searchService: c.resolve("arka.search.service") }),
    },
    {
      id: "arka.search.viewModel",
      lifetime: "singleton",
      create: (c) =>
        new SearchViewModel({
          searchModel: c.resolve("arka.search.model"),
          commandCenterRegistry: c.resolve("arka.commands"),
        }),
    },
  ],
  activate: (c) => {
    c.resolve("arka.workbench.sidebar").add({ id: SEARCH_ID, title: "검색", iconId: "search", Content: SearchView });
    const commands = c.resolve("arka.commands");
    commands.actions.add({
      id: "arka.search.focus",
      label: "검색 보기",
      execute: () => commands.execute("arka.workbench.revealSidebar", { id: SEARCH_ID }),
    });
    commands.keybindings.add({ keybinding: "ctrl+shift+f", actionId: "arka.search.focus" });
  },
};
