# ARKASHIC 프로젝트

## 0. 프로젝트 정의

**ADE (Agent Development Environment)** — 에이전트 기반의 저작·실행·관측을 지원하는 확장 가능한 플랫폼 개발. VSCode 수준의 플러그인 아키텍처를 목표로 함.

전제 사항:
- 배포: 서버는 사용자 PC(Linux, Docker) 한 대에서 실행. 바깥에는 cloudflared Tunnel + Cloudflare Access로만 연다(→ [ADR 0014](adr/0014-remote-access.md)). 앱은 인증을 모른다
- 클라이언트: 설치 가능한 PWA 웹앱(→ [ADR 0018](adr/0018-pwa.md)). 여러 기기에서 접근. 앱 셸만 캐시하고 API는 캐시하지 않는다
- 프로토콜 버전은 요청 헤더가 싣고 서버가 판단한다(→ [ADR 0017](adr/0017-protocol-header.md))
- 멀티 디바이스 지원: 데스크톱은 본작업, 모바일은 보조작업용이되, 기능은 동등한 수준으로 유지할 것. 화면 크기 및 인터랙션 방식으로 인한 편의성만 차이를 둘 것
- 사용자: 현재는 단일 사용자로 단순화

