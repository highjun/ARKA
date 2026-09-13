/**
 * 텍스트를 시스템 클립보드에 넣는다.
 *
 * 읽기는 계약에 없다 — 소비자가 쓰지 않는 능력을 계약에 넣으면 구현마다 의무만 생긴다.
 *
 * `copy` 가 예외를 던지지 않고 성공 여부를 돌려주는 건, **클립보드가 없는 환경이 정상 경로**이기
 * 때문이다(비보안 컨텍스트·권한 거부·테스트 러너). 소비자는 그때 "복사됨"을 띄우지 않아야 하는데,
 * 예외로 알리면 호출부마다 `try`/`catch` 가 생기고 한 곳만 빠뜨려도 조용히 거짓말을 하게 된다.
 */
export interface TextClipboardPort {
  copy(text: string): Promise<boolean>;
}

/**
 * 브라우저가 주는 두 수단을 순서대로 시도한다 — 비동기 Clipboard API 가 우선이고, 없거나 거부되면
 * 화면 밖 `<textarea>` + `execCommand('copy')` 로 떨어진다.
 */
const copyByClipboardApi = async (text: string): Promise<boolean> => {
  if (!globalThis.navigator?.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 권한 거부·비보안 컨텍스트. 실패가 정상 경로라 아래 폴백으로 넘긴다.
    return false;
  }
};

const copyByExecCommand = (text: string): boolean => {
  // jsdom 은 `execCommand` 자체를 구현하지 않는다 — 있는지부터 본다.
  if (typeof globalThis.document?.execCommand !== 'function') return false;

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
};

/** Clipboard API를 먼저 쓰고 실패하면 `execCommand`로 떨어진다 — 안전 컨텍스트가 아닌 곳 때문이다. */
export const createTextClipboardPort = (): TextClipboardPort => ({
  copy: async (text) => (await copyByClipboardApi(text)) || copyByExecCommand(text),
});
