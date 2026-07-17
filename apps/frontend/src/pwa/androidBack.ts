import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * Custom event the hardware/gesture back button dispatches on Android.
 *
 * Any open overlay (dialog, bottom sheet, inspector) should add a listener, and if it is the
 * topmost dismissible surface, call `event.preventDefault()` and close itself. If nothing calls
 * preventDefault, the back press falls through to minimizing the app (standard Android home
 * behavior) instead of leaving a blank/exited screen.
 */
export const ANDROID_BACK_EVENT = "sara:android-back";

/**
 * Wire the Android hardware back button once, at the app root. No-op on web/PWA (only registers
 * when running inside the native Capacitor Android shell), so it is safe to always call.
 */
export function useAndroidBackButton(): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    let disposed = false;
    const handle = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      // Give open overlays a chance to consume the back press first.
      const claimed = !window.dispatchEvent(new CustomEvent(ANDROID_BACK_EVENT, { cancelable: true }));
      if (claimed) return;

      // Nothing open: let in-app SPA history handle it, else minimize the app.
      if (canGoBack && window.history.length > 1) {
        window.history.back();
        return;
      }
      void CapacitorApp.minimizeApp();
    });

    return () => {
      disposed = true;
      void handle.then((listener) => {
        if (disposed) listener.remove();
      });
    };
  }, []);
}

/**
 * Helper for an overlay component: while `open` is true, claim the Android back press by calling
 * `onClose` and preventing the default (minimize). Returns nothing; use inside a component.
 */
export function useCloseOnAndroidBack(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onBack = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    window.addEventListener(ANDROID_BACK_EVENT, onBack);
    return () => window.removeEventListener(ANDROID_BACK_EVENT, onBack);
  }, [open, onClose]);
}
