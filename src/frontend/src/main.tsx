import { createRoot } from "react-dom/client";
import "@fontsource-variable/hanken-grotesk";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
