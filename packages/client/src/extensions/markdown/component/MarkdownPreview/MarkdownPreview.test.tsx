import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownPreview } from './MarkdownPreview';

describe('MarkdownPreview', () => {
  it('제목을 heading으로 그린다', () => {
    render(<MarkdownPreview markdown={'# 안녕\n\n본문'} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('안녕');
    expect(screen.getByText('본문')).toBeInTheDocument();
  });
});
