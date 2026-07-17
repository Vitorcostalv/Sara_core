# Sara Core Portable Demo

## Frontend

- Build with `npm run build -w @sara/frontend`.
- Host `apps/frontend/dist` on any HTTPS static host with SPA fallback to `index.html`.
- Configure the API endpoint at build time with `VITE_API_BASE_URL`.
- Do not place `API_AUTH_KEY`, `LLM_API_KEY`, `DATABASE_URL` or `DIRECT_DATABASE_URL` in the frontend, manifest, service worker, Capacitor config or APK.

## Backend

- Build with `npm run build -w @sara/backend`.
- The backend exposes `/health` and `/api/v1/ecology/*`.
- Required environment is documented in `System.md`: `DATABASE_URL`, optional `DIRECT_DATABASE_URL`, `CORS_ORIGIN`/`CORS_ORIGINS`, `LLM_PROVIDER`, provider keys, rate-limit and logging settings.
- Keep CORS restricted to the deployed frontend origin.
- Preserve rate limiting and avoid destructive public database operations for the thesis demo.

## Neon And Providers

- Neon/PostgreSQL credentials stay server-side only.
- LLM provider keys stay server-side only.
- Offline demo mode never queries Neon, the backend or the LLM provider.

## Online Vs Offline

- `Ao vivo` calls the configured backend.
- `Demonstracao offline` opens precomputed, versioned snapshots bundled in the frontend.
- `Automatico` checks the backend and offers an offline snapshot if the live path is unavailable. It does not silently replace a live result.

## PWA Install

- Android: open the HTTPS frontend in Chrome, use install prompt or browser menu > Install app.
- Windows: open in Edge/Chrome, use the install icon in the address bar or app menu.
- Before the presentation: open every offline scenario once, disconnect the network, reload the installed PWA, and confirm terrain, fauna sprites, reports and disclosure appear.

## Capacitor Android Wrapper

- Preferred demo path is the PWA.
- Optional wrapper should bundle `apps/frontend/dist` locally and call the remote backend only for live mode.
- The APK must not embed the Express backend, Neon credentials, LLM keys or permanent shared API secrets.
- Expected debug output after Capacitor setup: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Verification

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build -w @sara/frontend
```

Manual checks:

- Live backend/frontend generation succeeds.
- Offline reload works from the installed PWA.
- All offline scenarios show the explicit disclosure.
- Projector viewport `1366x768`, phone widths `360x800` and `390x844`, tablet `768x1024`, desktop `1920x1080`.
- No built frontend file contains `API_AUTH_KEY`, `LLM_API_KEY`, `DATABASE_URL` or `DIRECT_DATABASE_URL`.
