import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource-variable/inter/wght.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Admin from "./pages/Admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
);
