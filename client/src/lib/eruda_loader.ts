/**
 * Safely initialize Eruda dev‑tools only in development and only when the
 * browser permits access to `localStorage` / other Web APIs. This prevents the
 * uncaught DOMException you just saw, which comes from Eruda poking at
 * forbidden APIs inside the Replit sandbox.  In production builds, Eruda is
 * skipped entirely.
 *
 * Usage (e.g. in `src/main.tsx` or `src/index.ts`):
 * -------------------------------------------------------------------------
 *   import { initEruda } from "@/lib/eruda_loader";
 *   initEruda();
 * -------------------------------------------------------------------------
 */

export async function initEruda(): Promise<void> {
  // Only attempt to load Eruda in dev mode and in a real browser environment.
  if (import.meta.env.MODE !== "development" || typeof window === "undefined") {
    return;
  }

  try {
    // Dynamically import to keep Eruda out of the main bundle.
    const eruda = await import(/* @vite-ignore */ "eruda");

    // Eruda v3 default export is a namespace with an `init` method.
    eruda.default.init();
  } catch (err) {
    /*
     * Most common failure: `DOMException: Failed to read the 'localStorage'
     * property from 'Window': Access is denied for this document.`  When that
     * happens we swallow the error to avoid crashing the app, but we still
     * log it so you know dev‑tools didn't load.
     */
    // eslint-disable-next-line no-console
    console.warn("[eruda] dev‑tools failed to initialize:", err);
  }
}