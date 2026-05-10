import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
// `reactflow/dist/style.css` used to live here, but Phase 4.4 lazy-
// loads the AuditGraph and we want the React Flow CSS to ship in the
// SAME chunk so we don't pay it on first paint. The import now lives
// at the top of `AuditGraph.tsx`.

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
