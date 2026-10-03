import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { OrganizationProvider } from "./context/OrganizationContext.jsx";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OrganizationProvider>
      <App />
    </OrganizationProvider>
  </React.StrictMode>,
);
