# Sara Core — Android Wrapper (Capacitor)

Optional native Android wrapper around the existing Vite PWA. It **bundles the local production
build** (`apps/frontend/dist`) — it is *not* a remote-website wrapper — so the four offline demo
scenarios, Presentation Mode and Modo leve work with no network. Online ("Ao vivo") mode still
talks to the configurable remote backend via the in-app API base URL, never a hard-coded server.

## What is in the repo

- `apps/frontend/capacitor.config.ts` — `appId: com.saracore.app`, `appName: Sara Core`,
  `webDir: dist`, no `server.url` (bundled assets), `androidScheme: https`.
- `apps/frontend/android/` — the **maintained** native Android Studio project (tracked in git).
  Build outputs (`android/app/build/`, `android/.gradle/`) and `local.properties` are git-ignored.
- `apps/frontend/assets/logo.png` — 1024×1024 icon source used to generate launcher icons + splash.
- App icons and splash (light + dark) generated under `android/app/src/main/res/`.
- Android hardware/gesture **back button** handling: `src/pwa/androidBack.ts`
  (`useAndroidBackButton` + `useCloseOnAndroidBack`), wired in `AppShell` so the info dialog and
  Presentation Mode close on back before the app minimizes.
- **Safe areas**: `viewport-fit=cover` + `env(safe-area-inset-*)` padding on the header/content.
- **Orientation**: portrait and landscape both supported (no forced lock).

## Prerequisites (install locally to build the APK)

1. **JDK 17+** — a JDK 21 is already present at
   `C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot`. Gradle honors `JAVA_HOME`; make sure
   it points at the JDK 21 (the bare `java` on PATH may still be an old JDK 8 — that is fine as
   long as `JAVA_HOME` is the 21).
2. **Android SDK** — the missing piece. Install **Android Studio** (bundles the SDK, platform-tools
   and build-tools), or the command-line tools. Then either:
   - set `ANDROID_HOME` to the SDK path (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`), or
   - create `apps/frontend/android/local.properties` with `sdk.dir=C:\\...\\Android\\Sdk`.
   Accept the SDK licenses (`sdkmanager --licenses`).

The Gradle wrapper (`gradlew`, Gradle 8.2.1) downloads itself on first run — no separate Gradle
install is needed.

## Scripts

From repo root (or the `-w @sara/frontend` equivalents):

| Root script | What it does |
| --- | --- |
| `npm run build -w @sara/frontend` | Production web build (prunes dead `dist/models`, checks precache budget). |
| `npm run android:sync` | Build web + `cap sync android` (copies `dist` into the native project, updates plugins). |
| `npm run android:open` | Open the project in Android Studio. |
| `npm run android:apk` | Sync + `gradlew assembleDebug` (produces the debug APK). |
| `npm run android:apk:copy` | Copy the built APK to the ignored `.tmp/android-release/sara-core-debug.apk`. |

Debug APK output path:

```
apps/frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## Finishing the build locally

```bash
# 1. install Android Studio / SDK, set ANDROID_HOME (see above)
# 2. from repo root:
npm run android:apk
npm run android:apk:copy   # optional: drops it in .tmp/android-release/
```

Or open in Android Studio and Run/▶ onto a device or emulator:

```bash
npm run android:open
```

## Regenerating icons / splash

Replace `apps/frontend/assets/logo.png` (≥1024×1024) then:

```bash
cd apps/frontend
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#fffaf0' --iconBackgroundColorDark '#14231c' \
  --splashBackgroundColor '#fffaf0' --splashBackgroundColorDark '#14231c'
```

## Safety notes

- **No secrets** are embedded. The frontend never ships API/DB/provider keys; online mode reaches
  the backend through the configurable base URL only.
- **No Express backend** is included in the APK — only the static frontend.
- Never commit `*.apk`, `*.aab`, `*.jks`, `*.keystore`, `keystore.properties`, `local.properties`,
  or Gradle build/caches — all are git-ignored.
