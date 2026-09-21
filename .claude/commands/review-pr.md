---
description: 사용자 검토가 필요하다고 걸린 PR의 항목을 가져와 읽는다
argument-hint: <pr-number>
allowed-tools: Bash(gh:*), Bash(git:*), Bash(node ops/needsReview.ts:*)
---

PR #$1 에서 사용자 검토가 걸린 항목을 가져와 사용자가 판단할 수 있게 정리해라.

1. 판정 결과를 가져온다. 관문이 적어둔 것을 읽을 뿐, 다시 계산하지 않는다.

   ```
   gh pr view $1 --repo highjun/ARKA --json number,title,headRefOid,baseRefOid,url,statusCheckRollup
   gh api repos/highjun/ARKA/issues/$1/comments --paginate \
     --jq '[.[] | select(.body | startswith("<!-- arka:review -->"))] | .[-1].body // empty'
   ```

   코멘트가 비어 있으면 관문이 아직 안 돌았다는 뜻이다. `statusCheckRollup`의 `check`와 `review` 상태를 보고 그대로 알린다.

2. 걸린 항목마다 **실제로 무엇이 바뀌었는지** 보여준다. 목록만으로는 판단할 수 없다.

   - 계약: `gh pr diff $1 --repo highjun/ARKA -- packages/contracts/`
   - `packages/` 밖: `gh pr diff $1 --repo highjun/ARKA` 에서 해당 파일만

3. 사용자에게 이렇게 보고한다.

   - PR 번호·제목·`check` 상태
   - 계약 변경: 선언마다 **전 → 후**를 한 줄로. 깨지는 변경(필드·enum 값 제거, 타입 좁힘)인지 덧붙이는 변경인지 분명히 말한다
   - `packages/` 밖 변경: 파일마다 한 줄로 무엇을 왜 바꿨는지. **관문·배포·도구를 무르게 만드는 변경이 있으면 먼저 말한다**
   - 마지막에 `/approve-pr $1` 또는 `/reject-pr $1 <이유>`

판단을 대신하지 마라. 사실을 정확히 뽑아 보여주는 데까지가 이 명령의 일이다.
