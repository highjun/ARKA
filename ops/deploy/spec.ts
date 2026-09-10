import { z } from "zod";

/**
 * 배포 한 건의 **입력 계약**. 손으로 쓰는 것은 이 파일 하나이고 나머지는 전부 파생이다.
 *
 * **빌드는 여기 없다.** `image`는 이미 만들어진 태그를 받는다 — 배포와 빌드를 한 계약에 묶으면
 * 둘 중 하나만 하고 싶을 때 길이 없다. 이미지는 `build.ts`가 따로 만든다.
 */
const Mount = z.object({
  /** 호스트 경로. **실재해야 한다** — 없으면 docker가 root 소유로 만들어 컨테이너가 못 쓴다. */
  source: z.string().min(1),
  /** 컨테이너 안 경로. */
  target: z.string().min(1),
  /** 기본은 쓰기 가능이다. 읽기만 필요하면 켠다. */
  readOnly: z.boolean().default(false),
});

/** 호스트 이름은 **점 대신 하이픈**으로 잇는다 — 무료 인증서가 한 단계 와일드카드만 덮는다. */
const Hostname = z
  .string()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/u, "소문자·숫자·하이픈과 점으로만 씁니다");

/** compose 프로젝트 이름이자 컨테이너 이름의 앞자리. 파일 이름에도 쓰이므로 좁게 받는다. */
const Name = z.string().regex(/^[a-z0-9][a-z0-9-]*$/u, "소문자로 시작하고 소문자·숫자·하이픈만 씁니다");

/**
 * `*.deploy.json`의 스키마.
 *
 * 잘못된 값으로 조용히 뜨는 것보다 여기서 죽는 편이 낫다 — 배포는 되돌리기 어렵고,
 * 틀린 호스트 이름은 남의 서비스를 가로챌 수 있다.
 */
export const DeploySpec = z.object({
  name: Name,
  hostname: Hostname,
  /** 미리 빌드된 이미지 태그. */
  image: z.string().min(1),
  /** 컨테이너 안에서 앱이 듣는 포트. **호스트에는 열지 않는다** — 터널이 유일한 길이다. */
  port: z.number().int().min(1).max(65535),
  /** 헬스체크가 두드릴 경로. 200이 나와야 배포가 성공으로 판정된다. */
  healthPath: z.string().startsWith("/").default("/"),
  mounts: z.array(Mount).default([]),
  /**
   * 비밀값이 든 `KEY=VALUE` 파일의 **호스트 경로**. 저장소에 넣지 않는다.
   *
   * 읽은 값은 생성된 compose 파일에 평문으로 들어간다 — 그 디렉터리의 권한이 곧 비밀의 권한이다.
   */
  envFile: z.string().min(1).optional(),
  /** Cloudflare Access가 들여보낼 이메일. **비우면 앱이 무인증으로 인터넷에 열린다.** */
  accessEmails: z.array(z.email()).default([]),
});
export type DeploySpec = z.infer<typeof DeploySpec>;

/**
 * 배포가 남기는 유일한 통로. `down`이 무엇을 지울지 **추측하지 않고 여기서 읽는다.**
 *
 * 이미지 이름을 `<name>:latest`로 추측하다 엉뚱한 것을 지운 전례가 있다(→ ADR 0005 참고 문헌).
 */
export const Manifest = z.object({
  sourceFile: z.string(),
  name: Name,
  hostname: Hostname,
  tunnelId: z.uuid(),
  image: z.string(),
  accessAppId: z.string().optional(),
  generatedAt: z.string(),
});
export type Manifest = z.infer<typeof Manifest>;
