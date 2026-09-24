import { CoreError } from "#core/errors";
import type { InstanceId } from "./instanceMap";

export class InstanceNotRegisteredError extends CoreError {
  readonly id: InstanceId;
  constructor(id: InstanceId) {
    super(`"${id}"이(가) 어느 컨테이너에도 등록되지 않았습니다.`);
    this.id = id;
  }
}

export class CircularDependencyError extends CoreError {
  readonly path: readonly InstanceId[];
  constructor(path: readonly InstanceId[]) {
    super(`의존이 순환합니다: ${path.join(" → ")}`);
    this.path = path;
  }
}

export class ContainerDisposedError extends CoreError {
  readonly containerName: string;
  constructor(containerName: string) {
    super(`"${containerName}" 컨테이너는 이미 정리됐습니다.`);
    this.containerName = containerName;
  }
}

export class InstanceAlreadyRegisteredError extends CoreError {
  readonly id: InstanceId;
  constructor(id: InstanceId) {
    super(`"${id}"이(가) 이미 등록돼 있습니다 — 같은 토큰을 두 확장이 물리면 뒤가 앞을 조용히 덮습니다.`);
    this.id = id;
  }
}
