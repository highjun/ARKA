# Codespaces에서 이 브랜치를 띄운다

PR의 앱을 **실제로 만져 봐야 할 때** 쓴다. 사용자 기계에서 돌리지 않는다.

```text
GitHub → Code → Codespaces → Create codespace on this branch
```

뜬 뒤 터미널에서:

```sh
pnpm --filter server run dev     # 서버
pnpm --filter client run dev     # 클라이언트 (다른 터미널)
```

**포트는 기본 비공개다.** 전달된 주소는 GitHub에 로그인한 본인만 열 수 있다 — 인증이 없는 앱을
공개 URL에 두지 않기 위해 그대로 둔다. 필요하면 포트 탭에서 가시성을 바꿀 수 있다.

워크스페이스는 `.devcontainer/workspace`다(`ARKA_WORKSPACE`). 여기에 파일을 만들어 트리·검색·에디터를
확인한다. 개인 디렉터리는 이 안에 없다.

개인 계정은 월 120 코어시간이 무료다(2코어로 60시간). 쓰고 나면 코드스페이스를 **정지**한다.
