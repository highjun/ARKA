import type { ComponentPropsWithoutRef, Ref } from "react";
import { clsx } from "clsx";
import styles from "./Kbd.module.css";

/** 어느 면 위에 놓이나. 강조 면(accent 배경) 위에서는 색을 뒤집는다. */
type KbdTone = "default" | "onEmphasis";

/** `<kbd>` 하나가 키 하나다. 조합키는 `Kbd` 여럿을 나열한다. */
export interface KbdProps extends ComponentPropsWithoutRef<"kbd"> {
  /** 루트 원소로 그대로 통과한다. */
  readonly ref?: Ref<HTMLElement>;
  /** 기본값 `'default'`. 강조 면(선택된 줄 등) 위에 놓이면 `'onEmphasis'`. */
  readonly tone?: KbdTone;
}

/**
 * 키캡 하나. `KeybindingTable`·`CommandPalette`·`Menu.Item`의 단축키가 저마다 `<kbd>`를 그리던
 * 것을 한 부품으로 모았다(2026-09-18) — 앱 전체에서 키는 같게 보여야 한다.
 *
 * 모양은 Primer가 강조 배경 위 키바인딩 힌트용으로 갖고 있는 `--buttonKeybindingHint-*` 토큰을
 * 쓴다. `tone`을 `data-tone`으로 드러내고 CSS가 받는다.
 */
export const Kbd = ({ tone = "default", className, ref, ...props }: KbdProps) => (
  <kbd ref={ref} {...props} data-component="Kbd" data-tone={tone} className={clsx(className, styles["root"])} />
);
