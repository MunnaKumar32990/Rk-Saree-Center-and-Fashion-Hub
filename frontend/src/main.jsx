import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { registerServiceWorker } from "./utils/pwa";
import "./index.css";

const root = createRoot(document.getElementById("root"));

/**
 * The outermost error boundary wraps even the providers, so a failure inside
 * AuthProvider/CartProvider renders a recoverable message instead of a blank
 * page. Without this, a single render throw anywhere in the app left the
 * customer staring at white — including on the checkout page.
 */
root.render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);

// PWA install + offline shell. No-op on unsupported browsers.
registerServiceWorker();