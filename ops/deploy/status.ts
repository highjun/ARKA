import path from "node:path";
import { findGhostMounts } from "./ghostMount.ts";
import { Manifest } from "./spec.ts";
import type { Inspected, Violation } from "./ghostMount.ts";
import type { Ports } from "./ports.ts";

/**
 * 지금 무엇이 떠 있고 어디로 열려 있는지. **아무것도 바꾸지 않는다.**
 *
 * 유령 마운트 검사를 `up`과 나눠 쓴다 — 배포하지 않고도 "이 컨테이너가 다음 재시작에
 * 죽을 상태인가"를 물을 수 있어야 한다.
 */
export interface Status {
  readonly name: string;
  readonly manifest: Manifest | undefined;
  /** 컨테이너 이름 → docker가 보고한 상태. 없으면 빈 객체다. */
  readonly containers: Readonly<Record<string, string>>;
  readonly violations: readonly Violation[];
}

interface WithState extends Inspected {
  readonly State?: { readonly Status?: string; readonly Health?: { readonly Status?: string } };
}

/** 배포 하나의 상태를 읽는다. */
export const status = async (name: string, stateDir: string, ports: Ports): Promise<Status> => {
  const dir = path.join(stateDir, name);
  const manifestFile = path.join(dir, "manifest.json");
  const parsed = ports.fs.exists(manifestFile)
    ? Manifest.safeParse(JSON.parse(ports.fs.readFile(manifestFile)))
    : undefined;

  const inspected = await ports.exec("docker", ["inspect", `${name}-app`, `${name}-tunnel`]);
  const containers: Record<string, string> = {};
  let parsedContainers: readonly WithState[] = [];
  if (inspected.code === 0) {
    parsedContainers = JSON.parse(inspected.stdout) as readonly WithState[];
    for (const container of parsedContainers) {
      const label = container.Name?.replace(/^\//u, "") ?? "(이름 없음)";
      containers[label] = container.State?.Health?.Status ?? container.State?.Status ?? "unknown";
    }
  }

  return {
    name,
    manifest: parsed?.success === true ? parsed.data : undefined,
    containers,
    violations: findGhostMounts(parsedContainers, (p) => ports.fs.realpath(p) !== undefined, {
      project: name,
      composeFile: path.join(dir, "compose.yml"),
    }),
  };
};

/** 사람이 읽는 한 덩어리로. */
export const formatStatus = (state: Status): string => {
  const lines = [`# ${state.name}`];
  lines.push(
    state.manifest === undefined
      ? "  manifest 없음 — 이 이름으로 배포한 적이 없거나 상태가 지워졌습니다"
      : `  ${state.manifest.hostname} · 터널 ${state.manifest.tunnelId} · 이미지 ${state.manifest.image}`,
  );
  const names = Object.keys(state.containers);
  if (names.length === 0) lines.push("  컨테이너 없음");
  for (const name of names) lines.push(`  ${name}: ${state.containers[name] ?? "?"}`);
  for (const violation of state.violations) lines.push(`  ⚠ ${violation.container}: ${violation.detail}`);
  return lines.join("\n");
};
