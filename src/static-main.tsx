import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameRoot } from "./game/GameRoot";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameRoot />
  </StrictMode>,
);
