import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsNoA11yViolations, implementsRef } from '#utils/testing';
import { DiffView, diffLineKindOf } from './DiffView';

/** 줄 종류를 접두로만 가리는 계약을 본다 — 파서가 아니다. */
describe('diffLineKindOf', () => {
  it('파일 머리를 추가·삭제보다 먼저 본다 — +++/--- 가 add/del 로 보이면 안 된다', () => {
    expect(diffLineKindOf('+++ b/a.ts')).toBe('meta');
    expect(diffLineKindOf('--- a/a.ts')).toBe('meta');
  });

  it('@@ 로 시작하면 hunk 다', () => {
    expect(diffLineKindOf('@@ -1,4 +1,4 @@')).toBe('hunk');
  });

  it('+/- 한 글자는 추가·삭제다', () => {
    expect(diffLineKindOf('+새 줄')).toBe('add');
    expect(diffLineKindOf('-옛 줄')).toBe('del');
  });

  it('diff·index 머리도 meta 다', () => {
    expect(diffLineKindOf('diff --git a/a b/a')).toBe('meta');
    expect(diffLineKindOf('index 1a2b..3c4d 100644')).toBe('meta');
  });

  it('나머지는 문맥 줄이다', () => {
    expect(diffLineKindOf(' 그대로인 줄')).toBe('ctx');
    expect(diffLineKindOf('')).toBe('ctx');
  });
});

/** 줄마다 종류가 data 속성으로 실리는지 본다 — 색은 CSS가 그것으로 고른다. */
describe('DiffView', () => {
  it('줄을 갈라 종류를 data-kind 로 드러낸다', () => {
    const { container } = render(<DiffView text={'@@ -1 +1 @@\n+새 줄\n-옛 줄'} />);

    const kinds = [...container.querySelectorAll('[data-kind]')].map((node) => node.getAttribute('data-kind'));
    expect(kinds).toEqual(['hunk', 'add', 'del']);
  });

  it('빈 원문이면 빈 줄 하나를 그린다 — split 의 결과가 그렇다', () => {
    const { container } = render(<DiffView text="" />);

    expect(container.querySelectorAll('[data-kind]')).toHaveLength(1);
  });

  implementsClassName((extra) => <DiffView text="a" {...extra} />);
  implementsDataComponent((extra) => <DiffView text="a" {...extra} />, 'DiffView');
  implementsRef<HTMLPreElement>((extra) => <DiffView text="a" {...extra} />, HTMLPreElement);
  implementsNoA11yViolations(() => <DiffView text={'@@ -1 +1 @@\n+새 줄'} />);
});
