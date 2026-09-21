---
description: 사용자 검토가 걸린 PR을 이유와 함께 되돌려보낸다
argument-hint: <pr-number> <이유>
allowed-tools: Bash(gh:*)
---

PR #$1 을 사용자 이름으로 거절해라. 이유: $2

1. 대상을 확인한다.

   ```
   gh pr view $1 --repo highjun/ARKA --json number,title,headRefOid,state,autoMergeRequest
   ```

   `state`가 `OPEN`이 아니면 멈추고 알린다.

2. 걸어둔 자동 머지를 먼저 푼다. 안 풀면 나중에 검사가 초록이 되는 순간 들어가 버린다.

   ```
   gh pr merge $1 --repo highjun/ARKA --disable-auto
   ```

3. `headRefOid`에 `review` 상태를 빨갛게 올린다.

   ```
   gh api --method POST repos/highjun/ARKA/statuses/<headRefOid> \
     -f state=failure -f context=review -f description="사용자가 되돌려보냄"
   ```

4. 이유를 PR에 남긴다. 사용자가 준 문장을 그대로 쓰되, 무엇을 고쳐야 하는지가 드러나게 적는다.

   ```
   gh pr comment $1 --repo highjun/ARKA --body "..."
   ```

5. 사용자에게 한 줄로 알린다 — 무엇을 왜 되돌려보냈는지.

PR은 닫지 않는다. 브랜치에 새 커밋이 올라가면 관문이 다시 돌면서 `review`가 새 커밋 위에서 다시 판정되고, 자동 머지도 그때 다시 걸린다.
