import { describe, expect, it } from "vitest";
import { renderCloudflared, renderCompose, yamlString } from "./render.ts";
import { DeploySpec } from "./spec.ts";
import type { RenderContext } from "./render.ts";

const spec = (over: Record<string, unknown> = {}): DeploySpec =>
  DeploySpec.parse({ name: "ade", hostname: "arka.sangjun.dev", image: "ade:latest", port: 3000, healthPath: "/api/health", ...over });

const ctx = (over: Partial<RenderContext> = {}): RenderContext => ({
  sourceFile: "/repo/ops/deploy/ade.deploy.json",
  generatedAt: "2026-09-10T00:00:00.000Z",
  tunnelId: "a35b3f82-9881-48a1-b00e-9636c6a4801c",
  credentialsPath: "/home/x/secure/a35b3f82.json",
  uid: 1000,
  gid: 1000,
  ...over,
});

describe("compose 골격 — 셋 다 실제 사고 하나씩에 대응한다", () => {
  it("호스트 포트를 열지 않는다 — 터널이 앱으로 가는 유일한 경로여야 인증 없는 앱이 성립한다", () => {
    expect(renderCompose(spec(), ctx())).not.toContain("ports:");
  });

  it("프로젝트 이름을 명시한다 — 디렉터리명 유추에 맡기면 --remove-orphans가 남의 컨테이너를 지운다", () => {
    expect(renderCompose(spec(), ctx())).toContain("\nname: ade\n");
  });

  it("터널 컨테이너의 uid를 맞춘다 — nonroot(65532)는 0600 자격증명을 못 읽는다", () => {
    expect(renderCompose(spec(), ctx({ uid: 1001, gid: 1002 }))).toContain("user: 1001:1002");
  });

  it("앱도 호스트 사용자로 돈다 — root면 워크스페이스에 만드는 파일을 사람이 못 고친다", () => {
    const out = renderCompose(spec(), ctx({ uid: 1000, gid: 1000 }));
    const appBlock = out.slice(out.indexOf("  app:"), out.indexOf("  tunnel:"));
    expect(appBlock).toContain("user: 1000:1000");
  });

  it("앱이 healthy가 된 뒤에 터널이 뜬다", () => {
    expect(renderCompose(spec(), ctx())).toContain("condition: service_healthy");
  });

  it("healthcheck가 스펙의 포트와 경로를 쓴다", () => {
    expect(renderCompose(spec({ port: 8080, healthPath: "/healthz" }), ctx())).toContain(
      `"http://127.0.0.1:8080/healthz"`,
    );
  });

  it("마운트가 없으면 volumes 키 자체가 없다 — 빈 키는 compose가 거부한다", () => {
    expect(renderCompose(spec(), ctx())).not.toContain("volumes:\n      -\n");
  });

  it("readOnly면 :ro를 붙이고 아니면 안 붙인다", () => {
    const out = renderCompose(
      spec({ mounts: [{ source: "/a", target: "/a", readOnly: true }, { source: "/b", target: "/b" }] }),
      ctx(),
    );
    expect(out).toContain("- /a:/a:ro");
    expect(out).toContain("- /b:/b");
  });

  it("envFile이 없으면 env_file 키 자체가 없다", () => {
    expect(renderCompose(spec(), ctx())).not.toContain("env_file:");
  });

  it("비밀을 굽지 않고 경로로 가리킨다 — 구우면 생성물이 비밀의 사본이 된다", () => {
    const out = renderCompose(spec(), ctx({ envFile: "/home/x/secure/env/ade.env" }));

    expect(out).toContain("env_file:");
    expect(out).toContain("- /home/x/secure/env/ade.env");
    expect(out).not.toContain("environment:");
  });
});

describe("YAML 값 인용 — 인용을 빼서 0000이 0으로 접혀 로그인이 늘 실패한 적이 있다", () => {
  it("숫자로만 된 값은 인용한다", () => {
    expect(yamlString("0000")).toBe(`"0000"`);
    expect(yamlString("12345")).toBe(`"12345"`);
  });

  it("불리언으로 읽히는 낱말도 인용한다", () => {
    for (const word of ["yes", "no", "on", "off", "true", "null", "~"]) expect(yamlString(word)).toBe(`"${word}"`);
  });

  it("평범한 값은 그대로 둔다 — 콜론이 있어도 순수 숫자가 아니면 bare다", () => {
    expect(yamlString("ade:latest")).toBe("ade:latest");
    expect(yamlString("1000:1000")).toBe("1000:1000");
  });

  it("따옴표·개행·$가 들어오면 던진다 — 조용히 뭉개는 것보다 선다", () => {
    for (const bad of ['a"b', "a\nb", "a$b"]) expect(() => yamlString(bad)).toThrow();
  });

  it("envFile 경로에 따옴표가 필요하면 인용한다", () => {
    expect(renderCompose(spec(), ctx({ envFile: "/home/x/my env/ade.env" }))).toContain(`"/home/x/my env/ade.env"`);
  });
});

describe("cloudflared 설정", () => {
  it("catch-all이 마지막에 있다 — 없으면 cloudflared가 기동을 거부한다", () => {
    expect(renderCloudflared(spec(), ctx()).trimEnd().endsWith("- service: http_status:404")).toBe(true);
  });

  it("터널을 이름이 아니라 UUID로 적는다", () => {
    expect(renderCloudflared(spec(), ctx())).toContain("tunnel: a35b3f82-9881-48a1-b00e-9636c6a4801c");
  });

  it("compose 서비스명 app으로 직결한다 — 호스트를 거치지 않는다", () => {
    expect(renderCloudflared(spec({ port: 3000 }), ctx())).toContain("service: http://app:3000");
  });
});

describe("스펙 검증 — 잘못된 값으로 조용히 뜨지 않는다", () => {
  it("호스트 이름에 대문자나 밑줄을 허용하지 않는다", () => {
    expect(() => spec({ hostname: "Arka.sangjun.dev" })).toThrow();
    expect(() => spec({ hostname: "pr_1.sangjun.dev" })).toThrow();
  });

  it("점이 없는 이름은 호스트 이름이 아니다", () => {
    expect(() => spec({ hostname: "localhost" })).toThrow();
  });

  it("포트 범위를 벗어나면 던진다", () => {
    expect(() => spec({ port: 0 })).toThrow();
    expect(() => spec({ port: 70000 })).toThrow();
  });

  it("healthPath는 슬래시로 시작해야 한다", () => {
    expect(() => spec({ healthPath: "api/health" })).toThrow();
  });

  it("accessEmails의 기본값은 빈 배열이다 — 비면 무인증으로 열린다는 뜻이라 명시적으로 확인한다", () => {
    expect(spec().accessEmails).toEqual([]);
  });
});
