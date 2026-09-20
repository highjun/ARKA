import { describe, expect, it } from "vitest";
import { missingNames, render } from "./renderTunnel.ts";

const TEMPLATE = "tunnel: ${ARKA_TUNNEL_ID}\nhostname: ${ARKA_HOSTNAME}\n";

describe("터널 설정을 값으로 채운다", () => {
  it("자리마다 값을 넣는다", () => {
    expect(render(TEMPLATE, { ARKA_TUNNEL_ID: "t-1", ARKA_HOSTNAME: "h" })).toBe("tunnel: t-1\nhostname: h\n");
  });

  it("값이 없으면 이름을 들어 막는다 — 빈 설정으로 터널이 뜨면 404만 낸다", () => {
    expect(() => render(TEMPLATE, { ARKA_TUNNEL_ID: "t-1" })).toThrow("ARKA_HOSTNAME");
  });

  it("빈 문자열도 없는 것으로 본다", () => {
    expect(missingNames(TEMPLATE, { ARKA_TUNNEL_ID: "", ARKA_HOSTNAME: "h" })).toEqual(["ARKA_TUNNEL_ID"]);
  });
});
