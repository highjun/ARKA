import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  implementsClassName,
  implementsDataComponent,
  implementsForwardRef,
  implementsNoA11yViolations,
} from '#utils/testing';
import { List } from './List';

describe('List', () => {
  describe('Markup', () => {
    it('renders an ol for the ordered variant', () => {
      const { container } = render(
        <List variant="ordered">
          <List.Item>하나</List.Item>
        </List>,
      );

      expect(container.querySelector('ol')).toHaveAttribute('data-list-kind', 'ordered');
    });

    it('inherits the checkbox kind from the list', () => {
      render(
        <List variant="checkbox">
          <List.Item>할 일</List.Item>
        </List>,
      );

      expect(screen.getByText('할 일')).toHaveAttribute('data-list-item-kind', 'checkbox');
    });

    it('lets an item opt into the checkbox kind on its own', () => {
      render(
        <List>
          <List.Item checkbox>할 일</List.Item>
        </List>,
      );

      expect(screen.getByText('할 일')).toHaveAttribute('data-list-item-kind', 'checkbox');
    });

    // 체크박스는 `aria-hidden` 이라 role 쿼리로는 안 잡힌다(disabled·readOnly라 접근성 이름을
    // 못 갖는데, 이름 없는 체크박스는 axe 위반이라 아예 접근성 트리에서 뺐다 — 목록 항목의
    // 텍스트가 이미 같은 정보를 시각적으로 전달한다). DOM 자체는 container 쿼리로 검증한다.
    it('renders a disabled checkbox input reflecting checked for checkbox items', () => {
      const { container } = render(
        <List variant="checkbox">
          <List.Item checked>완료한 일</List.Item>
          <List.Item>할 일</List.Item>
        </List>,
      );

      const [done, todo] = container.querySelectorAll('input[type="checkbox"]');
      expect(done).toBeChecked();
      expect(done).toBeDisabled();
      expect(todo).not.toBeChecked();
    });

    it('does not render a checkbox input for non-checkbox items', () => {
      const { container } = render(
        <List>
          <List.Item>일반 항목</List.Item>
        </List>,
      );

      expect(container.querySelector('input[type="checkbox"]')).not.toBeInTheDocument();
    });
  });

  describe('Root', () => {
    implementsClassName((extra) => <List {...extra}>content</List>);
    implementsDataComponent((extra) => <List {...extra}>content</List>, 'List');
    implementsForwardRef((extra) => <List {...extra}>content</List>, HTMLUListElement);
  });

  describe('Item', () => {
    implementsClassName((extra) => (
      <List>
        <List.Item {...extra}>content</List.Item>
      </List>
    ));
    implementsDataComponent(
      (extra) => (
        <List>
          <List.Item {...extra}>content</List.Item>
        </List>
      ),
      'List.Item',
    );
    implementsForwardRef(
      (extra) => (
        <List>
          <List.Item {...extra}>content</List.Item>
        </List>
      ),
      HTMLLIElement,
    );
  });

  implementsNoA11yViolations(() => (
    <List>
      <List.Item>content</List.Item>
    </List>
  ));

  implementsNoA11yViolations(() => (
    <List variant="checkbox">
      <List.Item checked>완료한 일</List.Item>
      <List.Item>할 일</List.Item>
    </List>
  ));
});
