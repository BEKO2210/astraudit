import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Roadmap M4.3 — i18n provider lives above the app so every
// component can call useTranslation(). EN is the synchronous
// fallback during the first paint; the persisted locale's catalog
// streams in via lazy import.
import { I18nProvider } from "./lib/i18n";
// Phase 6.33 — self-hosted fonts. Inter (400/500/600/700) and
// JetBrains Mono (400/500) ship as woff2 files via @fontsource so we
// can drop the Google Fonts CSS link, tighten the CSP (no third-party
// style-src / font-src), and remove one TLS round-trip from first
// paint. Latin + latin-ext only: Astraudit content is English/German,
// and the cyrillic/greek/vietnamese subsets aren't worth ~40 KB.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/latin-ext-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-ext-500.css";
import "./styles/globals.css";
// `reactflow/dist/style.css` used to live here, but Phase 4.4 lazy-
// loads the AuditGraph and we want the React Flow CSS to ship in the
// SAME chunk so we don't pay it on first paint. The import now lives
// at the top of `AuditGraph.tsx`.

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
