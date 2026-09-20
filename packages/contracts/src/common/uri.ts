export class URI {
  readonly scheme: string;
  readonly authority: string;
  readonly path: string;

  private constructor(scheme: string, authority: string, path: string) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
  }

  static parse(value: string): URI {
    if (value.includes("?")) {
      throw new Error(`URI.parse: query strings are not supported: ${value}`);
    }
    if (value.includes("#")) {
      throw new Error(`URI.parse: fragments are not supported: ${value}`);
    }

    const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/]*)\/(.*)$/.exec(value);
    const scheme = match?.[1];
    const authority = match?.[2];
    const path = match?.[3];
    if (scheme === undefined || authority === undefined || path === undefined) {
      throw new Error(`URI.parse: not a valid "scheme://authority/path" URI: ${value}`);
    }

    return new URI(scheme, authority, path);
  }

  static file(path: string): URI {
    return new URI("file", "", path.startsWith("/") ? path.slice(1) : path);
  }

  toString(): string {
    return `${this.scheme}://${this.authority}/${this.path}`;
  }
}
