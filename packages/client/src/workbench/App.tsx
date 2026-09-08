import { CommandCenterRegistryToken } from "#core/commands";
import { useAppContext, useViewModel } from "#core/view-model";
import { useEffect, useRef, useState } from "react";
import { FileContentViewModelToken } from "../features/filesystem";
import { ShellView, ShellViewModelToken } from "../features/shell";

/**
 * 조립 루트. Shell 자신의 도메인 로직이 아니라 **앱 전체 단위 배선**(전역 키다운·beforeunload·
 * 빌드 정보·테마 DOM 반영)을 여기 모은다 — `<Name>View.tsx`는 `useViewModel` 하나만 부르므로
 * 이 효과들을 걸 자리가 없다.
 *
 * **마운트 1회용 효과는 `useViewModel`이 돌려준 값을 의존성으로 쓰지 않는다.** 구독 중인 값이
 * 바뀔 때마다 리스너를 떼었다 붙이면 그 틈에 발생한 이벤트를 놓친다. 대신 `useAppContext()`로
 * 얻는 컨테이너(마운트 내내 같은 참조)에서 직접 resolve한다.
 */

/**
 * 빌드 시각을 화면에 띄울 한 줄로 바꾼다.
 *
 * 서버는 ISO로만 주고 형식은 여기서 정한다 — **보는 사람의 시간대로** 읽혀야 하기 때문이다.
 * 서버가 UTC로 굳혀 보내면 폰에서 시차를 머릿속으로 빼야 한다.
 */
const formatBuildTime = (iso: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  const two = (value: number): string => String(value).padStart(2, "0");
  return `v${String(at.getFullYear())}.${two(at.getMonth() + 1)}.${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`;
};

/**
 * 브라우저 키보드 이벤트를 `ctrl+j` 형태 문자열로 정규화한다.
 *
 * Ctrl과 Cmd(메타)를 둘 다 `ctrl`로 합친다 — 플랫폼마다 다른 키를 따로 등록하게 하지 않기
 * 위한 단순화다. 조합키 자신이 눌린 순간은 조합에서 뺀다.
 */
const normalizeKeydown = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("ctrl");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");
  const key = event.key.toLowerCase();
  if (!["control", "meta", "alt", "shift"].includes(key)) parts.push(key);
  return parts.join("+");
};

export const App = () => {
  const container = useAppContext();
  const shellViewModel = useViewModel(ShellViewModelToken);
  const fileContentViewModel = useViewModel(FileContentViewModelToken);
  const theme = shellViewModel.theme;
  const fileRows = fileContentViewModel.rows;

  // `color-scheme`은 `<html>`에 거는 유일한 자리다 — 브라우저 자체의 캔버스·스크롤바 기본색은
  // 컴포넌트 트리 밖이라 여기서만 닿는다.
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // 서버가 지금 서빙 중인 번들의 빌드 시각을 알려준다. 실패해도 화면은 그대로 돌아야 하므로
  // 조용히 비운다 — 이건 진단용 표시지 기능이 아니다.
  const [buildId, setBuildId] = useState("");
  useEffect(() => {
    fetch("/api/version")
      .then(async (response) =>
        response.ok ? ((await response.json()) as { builtAt?: string | null }) : null,
      )
      .then((body) => setBuildId(body?.builtAt == null ? "" : formatBuildTime(body.builtAt)))
      .catch(() => setBuildId(""));
  }, []);

  /**
   * 저장 안 된 변경을 안고 새로고침하면 그대로 사라진다.
   *
   * 리스너는 한 번만 걸고 `hasUnsaved`는 ref로 최신 값을 가리키게 한다 — `fileRows`가 바뀔
   * 때마다 리스너를 갈아 끼우면 그 틈에 발생한 `beforeunload`를 놓칠 수 있다.
   */
  const hasUnsavedRef = useRef(false);
  hasUnsavedRef.current = Object.values(fileRows).some((row) => row.isDirty);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedRef.current) return;
      event.preventDefault();
      // 크롬은 `returnValue`를 설정해야 확인 대화상자를 띄운다 — 문구는 브라우저가 정한다.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /**
   * 전역 키 리스너 **하나**. 매칭되는 키바인딩을 찾아 커맨드를 실행하고, 실행했으면 브라우저
   * 기본 동작을 막는다(Ctrl+S가 "페이지 저장"을 여는 것 같은 충돌을 피하려는 것).
   *
   * 컴포넌트-로컬 단축키(CodeMirror의 Mod-S, FileTree의 방향키)는 안 건드린다 — 그건 DOM
   * 포커스가 있어야 의미 있는 것들이다.
   */
  useEffect(() => {
    const commandCenterRegistry = container.resolve(CommandCenterRegistryToken);
    const onKeydown = (event: KeyboardEvent) => {
      const executed = commandCenterRegistry.dispatchKeydown(normalizeKeydown(event));
      if (executed) event.preventDefault();
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [container]);

  return <ShellView buildId={buildId} />;
};
