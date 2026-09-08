import "../shared/reset.css";
import "../shared/globals.css";
import { Collapsible, Divider, Icon, Timestamp } from "../shared/components";

// B1 파이프라인 확인용 화면. B2에서 실제 셸이 들어오면 교체된다.
export function App() {
  return (
    <div style={{ padding: 16 }}>
      <Icon iconId="file" />
      <Divider />
      <Collapsible>
        <Collapsible.Trigger>펼치기</Collapsible.Trigger>
        <Collapsible.Content>내용</Collapsible.Content>
      </Collapsible>
      <Timestamp epoch={Date.now()} mode="datetime" />
    </div>
  );
}
