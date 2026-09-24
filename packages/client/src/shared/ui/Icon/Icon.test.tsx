import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { implementsClassName, implementsDataComponent, implementsRef, implementsNoA11yViolations } from "#lib/testing";
import { ICON_MAP, Icon } from "./Icon";
import type { IconId } from "./Icon";

describe("Icon", () => {
  it("data-icon 속성으로 아이콘 id를 노출한다", () => {
    const { container } = render(<Icon iconId="check" />);

    expect(container.querySelector('[data-icon="check"]')).toBeInTheDocument();
  });

  it("장식 요소로 취급해 aria-hidden 처리한다", () => {
    const { container } = render(<Icon iconId="check" />);

    expect(container.querySelector('[data-icon="check"]')).toHaveAttribute("aria-hidden", "true");
  });

  implementsClassName((extra) => <Icon iconId="check" {...extra} />);
  implementsDataComponent((extra) => <Icon iconId="check" {...extra} />, "Icon");
  implementsRef((extra) => <Icon iconId="check" {...extra} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <Icon iconId="check" />);

  it("size 를 data-size 로 노출한다", () => {
    const { container } = render(<Icon iconId="check" size="lg" />);

    expect(container.querySelector('[data-icon="check"]')).toHaveAttribute("data-size", "lg");
  });

  it.each(Object.keys(ICON_MAP) as IconId[])("iconId=%s 가 실제로 렌더된다", (id) => {
    const { container } = render(<Icon iconId={id} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
