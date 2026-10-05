import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { OrganizationProvider } from "./context/OrganizationContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles/app.css";
import "./styles/theme-modes.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <OrganizationProvider>
        <App />
      </OrganizationProvider>
    </ThemeProvider>
  </StrictMode>
);