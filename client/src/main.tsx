import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initEruda } from "@/lib/eruda_loader";

// Initialize dev tools safely
initEruda();

createRoot(document.getElementById("root")!).render(<App />);
