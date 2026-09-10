import { down } from "./down.ts";
import type { DownOptions } from "./down.ts";
import type { Ports } from "./ports.ts";

/**
 * **버려진 미리보기를 걷는다.** teardown이 안 도는 경로가 실재하기 때문이다.
 *
 * PR이 base 브랜치 삭제로 **자동으로 닫히면 GitHub이 `closed` 이벤트를 쏘지 않는다**
 * (2026-09-11 실측 — `pr-11`이 그렇게 남았다). 워크플로만 믿으면 그런 것이 영원히 떠 있다.
 */

/** `docker compose ls`가 주는 것 중 우리가 쓰는 것만. */
export interface ComposeProject {
  readonly Name: string;
}

/** 미리보기 프로젝트의 이름 규칙. **접두사가 실배포를 지키는 유일한 선이다.** */
const PREVIEW = /^pr-([0-9]+)$/u;

/** 이름에서 PR 번호를 읽는다. 미리보기가 아니면 `undefined`. */
export const previewNumber = (project: string): number | undefined => {
  const matched = PREVIEW.exec(project);
  return matched?.[1] === undefined ? undefined : Number(matched[1]);
};

/**
 * 어느 것을 걷을지 고른다.
 *
 * PR 상태를 아는 만큼만 쓴다 — 토큰이 없어 못 물어보면 **살아 있는 것으로 친다.**
 * 모르는 것을 지우는 쪽으로 기울면 돌고 있는 미리보기를 끊는다.
 */
export const pickAbandoned = (
  projects: readonly ComposeProject[],
  isOpen: (pr: number) => boolean | undefined,
): readonly string[] =>
  projects
    .filter((project) => {
      const pr = previewNumber(project.Name);
      return pr !== undefined && isOpen(pr) === false;
    })
    .map((project) => project.Name);

/** 미리보기를 걷을 때 쓰는 옵션 — 호스트 이름이 다시 쓰이지 않으므로 Access까지 지운다. */
export const SWEEP: DownOptions = {
  containers: true, tunnel: true, dns: true, image: true, state: true, access: true,
};

/** 실제로 걷는다. 지운 이름을 돌려준다. */
export const sweep = async (
  abandoned: readonly string[],
  base: { readonly stateDir: string; readonly credentialsDir: string; readonly zone: string; readonly token: string },
  ports: Ports,
): Promise<readonly string[]> => {
  const swept: string[] = [];
  for (const name of abandoned) {
    if (previewNumber(name) === undefined) throw new Error(`미리보기가 아닙니다: ${name} — 실배포를 지울 뻔했습니다`);
    ports.log(`버려진 미리보기: ${name}`);
    if (ports.dryRun) {
      swept.push(name);
      continue;
    }
    // **하나가 실패해도 나머지를 계속 걷는다.** 상태가 망가진 것 하나 때문에 청소가 통째로
    // 멈추면, 그 다음부터는 아무것도 회수되지 않는다.
    try {
      await down({ ...base, name }, SWEEP, ports);
      swept.push(name);
    } catch (error) {
      ports.log(`  ${name} 회수 실패 — 건너뜁니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return swept;
};
