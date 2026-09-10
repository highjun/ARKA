/**
 * `scheme://authority/path` 형태의 리소스 식별자.
 *
 * `authority`는 파일이 어디에 속하는지를 가리킨다 — `git://HEAD/a.txt`의
 * 리비전, `run://abc123/out.log`의 실행. 디스크 파일처럼 속한 곳이 없으면
 * 비어 있고, 그때가 슬래시 세 개(`file:///a.txt`)다.
 *
 * `path`는 어느 스킴이든 workspace 루트 기준 상대경로이며 선행 슬래시를 갖지
 * 않는다.
 *
 */
export class URI {
  readonly scheme: string;
  readonly authority: string;
  readonly path: string;

  // 검증을 우회해서 만들 수 없게 한다.
  private constructor(scheme: string, authority: string, path: string) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
  }

  /**
   * @throws Error
   * - query나 fragment가 있는 경우
   * - `scheme://authority/` 형태가 아닌 경우(구분자나 경로 슬래시가 없음)
   */
  static parse(value: string): URI {
    if (value.includes("?")) {
      throw new Error(`URI.parse: query strings are not supported: ${value}`);
    }
    if (value.includes("#")) {
      throw new Error(`URI.parse: fragments are not supported: ${value}`);
    }

    // authority는 슬래시를 포함하지 않으므로 첫 `/`가 path의 시작점이다.
    const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/]*)\/(.*)$/.exec(value);
    const scheme = match?.[1];
    const authority = match?.[2];
    const path = match?.[3];
    if (scheme === undefined || authority === undefined || path === undefined) {
      throw new Error(
        `URI.parse: not a valid "scheme://authority/path" URI: ${value}`,
      );
    }

    return new URI(scheme, authority, path);
  }

  /** 디스크 파일은 속한 곳이 없어 `authority`가 비어 있다. */
  static file(path: string): URI {
    return new URI("file", "", path.startsWith("/") ? path.slice(1) : path);
  }

  toString(): string {
    return `${this.scheme}://${this.authority}/${this.path}`;
  }
}
