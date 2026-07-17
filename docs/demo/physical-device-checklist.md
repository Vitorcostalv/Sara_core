# Sara Core — Physical Device Checklist

Run this on **real hardware** before the TCC. Browser emulation is not a substitute — the items
below (airplane mode, PWA install, hardware back button, projector legibility) only prove out on a
device. Tick each box on the device you will actually present with.

> Status note: as of the release-candidate pass, **no physical Android or iOS device was tested**
> and **no APK was built** (Android SDK not installed in the build environment). The PWA offline
> behavior was validated by automated contract tests + code review, not by a real installed PWA.
> Everything below is still **to be done by the presenter**.

## A. Android PWA (recommended primary path)

- [ ] Deploy the frontend over **HTTPS** (see `docs/deployment/portable-demo.md`).
- [ ] Open the URL in Chrome on Android; confirm the **Install PWA** prompt/chip appears.
- [ ] Install the PWA to the home screen and launch it from the icon (standalone, no browser bar).
- [ ] Open **every** offline scenario (Amazônia, Cerrado predador/presa, Manguezal incoerente,
      Invasão de javali) with the network still on.
- [ ] Enable **airplane mode**.
- [ ] **Fully close** the app (swipe from recents) and **reopen** it.
- [ ] Confirm the app shell boots offline (no blank screen) and SPA navigation works.
- [ ] Re-open all four offline scenarios offline; confirm terrain **and** fauna sprites render.
- [ ] Confirm the offline disclosure banner is visible (no live simulation implied).
- [ ] Verify **Presentation Mode** enlarges the canvas and keeps the demo flow visible.
- [ ] Verify **Modo leve** reduces particles/shadows/agent count.
- [ ] Rotate: test **portrait and landscape**; confirm no horizontal overflow and panels still close.
- [ ] Turn the network back on; run a **live** scenario and confirm online mode is explicit.

## B. Android APK (Capacitor)

> Requires building the debug APK first — see `docs/deployment/android-capacitor.md`
> (`npm run android:apk`). Blocked until the Android SDK is installed.

- [ ] Install the debug APK (`app-debug.apk`) on the device (allow unknown sources).
- [ ] Open the app once (with network) so assets are ready.
- [ ] Enable **airplane mode**.
- [ ] **Fully close** and **reopen** the app.
- [ ] Open **all four** offline scenarios; confirm no blank screen and no missing assets.
- [ ] Test the **Android hardware/gesture back button**:
  - [ ] Back closes the "Como o Sara Core funciona" dialog.
  - [ ] Back exits Presentation Mode.
  - [ ] Back on open bottom sheets/inspector dismisses them before minimizing.
  - [ ] Back on the base screen minimizes the app (does not blank/crash).
- [ ] Verify terrain, water, caves and fauna sprites render (icons + splash look correct on launch).
- [ ] Test **portrait and landscape**; confirm safe areas (status bar / notch / gesture bar) are clear.
- [ ] Separately verify **remote online mode**: set the backend URL in Configurações avançadas and
      run a live scenario over the network.

## C. Windows backup (fallback if mobile fails)

- [ ] Open the deployed URL in Edge/Chrome on the presentation laptop.
- [ ] Install the PWA if supported (address-bar install icon).
- [ ] Reload with the network **offline** (DevTools → Network → Offline, or disconnect).
- [ ] Open all four offline scenarios offline.
- [ ] Confirm report cards are legible at the **projector resolution** (1366×768 and 1920×1080).

## D. Last-resort emergency pack

- [ ] `npm run demo:pack` produced `.tmp/demo-pack` (static build + prompts + checklist).
- [ ] Serve it locally (`npx serve .tmp/demo-pack`) and confirm the offline scenarios open.
