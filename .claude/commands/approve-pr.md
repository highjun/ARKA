---
description: 사용자 검토가 걸린 PR을 승인해 자동 머지로 넘긴다
argument-hint: <pr-number>
allowed-tools: Bash(gh:*)
---

PR #$1 에 대한 사용자 승인을 남겨라.

1. 승인할 대상이 맞는지 먼저 확인한다.

   ```
   gh pr view $1 --repo highjun/ARKA --json number,title,headRefOid,state,mergeable,autoMergeRequest,statusCheckRollup
   ```

   - `state`가 `OPEN`이 아니면 멈추고 알린다
   - `check`가 초록이 아니면 멈추고 알린다. 승인은 기계 검사를 건너뛰는 수단이 아니다
   - `review`가 이미 `success`면 이미 승인된 것이다. 그대로 알리고 멈춘다

2. `headRefOid`에 `review` 상태를 초록으로 올린다.

   ```
   gh api --method POST repos/highjun/ARKA/statuses/<headRefOid> \
     -f state=success -f context=review -f description="사용자가 승인함"
   ```

   **반드시 `headRefOid`에 올린다.** 다른 커밋에 올리면 관문이 안 풀린다.

3. 머지는 직접 부르지 않는다. 관문이 이미 auto-merge를 걸어뒀으므로 초록이 되는 대로 squash로 들어간다. `autoMergeRequest`가 `null`이면 그때만 `gh pr merge $1 --repo highjun/ARKA --auto --squash`로 건다.

4. 사용자에게 한 줄로 알린다 — 무엇을 승인했고, 지금 머지 대기인지 이미 들어갔는지.

머지된 뒤에는 `deploy.yml`이 그 PR에서 검사를 통과한 바로 그 이미지를 당겨 띄운다. 새로 굽지 않는다.
