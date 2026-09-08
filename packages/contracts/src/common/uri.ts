/**
 * empty-authority 형태(`scheme:///path`)만 지원한다.
 *
 * @see docs/adr/0003-uri.md
 */
export class URI {
  readonly scheme: string;
  readonly path: string;

  // 검증을 우회해서 만들 수 없게 한다.
  private constructor(scheme: string, path: string) {
    this.scheme = scheme;
    this.path = path;
  }

  /**
   * @throws Error 
   * - query나 fragment가 있는 경우
   * - `scheme://` 구분자가 없는 경우
   * - authority가 비어 있지 않은 경우(`file://host/...`).
   */
  static parse(value: string): URI {
    if (value.includes("?")) {
      throw new Error(`URI.parse: query strings are not supported: ${value}`);
    }
    if (value.includes("#")) {
      throw new Error(`URI.parse: fragments are not supported: ${value}`);
    }

    const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/.exec(value);
    if (!match) {
      throw new Error(`URI.parse: not a valid "scheme://path" URI: ${value}`);
    }

    const scheme = match[1];
    const rest = match[2];
    // rest는 `://` 다음 전부라, authority가 있으면 `/`로 시작하지 않는다(`host/a`).
    // undefined 비교는 noUncheckedIndexedAccess 때문이며 실제로는 발생하지 않는다.
    if (scheme === undefined || rest === undefined || !rest.startsWith("/")) {
      throw new Error(
        `URI.parse: only empty-authority URIs (scheme:///path) are supported: ${value}`,
      );
    }

    return new URI(scheme, rest);
  }

  /** 경로에 선행 슬래시가 없으면 붙인다. */
  static file(path: string): URI {
    return new URI("file", path.startsWith("/") ? path : `/${path}`);
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }
}
