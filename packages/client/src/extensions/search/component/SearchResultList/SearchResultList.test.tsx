import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsNoA11yViolations, implementsRef } from '#utils/testing';
import { SearchResultList } from './SearchResultList';

const FILES = [
  { path: 'a.ts', matches: [{ line: 3, column: 5, preview: '  const a = 1;  ' }] },
  { path: 'b.ts', matches: [{ line: 7, column: 1, preview: 'const b = 2;' }] },
];

/** 파일별 묶음과 자리 선택이 계약대로 동작하는지 본다. */
describe('SearchResultList', () => {
  it('파일마다 머리글을 그리고 자리를 줄 번호와 함께 보여 준다', () => {
    render(<SearchResultList files={FILES} onSelect={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'a.ts' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('줄 내용의 앞뒤 공백을 떼어 낸다 — 들여쓰기 때문에 빈 칸부터 보이면 읽기 어렵다', () => {
    render(<SearchResultList files={FILES} onSelect={() => undefined} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('자리를 고르면 그 파일 경로와 자리를 함께 준다', () => {
    const onSelect = vi.fn();
    render(<SearchResultList files={FILES} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('const b = 2;'));

    expect(onSelect).toHaveBeenCalledWith('b.ts', { line: 7, column: 1, preview: 'const b = 2;' });
  });

  it('결과가 없으면 아무 행도 그리지 않는다', () => {
    render(<SearchResultList files={[]} onSelect={() => undefined} />);

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  implementsClassName((extra) => <SearchResultList files={FILES} onSelect={() => undefined} {...extra} />);
  implementsDataComponent((extra) => <SearchResultList files={FILES} onSelect={() => undefined} {...extra} />, 'SearchResultList');
  implementsRef<HTMLUListElement>((extra) => <SearchResultList files={FILES} onSelect={() => undefined} {...extra} />, HTMLUListElement);
  implementsNoA11yViolations(() => <SearchResultList files={FILES} onSelect={() => undefined} />);
});
