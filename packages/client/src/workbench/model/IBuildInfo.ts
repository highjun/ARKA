import { createToken } from '#core/di';

export const BuildInfoToken = createToken<IBuildInfo>('buildInfo');
/**
 * 서버가 지금 서빙 중인 번들이 언제 빌드됐는지 묻는다.
 *
 * 진단용 표시지 기능이 아니다 — 실패하면 `null`을 주고 화면은 그대로 돌아야 한다. 그래서
 * 던지지 않는다.
 */
export interface IBuildInfo {
  /** 빌드 시각을 ISO 문자열로. 알 수 없으면 `null`. */
  load(): Promise<string | null>;
}
