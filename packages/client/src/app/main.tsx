import "./reset.css";
import "./globals.css";
import { ContainerProvider } from "#core/viewmodel";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RootView } from "../workbench/view/RootView";
import { createApplication } from "./createApplication";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root element is missing from index.html");
}

createRoot(root).render(
  <StrictMode>
    <ContainerProvider container={createApplication()}>
      <RootView />
    </ContainerProvider>
  </StrictMode>,
);
