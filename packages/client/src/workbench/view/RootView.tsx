import { useViewModel } from "#core/viewmodel";
import { observer } from "mobx-react-lite";
import { CrashScreen } from "../component/CrashScreen";
import { ErrorBoundary } from "#utils/errorBoundary";
import { ShellView } from "./ShellView";

export const RootView = observer(function RootView() {
  const errorLog = useViewModel("arka.workbench.errorLog");
  return (
    <ErrorBoundary
      onError={(error) => errorLog.report(error, "render")}
      renderFallback={(error) => (
        <CrashScreen message={`${error.name}: ${error.message}`} onReload={() => location.reload()} />
      )}
    >
      <ShellView />
    </ErrorBoundary>
  );
});
