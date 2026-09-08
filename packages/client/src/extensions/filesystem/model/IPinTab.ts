import { createToken } from '#core/di';
export const PinTabToken = createToken<IPinTab>("pinTab");
/**
 * `FilesystemModule`이 `ShellModule`의 탭 고정(pin)을 부르기 위한 통로.
 *
 * 미리보기 탭(`isPreview`)은 원래 Tab 헤더를 더블클릭해야만 고정됐다 — 그런데 편집을 시작해
 * dirty가 됐는데도 고정되지 않으면, italic(미리보기 표시)이 "이 파일은 read-only 미리보기다"라는
 * 원래 뜻과 어긋나게 계속 남는다(2026-09 지적으로 확인). `FilesystemModule`은 `ShellModule`의
 * `IShellViewModel`을 직접 몰라야 하므로 이 얇은 Port로 경계를 긋는다.
 */
export interface IPinTab {
  /** 이 경로에 대응하는 탭이 열려 있고 아직 미리보기 상태면 고정한다. 없으면 아무 일도 없다. */
  pin(path: string): void;
}
