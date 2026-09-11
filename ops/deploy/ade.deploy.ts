import { DeploySpec } from "./spec.ts";

/**
 * ADE의 **실배포 스펙**. 손으로 쓰는 것은 이 파일 하나다.
 *
 * JSON이 아니라 `.ts`인 이유는 이 저장소가 설정을 옮겨 온 이유와 같다 — JSON에는 **왜 그 값인지
 * 적을 자리가 없다.** 아래 주석들이 없으면 다음 사람이 마운트 하나를 지우고도 모른다.
 * PR 미리보기는 이 파일을 읽지 않고 같은 타입의 객체를 그때그때 만든다.
 */
export const adeDeploy: DeploySpec = DeploySpec.parse({
  name: "ade",

  // workbench가 쓰던 자리를 승계한다(→ ADR 0005 라운드 F). 승계 전 검증은 `ade.sangjun.dev`로 한다.
  hostname: "arka.sangjun.dev",

  // `build.ts`가 만든 태그. 이 계약은 빌드를 하지 않는다.
  image: "ade:latest",

  // 컨테이너 안에서만 듣는다. 호스트에는 열리지 않는다 — 터널이 유일한 길이다.
  port: 3000,

  // 프로토콜 헤더 없이 부를 수 있는 둘 중 하나라 wget 한 줄로 검사된다.
  healthPath: "/api/health",

  mounts: [
    // **사용자의 개인 지식 디렉터리 전체다.** ADE에는 인증이 없으므로 Access가 뚫리면 이것이
    // 통째로 열린다 — `accessEmails`를 비우지 않는 것이 이 마운트의 전제다.
    { source: "/home/highjun/ARKA", target: "/workspace", readOnly: false },
    // 세션·이벤트 SQLite. 워크스페이스 **안**이라 파일 트리에도 보이고 감시 이벤트도 뜬다.
    // 배포 전에 `mkdir -p` 해 둬야 한다 — 없으면 docker가 root 소유로 만들어 컨테이너가 못 쓴다.
    { source: "/home/highjun/ARKA/.arka", target: "/data", readOnly: false },
  ],

  // 여기 이메일만 들어온다. **비우면 인터넷에 무인증으로 열린다.**
  accessEmails: ["highjun10170@gmail.com"],

  // `envFile`은 아직 두지 않는다 — `ADE_AGENT_RUNNER`가 기본 `scripted`라 비밀 없이 뜨고,
  // 없는 파일을 가리키면 `up`이 선다. 실제 실행기를 켜는 날 이 줄과 그 파일이 같이 생긴다.
});
