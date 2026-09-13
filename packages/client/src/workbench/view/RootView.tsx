import { useViewModel } from '#core/viewmodel';
import { ErrorLogToken } from '../model/IErrorLog';
import { CrashScreen } from '../component/CrashScreen';
import { ErrorBoundary } from '../component/ErrorBoundary';
import { ShellView } from './ShellView';

/**
 * 앱의 맨 바깥. 셸이 렌더 중 죽으면 `CrashScreen`으로 바꾸고 오류를 `IErrorLog`에 남긴다.
 *
 * `ShellView`와 분리한 이유 — ErrorBoundary는 자기 자신의 오류를 못 잡는다. 셸 안에 두면 셸이
 * 죽을 때 같이 죽는다.
 */
export const RootView = () => {
  const errorLog = useViewModel(ErrorLogToken);
  return (
    <ErrorBoundary
      onError={(error) => errorLog.report(error, 'render')}
      renderFallback={(error) => <CrashScreen message={`${error.name}: ${error.message}`} onReload={() => location.reload()} />}
    >
      <ShellView />
    </ErrorBoundary>
  );
};
