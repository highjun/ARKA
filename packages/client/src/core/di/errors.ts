import { CoreError } from "#core/errors";
import type { InstanceId } from "./instanceMap";

/** `Container.resolve`가 지도에는 있으나 아무도 물리지 않은 id를 받았다. */
export class InstanceNotRegisteredError extends CoreError {
  readonly id: InstanceId;
  /** `id`를 필드로도 남긴다 — 잡는 쪽이 메시지를 다시 파싱하지 않게. */
  constructor(id: InstanceId) {
    super(`"${id}"이(가) 어느 컨테이너에도 등록되지 않았습니다.`);
    this.id = id;
  }
}

/** 둘 이상이 만들어지는 중에 서로를 물고 돌았다. `path`가 돈 순서다 — id가 곧 이름이라 그대로 읽힌다. */
export class CircularDependencyError extends CoreError {
  readonly path: readonly InstanceId[];
  /** 경로를 그대로 메시지에 싣는다 — 스택 오버플로로 터지면 어느 id가 원인인지 알 수 없다. */
  constructor(path: readonly InstanceId[]) {
    super(`의존이 순환합니다: ${path.join(" → ")}`);
    this.path = path;
  }
}

/**
 * 이미 dispose된 컨테이너에서 꺼내려 했다. 늦게 온 콜백이 죽은 탭을 건드린 것이다.
 *
 * 부모 것을 대신 주지 않는다 — 죽은 탭의 일을 살아 있는 앱에 대고 하게 된다.
 */
export class ContainerDisposedError extends CoreError {
  /** `createChild`에 준 이름. 어느 탭이 죽었는지 그대로 읽힌다. */
  readonly containerName: string;
  /** 이름을 필드로도 남긴다 — 잡는 쪽이 메시지를 다시 파싱하지 않게. */
  constructor(containerName: string) {
    super(`"${containerName}" 컨테이너는 이미 정리됐습니다.`);
    this.containerName = containerName;
  }
}
