import { describe, expect, it } from "vitest";
import { normalizeKeybinding } from "./normalize";

describe("normalizeKeybinding", () => {
  const eventOf = (overrides: Partial<KeyboardEvent>): KeyboardEvent =>
    ({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: "", ...overrides }) as KeyboardEvent;

  it('ctrl 과 meta 를 "ctrl" 하나로 합친다', () => {
    expect(normalizeKeybinding(eventOf({ ctrlKey: true, key: "k" }))).toBe("ctrl+k");
    expect(normalizeKeybinding(eventOf({ metaKey: true, key: "k" }))).toBe("ctrl+k");
  });

  it("수정자 키를 ctrl, alt, shift 순서로 정렬한다", () => {
    expect(normalizeKeybinding(eventOf({ ctrlKey: true, altKey: true, shiftKey: true, key: "k" }))).toBe(
      "ctrl+alt+shift+k",
    );
  });

  it("눌린 키가 수정자 키 자체면 그 키는 제외한다", () => {
    expect(normalizeKeybinding(eventOf({ ctrlKey: true, key: "Control" }))).toBe("ctrl");
  });

  it("키를 소문자로 바꾼다", () => {
    expect(normalizeKeybinding(eventOf({ key: "K" }))).toBe("k");
  });
});
