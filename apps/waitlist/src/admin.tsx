import "@fontsource-variable/cairo/wght.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Admin from "./pages/Admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
);
