import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '#utils/axe';
import { implementsClassName, implementsDataComponent, implementsRef, implementsNoA11yViolations } from '#utils/testing';
import { ContextMenu } from './ContextMenu';

const Demo = (
  props: Omit<ComponentProps<typeof ContextMenu>, 'children'> & {
    readonly contentProps?: Partial<ComponentProps<typeof ContextMenu.Content>>;
  },
) => (
  <ContextMenu {...props}>
    <ContextMenu.Trigger>영역</ContextMenu.Trigger>
    <ContextMenu.Content {...props.contentProps}>
      <ContextMenu.Item>이름 바꾸기</ContextMenu.Item>
    </ContextMenu.Content>
  </ContextMenu>
);

/** 프리미티브를 감싼 구조가 계약대로 동작하는지 본다 — 우클릭으로 열리고 항목이 붙는다. */
describe('ContextMenu', () => {
  it('opens the menu on context menu event(비제어)', () => {
    render(<Demo />);

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText('영역'));

    expect(screen.getByRole('menuitem', { name: '이름 바꾸기' })).toBeInTheDocument();
  });

  it('open=false 로 제어하면 우클릭해도 안 열린다', () => {
    render(<Demo open={false} />);

    fireEvent.contextMenu(screen.getByText('영역'));

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('open=true 로 제어하면 항상 열려 있다', () => {
    render(<Demo open />);

    expect(screen.getByRole('menuitem', { name: '이름 바꾸기' })).toBeInTheDocument();
  });

  it('defaultOpen이 uncontrolled 시작값이 된다', () => {
    render(<Demo defaultOpen />);

    expect(screen.getByRole('menuitem', { name: '이름 바꾸기' })).toBeInTheDocument();
  });

  implementsDataComponent(
    (extra) => (
      <ContextMenu open>
        <ContextMenu.Trigger>영역</ContextMenu.Trigger>
        <ContextMenu.Content {...extra}>
          <ContextMenu.Item>이름 바꾸기</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    ),
    'ContextMenu',
  );

  // `data-component`는 이제 리터럴이라 오버라이드 테스트 자체가 없다 — `ContextMenuContentProps`가
  // `HTMLAttributes`를 상속하지 않아서(다른 컴포넌트와 달리) `data-component`를 prop 으로 넘기려는
  // 시도 자체가 타입 에러로 막힌다. 런타임 테스트보다 강한 보장이라 따로 안 둔다.

  implementsClassName((extra) => (
    <ContextMenu open>
      <ContextMenu.Trigger>영역</ContextMenu.Trigger>
      <ContextMenu.Content {...extra}>
        <ContextMenu.Item>이름 바꾸기</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  ));

  implementsRef(
    (extra) => (
      <ContextMenu open>
        <ContextMenu.Trigger>영역</ContextMenu.Trigger>
        <ContextMenu.Content {...extra}>
          <ContextMenu.Item>이름 바꾸기</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    ),
    HTMLDivElement,
  );

  implementsNoA11yViolations(() => <Demo open />);

  it('axe 접근성 위반이 없다(Portal로 빠져나간 실제 내용)', async () => {
    render(<Demo open />);

    // Content 는 Portal로 document.body 로 빠져나간다 — render()가 돌려주는 container 는
    // 그 형제라 안 잡힌다. 실제로 뜬 걸 검사하려면 body 를 봐야 한다.
    await expectNoA11yViolations(document.body);
  });
});
