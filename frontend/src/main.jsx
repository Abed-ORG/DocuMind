import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const appVersion = import.meta.env.VITE_APP_VERSION ?? "local";
const commitSha = import.meta.env.VITE_APP_COMMIT_SHA ?? "";
const appVersionLabel = commitSha
  ? `v${appVersion} (${commitSha})`
  : `v${appVersion}`;

console.info(`DocuMind ${appVersionLabel}`);

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
