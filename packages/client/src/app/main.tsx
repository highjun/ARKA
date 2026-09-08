import "../shared/reset.css";
import "../shared/globals.css";
import { ViewModelProvider } from "#core/view-model";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createApplication } from "./application";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root element is missing from index.html");
}

// 컨테이너는 앱에 하나다. React 리렌더와 무관하게 살아야 하므로 트리 밖에서 만든다.
createRoot(root).render(
  <StrictMode>
    <ViewModelProvider container={createApplication()}>
      <App />
    </ViewModelProvider>
  </StrictMode>,
);
