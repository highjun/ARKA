import { DirectoryListing, FileContent, FileErrorBody, protocolHeaders } from "#contracts";
import type { FileEntryType, IWorkspaceFiles } from "../model/IWorkspaceFiles";

class HttpWorkspaceFilesAdapter implements IWorkspaceFiles {
  static readonly #TIMEOUT_MS = 10_000;

  async list(path: string): Promise<DirectoryListing> {
    return DirectoryListing.parse(await this.#get("/api/files", path));
  }

  async read(path: string): Promise<FileContent> {
    return FileContent.parse(await this.#get("/api/files/content", path));
  }

  async write(path: string, content: string): Promise<void> {
    const response = await this.#fetch("/api/files/content", {
      method: "PUT",
      headers: { ...protocolHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`저장하지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async create(path: string, type: FileEntryType): Promise<void> {
    const response = await this.#fetch("/api/files", {
      method: "POST",
      headers: { ...protocolHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ path, type }),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`만들지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async move(from: string, to: string): Promise<void> {
    const response = await this.#fetch("/api/files/move", {
      method: "POST",
      headers: { ...protocolHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`옮기지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async remove(path: string): Promise<void> {
    const response = await this.#fetch(`/api/files?${new URLSearchParams({ path }).toString()}`, {
      method: "DELETE",
      headers: protocolHeaders(),
    });
    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`지우지 못했다 (${String(response.status)}${reason}).`);
    }
  }

  async #get(endpoint: string, path: string): Promise<unknown> {
    const response = await this.#fetch(`${endpoint}?${new URLSearchParams({ path }).toString()}`, {
      headers: protocolHeaders(),
    });

    if (!response.ok) {
      const reason = await this.#reasonOf(response);
      throw new Error(`파일을 읽지 못했다 (${String(response.status)}${reason}).`);
    }
    return response.json();
  }

  async #fetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(HttpWorkspaceFilesAdapter.#TIMEOUT_MS) });
    } catch (error) {
      if (error instanceof DOMException) throw new Error("응답이 없다 — 연결을 확인해 주세요.", { cause: error });
      throw error;
    }
  }

  async #reasonOf(response: Response): Promise<string> {
    try {
      const body = FileErrorBody.safeParse(await response.json());
      return body.success ? `: ${body.data.message}` : "";
    } catch {
      return "";
    }
  }
}

export const createWorkspaceFilesPort = (): IWorkspaceFiles => new HttpWorkspaceFilesAdapter();
