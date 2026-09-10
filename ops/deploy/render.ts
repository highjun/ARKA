import type { DeploySpec } from "./spec.ts";

/**
 * 스펙을 compose·cloudflared 설정으로 **번역한다.** 부작용이 없다 — 파일도 안 쓰고 명령도 안 부른다.
 *
 * 여기서 정하는 골격 셋이 각각 실제 사고 하나씩에 대응한다(→ ADR 0005):
 * 호스트 포트를 안 열고, `name:`을 명시하고, 터널 컨테이너의 uid를 맞춘다.
 */
export interface RenderContext {
  /** 이 생성물이 어느 스펙에서 나왔는지. 생성물 머리에 박아 둔다. */
  readonly sourceFile: string;
  readonly generatedAt: string;
  readonly tunnelId: string;
  /** 터널 자격증명의 **호스트 경로**. 컨테이너 안 경로는 늘 `/etc/cloudflared/creds.json`이다. */
  readonly credentialsPath: string;
  readonly uid: number;
  readonly gid: number;
  /** `envFile`에서 읽은 값. 비어 있으면 `environment:` 키 자체를 내지 않는다. */
  readonly env: Readonly<Record<string, string>>;
}

/** YAML이 다른 뜻으로 읽는 값들. `0000`이 정수 `0`으로 접혀 로그인이 늘 실패한 적이 있다. */
const AMBIGUOUS =
  /^([-+]?[0-9]+|[-+]?0[xo][0-9a-f]+|[-+]?(\.[0-9]+|[0-9]+\.[0-9]*)(e[-+]?[0-9]+)?|true|false|yes|no|on|off|null|~)$/iu;
const BARE = /^[A-Za-z0-9._/:@-]+$/u;
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/u;

/**
 * 값을 YAML에 안전하게 놓는다. 모호하면 따옴표로 싸고, 쌀 수 없는 것은 **던진다.**
 *
 * 따옴표·개행·`$`가 든 값은 방어선이다 — 여기까지 오면 안 되고, 조용히 뭉개는 것보다 서는 편이 낫다.
 */
export const yamlString = (value: string): string => {
  if (/["\n$]/u.test(value)) throw new Error(`YAML에 넣을 수 없는 값입니다: 따옴표·개행·$가 들어 있습니다`);
  return BARE.test(value) && !AMBIGUOUS.test(value) ? value : `"${value}"`;
};

const header = (ctx: RenderContext): string =>
  `# 생성물이다. 손으로 고치지 않는다 — 다음 실행에 조용히 덮인다.\n` +
  `# 정본: ${ctx.sourceFile}\n# 생성: ${ctx.generatedAt}\n`;

/**
 * compose 파일을 만든다.
 *
 * **`ports:`가 없다.** cloudflared가 compose 네트워크 안에서 서비스명으로 직결하므로 터널이
 * 앱으로 가는 유일한 경로다 — 그래서 앱 안에 인증을 두지 않아도 된다는 전제가 성립한다.
 */
export const renderCompose = (spec: DeploySpec, ctx: RenderContext): string => {
  const lines = [header(ctx), `name: ${spec.name}\n`, `services:`, `  app:`];
  lines.push(`    image: ${yamlString(spec.image)}`, `    container_name: ${spec.name}-app`, `    restart: unless-stopped`);

  const envKeys = Object.keys(ctx.env);
  if (envKeys.length > 0) {
    lines.push(`    environment:`);
    for (const key of envKeys.sort()) {
      if (!ENV_KEY.test(key)) throw new Error(`환경변수 이름이 아닙니다: ${key}`);
      lines.push(`      ${key}: ${yamlString(ctx.env[key] ?? "")}`);
    }
  }

  if (spec.mounts.length > 0) {
    lines.push(`    volumes:`);
    for (const m of spec.mounts) lines.push(`      - ${yamlString(`${m.source}:${m.target}${m.readOnly ? ":ro" : ""}`)}`);
  }

  lines.push(
    `    healthcheck:`,
    `      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:${String(spec.port)}${spec.healthPath}"]`,
    `      interval: 30s`,
    `      timeout: 3s`,
    `      retries: 3`,
    `      start_period: 10s`,
    ``,
    `  tunnel:`,
    `    image: cloudflare/cloudflared:latest`,
    `    container_name: ${spec.name}-tunnel`,
    `    restart: unless-stopped`,
    // 공식 이미지 기본 사용자가 nonroot(65532)라 0600 자격증명을 못 읽는다.
    // 파일 권한을 푸는 대신 프로세스 uid를 호스트 사용자에 맞춘다.
    `    user: ${String(ctx.uid)}:${String(ctx.gid)}`,
    `    command: tunnel --no-autoupdate --config /etc/cloudflared/config.yml run`,
    `    volumes:`,
    `      - ./cloudflared.yml:/etc/cloudflared/config.yml:ro`,
    `      - ${yamlString(`${ctx.credentialsPath}:/etc/cloudflared/creds.json:ro`)}`,
    `    depends_on:`,
    `      app:`,
    `        condition: service_healthy`,
    ``,
  );
  return lines.join("\n");
};

/**
 * cloudflared 설정을 만든다.
 *
 * **마지막 catch-all이 없으면 cloudflared가 기동 자체를 거부한다.** 터널은 이름이 아니라 UUID로 적는다.
 */
export const renderCloudflared = (spec: DeploySpec, ctx: RenderContext): string =>
  `${header(ctx)}tunnel: ${ctx.tunnelId}
credentials-file: /etc/cloudflared/creds.json

ingress:
  - hostname: ${yamlString(spec.hostname)}
    service: http://app:${String(spec.port)}
  - service: http_status:404
`;
