import { URI } from "#contracts";
import { describe, expect, it } from "vitest";
import { keybindingsTabProvider } from "./keybindingsTabProvider";

describe("단축키 탭 provider", () => {
  it("arka:///keybindings만 받는다", async () => {
    await expect(keybindingsTabProvider.openTab(URI.parse("arka:///keybindings"))).resolves.toMatchObject({
      title: "키보드 단축키",
    });
    await expect(keybindingsTabProvider.openTab(URI.parse("arka:///settings"))).resolves.toBeUndefined();
  });
});
