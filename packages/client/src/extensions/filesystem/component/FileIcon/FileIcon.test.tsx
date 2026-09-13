import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  implementsClassName,
  implementsDataComponent,
  implementsRef,
  implementsNoA11yViolations,
} from '#utils/testing';
import { FileIcon } from './FileIcon';

describe('FileIcon', () => {
  it('장식으로 표시하고, 이름으로 판정한 파일 아이콘 id 를 데이터로 싣는다', () => {
    const { container } = render(<FileIcon fileName="main.ts" />);

    expect(container.querySelector('[data-file-icon="fileTypeTs"]')).toHaveAttribute('aria-hidden', 'true');
  });

  implementsClassName((extra) => <FileIcon fileName="main.ts" {...extra} />);
  implementsDataComponent((extra) => <FileIcon fileName="main.ts" {...extra} />, 'FileIcon');
  implementsRef((extra) => <FileIcon fileName="main.ts" {...extra} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <FileIcon fileName="main.ts" />);

  it('size 를 data-size 로 노출한다', () => {
    const { container } = render(<FileIcon fileName="main.ts" size="lg" />);

    expect(container.querySelector('[data-file-icon="fileTypeTs"]')).toHaveAttribute('data-size', 'lg');
  });
});
