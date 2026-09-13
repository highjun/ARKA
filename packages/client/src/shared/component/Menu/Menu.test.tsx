import { createRef } from 'react';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '#utils/axe';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Menu } from './Menu';

const Demo = (
  props: Omit<ComponentProps<typeof Menu>, 'children'> & {
    readonly contentProps?: Partial<ComponentProps<typeof Menu.Content>>;
  },
) => (
  <Menu {...props}>
    <Menu.Trigger>더보기</Menu.Trigger>
    <Menu.Content {...props.contentProps}>
      <Menu.Item>새 파일</Menu.Item>
    </Menu.Content>
  </Menu>
);

/** 프리미티브를 감싼 구조가 계약대로 동작하는지 본다 — 클릭으로 열리고 항목이 붙는다. */
describe('Menu', () => {
  it('opens the menu on trigger click(비제어)', () => {
    render(<Demo />);

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    // Radix 의 트리거는 `click`이 아니라 `pointerdown`(button 0)에서 연다 — 클릭보다 먼저 열려야
    // 즉시 위치가 안정되기 때문이다(실제 마우스는 pointerdown → click 순으로 발생한다).
    fireEvent.pointerDown(screen.getByRole('button', { name: '더보기' }), { button: 0 });

    expect(screen.getByRole('menuitem', { name: '새 파일' })).toBeInTheDocument();
  });

  it('open=false 로 제어하면 클릭해도 안 열린다', () => {
    render(<Demo open={false} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: '더보기' }), { button: 0 });

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('open=true 로 제어하면 항상 열려 있다', () => {
    render(<Demo open />);

    expect(screen.getByRole('menuitem', { name: '새 파일' })).toBeInTheDocument();
  });

  it('asChild 를 켜면 트리거 자신의 태그 없이 자식(button)에 속성만 병합한다', () => {
    // 메뉴는 닫아 둔다 — 열려 있으면 Radix 가 모달 포커스 트랩으로 포탈 밖(트리거 포함)을
    // aria-hidden 처리해 getByRole 이 못 찾는다(그 상태는 아래 pointerdown 테스트가 이미 본다).
    render(
      <Menu>
        <Menu.Trigger asChild>
          <button type="button">커스텀 버튼</button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>,
    );

    const trigger = screen.getByRole('button', { name: '커스텀 버튼' });
    expect(trigger.tagName).toBe('BUTTON');
    // 중첩됐다면 button 안에 또 button 이 있었을 것이다 — 자식이 정확히 하나(자기 자신)뿐이다.
    expect(trigger.querySelector('button')).toBeNull();
  });

  implementsDataComponent(
    (extra) => (
      <Menu open>
        <Menu.Trigger>더보기</Menu.Trigger>
        <Menu.Content {...extra}>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
    'Menu',
  );

  // `data-component`는 이제 리터럴이라 오버라이드 테스트 자체가 없다 — `MenuContentProps`가
  // `data-component`를 선언하지 않아서 prop 으로 넘기려는 시도 자체가 타입 에러로 막힌다.
  // 런타임 테스트보다 강한 보장이라 따로 안 둔다.

  implementsClassName((extra) => (
    <Menu open>
      <Menu.Trigger>더보기</Menu.Trigger>
      <Menu.Content {...extra}>
        <Menu.Item>새 파일</Menu.Item>
      </Menu.Content>
    </Menu>
  ));

  implementsForwardRef(
    (extra) => (
      <Menu open>
        <Menu.Trigger>더보기</Menu.Trigger>
        <Menu.Content {...extra}>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
    HTMLDivElement,
  );

  it('forwardRef 로 Content DOM 노드에 접근할 수 있다', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <Menu open>
        <Menu.Trigger>더보기</Menu.Trigger>
        <Menu.Content ref={ref}>
          <Menu.Item>새 파일</Menu.Item>
        </Menu.Content>
      </Menu>,
    );

    expect(ref.current).toBe(screen.getByRole('menu'));
  });

  implementsNoA11yViolations(() => <Demo open />);

  it('axe 접근성 위반이 없다(Portal로 빠져나간 실제 내용)', async () => {
    render(<Demo open />);

    // Content 는 Portal로 document.body 로 빠져나간다 — render()가 돌려주는 container 는
    // 그 형제라 안 잡힌다. 실제로 뜬 걸 검사하려면 body 를 봐야 한다.
    await expectNoA11yViolations(document.body);
  });
});
