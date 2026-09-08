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
    it('ordered variant 는 ol 로 렌더링한다', () => {
      const { container } = render(
        <List variant="ordered">
          <List.Item>하나</List.Item>
        </List>,
      );

      expect(container.querySelector('ol')).toHaveAttribute('data-list-kind', 'ordered');
    });

    it('항목이 리스트의 checkbox kind 를 물려받는다', () => {
      render(
        <List variant="checkbox">
          <List.Item>할 일</List.Item>
        </List>,
      );

      expect(screen.getByText('할 일')).toHaveAttribute('data-list-item-kind', 'checkbox');
    });

    it('항목이 스스로 checkbox kind 를 선택할 수 있다', () => {
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
    it('checkbox 항목은 checked 를 반영한 disabled checkbox input 을 렌더링한다', () => {
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

    it('checkbox 가 아닌 항목에는 checkbox input 을 렌더링하지 않는다', () => {
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
