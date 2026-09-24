import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { Banner } from "@primer/react";
import { ErrorBoundary } from "#lib/errorBoundary";
import { ShellView } from "./ShellView";

export const RootView = observer(function RootView() {
  const errorLog = useViewModel("arka.workbench.errorLog");
  return (
    <ErrorBoundary
      onError={(error) => errorLog.report(error, "render")}
      renderFallback={(error) => (
        <Banner
          role="alert"
          variant="critical"
          title="화면을 그리다 오류가 났다"
          description={`${error.name}: ${error.message}`}
          primaryAction={<Banner.PrimaryAction onClick={() => location.reload()}>다시 불러오기</Banner.PrimaryAction>}
        />
      )}
    >
      <ShellView />
    </ErrorBoundary>
  );
});
