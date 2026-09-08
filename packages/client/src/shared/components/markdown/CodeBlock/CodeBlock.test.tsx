import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  describe('Markup', () => {
    it('numbers every line and tags syntax tokens', () => {
      const { container } = render(<CodeBlock content={'const x = 1;\nreturn x;'} language="ts" title="example.ts" />);

      expect(screen.getByText('ts')).toBeInTheDocument();
      expect(screen.getByText('example.ts')).toBeInTheDocument();
      expect(container.querySelector('[data-language="ts"]')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-token="keyword"]').length).toBeGreaterThan(0);
    });

    it('defaults the language to "text" when omitted', () => {
      render(<CodeBlock content="hello" />);

      expect(screen.getByText('text')).toBeInTheDocument();
    });

    implementsClassName((extra) => <CodeBlock content="hello" {...extra} />);
    implementsDataComponent((extra) => <CodeBlock content="hello" {...extra} />, 'CodeBlock');
    implementsForwardRef((extra) => <CodeBlock content="hello" {...extra} />, HTMLElement);
    implementsNoA11yViolations(() => <CodeBlock content="const x = 1;" language="ts" />);
  });

  describe('State', () => {
    it('marks itself copied after the copy control is pressed, then resets', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      render(<CodeBlock content="code" language="ts" />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

      await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
      expect(writeText).toHaveBeenCalledWith('code');

      await waitFor(() => expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument(), {
        timeout: 2000,
      });
      vi.unstubAllGlobals();
    });
  });
});
