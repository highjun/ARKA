import {
  PROTOCOL_VERSION,
  ReadFileRequest,
  ReadFileResponse,
  URI,
  type FileErrorCode,
  type ProtocolErrorCode,
} from "contracts";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { FileError } from "../domain/errors";
import { readFile } from "../infra/localDiskFileSystem";

/**
 * `/fs/*` 라우트. 핸들러는 검증하고 서비스를 부르고 응답만 만든다.
 *
 * `workspaceRoot`를 인자로 받아, 어느 워크스페이스를 여는지는 조립하는 쪽이
 * 정하게 한다.
 */
export function createFsRoutes(workspaceRoot: string): Hono {
  const app = new Hono();

  app.post("/fs/read", async (c) => {
    const parsed = ReadFileRequest.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { code: "BadRequest", message: parsed.error.message },
        protocolErrorStatus("BadRequest"),
      );
    }
    if (parsed.data.protocolVersion !== PROTOCOL_VERSION) {
      return c.json(
        {
          code: "VersionMismatch",
          message: `server speaks protocol ${PROTOCOL_VERSION}, request had ${parsed.data.protocolVersion}`,
        },
        protocolErrorStatus("VersionMismatch"),
      );
    }

    let uri;
    try {
      uri = URI.parse(parsed.data.uri);
    } catch (error) {
      return c.json(
        { code: "BadRequest", message: (error as Error).message },
        protocolErrorStatus("BadRequest"),
      );
    }

    try {
      const { content, etag } = await readFile(uri, workspaceRoot);
      return c.json(
        ReadFileResponse.parse({
          // 전송이 JSON이라 바이트를 그대로 실을 수 없다.
          content: Buffer.from(content).toString("base64"),
          etag,
        }),
      );
    } catch (error) {
      if (error instanceof FileError) {
        return c.json(
          { code: error.code, message: error.message },
          fileErrorStatus(error.code),
        );
      }
      throw error;
    }
  });

  return app;
}

function protocolErrorStatus(code: ProtocolErrorCode): ContentfulStatusCode {
  switch (code) {
    case "VersionMismatch":
      // 426은 "클라이언트가 프로토콜을 갱신해야 한다"는 뜻이라 정확히 맞는다.
      return 426;
    case "BadRequest":
      return 400;
    case "Internal":
      return 500;
  }
}

function fileErrorStatus(code: FileErrorCode): ContentfulStatusCode {
  switch (code) {
    case "NotFound":
      return 404;
    case "NoPermission":
      return 403;
    case "Exists":
    case "Conflict":
      return 409;
    case "IsADirectory":
    case "NotADirectory":
      // 파일이 있긴 한데 요청이 그 종류를 잘못 짚은 것이다.
      return 400;
    case "Unavailable":
      return 503;
  }
}
