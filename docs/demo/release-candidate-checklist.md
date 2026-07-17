# Sara Core — Release Candidate Checklist

Portable thesis-demo release candidate: PWA hardening + optional Capacitor Android wrapper.

## Build

- **App version:** 0.1.0 (`apps/frontend/package.json`)
- **Commit:** `0d8ddc5` (branch `Dev-Vitor`) — plus this uncommitted RC packaging pass
- **Web build:** `npm run build -w @sara/frontend` — OK
  - Bundle: `index.html` + `assets/index-*.css` (~28 kB) + `assets/index-*.js` (~1.37 MB, ~383 kB gzip)
  - **PWA precache estimate: 1.66 MB / 5.00 MB budget** — within budget
  - `dist/` size: **~3.8 MB** (was ~635 MB before pruning a stray 631 MB `public/models/` file — see below)
- **Demo pack:** `npm run demo:pack` — OK, `.tmp/demo-pack` ~3.9 MB (git-ignored)

## Automated checks (all green)

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS (backend + frontend + shared-types) |
| `npm run lint` | PASS (all workspaces) |
| `npm run test` (backend) | PASS — **132/132** |
| `npm run test:frontend` (new smoke suite) | PASS — **23/23** |
| `npm run build -w @sara/frontend` | PASS |
| `npm run demo:pack` | PASS |

Frontend smoke suite (Vitest, `apps/frontend/src/__tests__/`):
- `offline-contract.test.ts` — 4 scenarios valid, required report sections present, referenced fauna
  sprites exist on disk, invasive snapshot references a valid terrain scenario.
- `mode-behavior.test.ts` — explicit offline vs live, restore/clear last scenario, corrupt-storage
  tolerance, snapshot validators reject junk (no silent live→snapshot substitution).
- `presentation-navigation.test.ts` — Presentation Mode enter/exit + persistence, Modo leve reduces
  workload, scenarios route to known sections.
- `pwa-metadata.test.ts` — manifest fields + icons on disk (incl. maskable), SW precaches offline
  assets, SW never intercepts `/api/`, SW caches build assets, cache version bumped.

## Tested modes

- **Online / offline / auto** run modes (logic reviewed + covered by smoke tests).
- **Presentation Mode** and **Modo leve / Equilibrado / Qualidade alta** performance profiles.
- Four **offline precomputed scenarios** (see below).

## Tested browsers / devices

- Production build served via `vite preview` and verified over HTTP (manifest, service worker,
  SPA deep route, JS/CSS/icon/texture/fauna assets all 200).
- **No physical Android/iOS device tested.** **No browser-DevTools offline/slow-network run** was
  performed in this pass. Offline behavior was validated by code review + the automated smoke suite.
- Responsive CSS reviewed for the target viewports (breakpoints at 960px / 720px, horizontal-scroll
  tab strip, safe-area insets): 360×800, 390×844, 768×1024, 1366×768, 1920×1080 — **emulation/code
  review only, not device-verified.**

## Scenarios tested (offline contract)

- [x] Amazônia coerente — high validation, no blocking contradictions
- [x] Cerrado predador/presa — trophic network + herbivore pressure
- [x] Manguezal incoerente — blocking contradictions, low score (< 60) preserved
- [x] Invasão de javali no Cerrado — impact mechanisms, references the Cerrado terrain snapshot

## PWA status

- Manifest valid; icons present incl. maskable; `start_url` `/ecology`; standalone display. ✔
- Service worker registers; app-shell + offline demo assets precached. ✔
- **Fix applied:** the SW now caches hashed build assets (`cacheFirst`) so an **offline reload
  boots the SPA** instead of a blank screen (the previous SW fetched `/assets/*.js` without ever
  storing them). Cache version bumped `v1 → v2` so an old cached release is replaced on update. ✔
- Update flow: `updatefound` → "Atualizar app" chip → reload picks up the new version. ✔
- Online/offline modes stay explicit; SW never intercepts `/api/`; no silent snapshot substitution. ✔
- **No secrets** in the built bundle (scanned for API/DB/provider keys). ✔

## APK status

- Capacitor Android project **created and synced**: `apps/frontend/android/`
  (`appId com.saracore.app`, app name "Sara Core", bundled local build, no remote wrapper).
- Icons + splash (light/dark) generated; back-button handling + safe areas wired; portrait+landscape.
- **Debug APK NOT built.** Gradle 8.2.1 downloaded and JDK 21 accepted, but the build fails with:
  `SDK location not found ... ANDROID_HOME`. **The Android SDK is not installed** in this
  environment. Install Android Studio / SDK and run `npm run android:apk`
  (see `docs/deployment/android-capacitor.md`).
- Expected output when built: `apps/frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

## Release-freeze hygiene

- [x] Precache under budget (1.66 MB / 5 MB)
- [x] Offline scenarios included in build + demo pack
- [x] No secret in the frontend build
- [x] `.tmp/demo-pack` git-ignored
- [x] `.tmp/android-release/`, `*.apk`, `*.aab`, `*.jks`, `*.keystore`, `keystore.properties`,
      `local.properties`, Android build/caches git-ignored
- [x] Android **source** project is tracked; only build artifacts are ignored
- [x] No signing key tracked

## Known limitations

- No Lighthouse / browser-driven PWA audit; no real installed-PWA offline test on a device.
- No physical Android/iOS device tested; APK not built (missing Android SDK).
- Main JS chunk is ~1.37 MB (single bundle); acceptable for the demo but not code-split.
- Offline scenarios remain precomputed snapshots (clearly disclosed, never presented as live).

## Last-minute presentation checklist

- [ ] Confirm the deployed HTTPS URL loads and installs as a PWA on the presentation device.
- [ ] Pre-open each of the four offline scenarios once (warms the cache).
- [ ] Toggle airplane mode and reload — confirm the app still boots and scenarios open.
- [ ] Enter Presentation Mode; confirm the demo flow strip and enlarged canvas.
- [ ] Switch to Modo leve if the device/projector struggles.
- [ ] Have the Windows backup + `.tmp/demo-pack` ready as a fallback.
- [ ] If using the APK: verify the back button and remote online mode beforehand.
