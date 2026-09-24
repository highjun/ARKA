export const keysOf = (keybinding: string): readonly string[] =>
  keybinding === "" ? [] : keybinding.split("+").map((key) => key.charAt(0).toUpperCase() + key.slice(1));
