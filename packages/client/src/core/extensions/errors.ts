import { CoreError } from "#core/errors";

export class ExtensionDependencyError extends CoreError {
  readonly id: string;
  readonly dependsOn: string;
  constructor(id: string, dependsOn: string, reason: "missing" | "failed" | "cycle") {
    super(
      reason === "missing"
        ? `"${id}"이(가) 기대는 "${dependsOn}"이(가) 목록에 없습니다.`
        : reason === "failed"
          ? `"${id}"이(가) 기대는 "${dependsOn}"이(가) 켜지지 못했습니다.`
          : `"${id}"과(와) "${dependsOn}"이(가) 서로 기댑니다.`,
    );
    this.id = id;
    this.dependsOn = dependsOn;
  }
}
