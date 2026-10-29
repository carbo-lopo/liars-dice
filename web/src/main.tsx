import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { SettingsProvider } from "./settings/settings.js";
import { SoundProvider } from "./audio/SoundProvider.js";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SettingsProvider>
      <SoundProvider>
        <App />
      </SoundProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
