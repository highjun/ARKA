export interface TextClipboardPort {
  copy(text: string): Promise<boolean>;
}

const copyByClipboardApi = async (text: string): Promise<boolean> => {
  if (!globalThis.navigator?.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const copyByExecCommand = (text: string): boolean => {
  if (typeof globalThis.document?.execCommand !== "function") return false;

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
};

export const createTextClipboardPort = (): TextClipboardPort => ({
  copy: async (text) => (await copyByClipboardApi(text)) || copyByExecCommand(text),
});
