/**
 * 컨테이너가 **없어진 경로를 물고 있는지** 본다.
 *
 * 바인드 마운트는 컨테이너를 만든 시점의 inode를 문다. 마운트 소스를 통째로 지웠다 새로
 * 만드는 빌드가 있으면 compose 설정은 그대로인데 컨테이너만 빈 inode를 계속 본다.
 * `docker restart`로는 안 고쳐지고 **재생성만 고친다** — 그래서 뜨기 전에 검사한다.
 */

/** `docker inspect`가 주는 것 중 우리가 보는 것만. */
export interface Inspected {
  readonly Name?: string;
  readonly Mounts?: readonly { readonly Source?: string }[];
  readonly Config?: { readonly Labels?: Readonly<Record<string, string>> };
}

/** 무엇이 어긋났는지. 고치는 방법이 종류마다 다르므로 구분해서 돌려준다. */
export interface Violation {
  readonly container: string;
  readonly kind: "ghost-mount" | "foreign-config";
  readonly detail: string;
}

/** 이 배포가 기대하는 자리. 컨테이너가 다른 프로젝트의 것이면 남의 것을 지울 뻔한 것이다. */
export interface Expected {
  readonly project: string;
  readonly composeFile: string;
}

/**
 * 위반 목록. 비어 있으면 떠도 좋다.
 *
 * `exists`를 주입받는다 — 실제 `docker inspect` 출력을 픽스처로 넣어 단위 테스트할 수 있게.
 * 호출부는 `existsSync`가 아니라 **realpath**를 넘긴다. 끊어진 심링크도 유령이기 때문이다.
 */
export const findGhostMounts = (
  containers: readonly Inspected[],
  exists: (path: string) => boolean,
  expected: Expected,
): readonly Violation[] => {
  const violations: Violation[] = [];
  for (const container of containers) {
    const name = container.Name?.replace(/^\//u, "") ?? "(이름 없음)";

    for (const mount of container.Mounts ?? []) {
      if (mount.Source !== undefined && !exists(mount.Source)) {
        violations.push({ container: name, kind: "ghost-mount", detail: `마운트 소스가 없습니다: ${mount.Source}` });
      }
    }

    const labels = container.Config?.Labels ?? {};
    const project = labels["com.docker.compose.project"];
    if (project !== undefined && project !== expected.project) {
      violations.push({
        container: name,
        kind: "foreign-config",
        detail: `다른 프로젝트의 컨테이너입니다: ${project} (기대: ${expected.project})`,
      });
    }
    const configFiles = labels["com.docker.compose.project.config_files"];
    if (configFiles !== undefined && configFiles !== expected.composeFile) {
      violations.push({
        container: name,
        kind: "foreign-config",
        detail: `다른 compose 파일에서 왔습니다: ${configFiles} (기대: ${expected.composeFile})`,
      });
    }
  }
  return violations;
};
