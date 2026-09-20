import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PortalProvider } from "#utils/portal";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Kbd } from "#component/Kbd";
import { Menu } from "./index";
import styles from "./Menu.module.css";

const OverlayStage = ({ children }: { readonly children: ReactNode }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div style={{ position: "relative", height: 480, width: 720, overflow: "hidden", transform: "translateZ(0)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}>
        <PortalProvider container={container ?? undefined}>{children}</PortalProvider>
      </div>
      <div ref={setContainer} />
    </div>
  );
};

const meta = {
  title: "00-shared/Menu",
  component: Menu,
  decorators: [
    (Story) => (
      <OverlayStage>
        <Story />
      </OverlayStage>
    ),
  ],
  render: (args) => (
    <Menu {...args}>
      <Menu.Trigger asChild>
        <IconButton
          variant="invisible"
          size="small"
          aria-label="더 보기"
          icon={() => <Icon iconId="ellipsis" size="sm" />}
        />
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>세션</Menu.Label>
        <Menu.Item onSelect={() => undefined} shortcut={<Kbd>F2</Kbd>}>
          이름 바꾸기
        </Menu.Item>
        <Menu.Item onSelect={() => undefined}>보관</Menu.Item>
        <Menu.Separator />
        <Menu.Item disabled>삭제</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { defaultOpen: true } };
export const Closed: Story = { args: { defaultOpen: false } };

export const Context: Story = {
  args: { kind: "context", defaultOpen: true },
  render: (args) => (
    <Menu {...args}>
      <Menu.Trigger>
        <div className={styles["demoTrigger"]}>여기를 우클릭</div>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>파일</Menu.Label>
        <Menu.Item onSelect={() => undefined}>새 파일</Menu.Item>
        <Menu.Item onSelect={() => undefined}>이름 바꾸기</Menu.Item>
        <Menu.Separator />
        <Menu.Item disabled>삭제</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
};
