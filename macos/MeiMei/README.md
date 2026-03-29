# MeiMei Control (menu bar app)

Small macOS status-bar control app: **Start / Stop / Restart** the launchd stack, **Open dashboard in browser**, **Reveal control log**, **Preferences** (repo root, health URL, HTTPS base). Everything else (Apps, Tools, OpenClaw, Checklist) is only in the web dashboard.

**Finding the repo:** `npm run menubar:install` writes `~/.meimei/repository_root` so Control does not need Preferences. Or set **MeiMei repository root** manually, or put the checkout under e.g. `~/Projects/agent.meimei`, or set env **`MEIMEI_REPO_ROOT`**.

## Background

We could not find a public course or repo named **“Amanoba”** for menu bar apps. This target follows the same ideas as common SwiftUI menu bar material—especially **status item + SwiftUI**—like Anagh Sharma’s **Ambar** template ([repo](https://github.com/AnaghSharma/Ambar-SwiftUI), [write-up](https://www.anaghsharma.com/blog/macos-menu-bar-app-with-swiftui/)). On macOS 13+, Apple’s **`MenuBarExtra`** replaces much of the manual `NSStatusItem` / `NSPopover` wiring.

## Requirements

- macOS 13 (Ventura) or newer  
- Swift 5.9+ (`swift` from Xcode Command Line Tools)

## Build a Dockless .app

From this directory:

```bash
chmod +x build-app.sh
./build-app.sh
open "build/MeiMei Control.app"
```

Or only the binary (may show a Dock icon unless you run from an `.app` with `LSUIElement`):

```bash
swift build -c release
.build/release/MeiMei
```

## Configure

**MeiMei Control → Preferences…** (or the first run defaults):

- **HTTPS base URL** — default `https://meimei.localhost:8443` (no trailing slash), for dashboard / Apps / Tools links.

Stored in `UserDefaults` under `meimei.baseURL`, `meimei.repoRoot`, `meimei.healthCheckURL`. OpenClaw and Checklist are **not** in this app — open them from the dashboard in the browser.

## Repo root

```text
macos/MeiMei/
  Package.swift
  Sources/MeiMei.swift
  build-app.sh
  README.md
```

Optional: add `npm run menubar:build` from the repository root (see root `package.json`).

## Spotlight and auto-launch

There is **no** control app pre-installed by the repo: you build it locally. The built bundle is **`MeiMei Control.app`** with executable **`MeiMei`** (process name in Activity Monitor). Each build touches `build/.metadata_never_index` so **Spotlight should not index** the repo `build/` copy—use **`~/Applications/MeiMei Control.app`** as the canonical install.

- **Spotlight:** install once:
  ```bash
  npm run menubar:install
  ```
  Then **⌘Space** → **MeiMei Control** or `meimei`. The app icon comes from `public/images/logo_sovereign.png`. If Spotlight still shows a stale name, run **`mdimport ~/Applications/MeiMei Control.app`**.

- **Start automatically at login:** **System Settings → General → Login Items & Extensions → Open at Login** → add **MeiMei Control** from Applications.

### Local services (dashboard + HTTPS proxy + health watcher)

The menu bar shows **live status** from `GET` on the **Health check URL** (Preferences → default `http://127.0.0.1:45285/api/health`). **Start / Stop / Restart** run the same orchestration scripts on a **background queue** (no main-thread `waitUntilExit`). Script output is appended to **`~/.meimei/logs/MeiMeiControl.log`** (“Reveal control log” in the menu).

When **MeiMei Control** starts the platform, it runs `scripts/meimei-menubar-orchestrate-start.sh` against your **agent.meimei** checkout:

- **`meimei-domain install`** — `com.agent.meimei.dashboard-ui` + `com.agent.meimei.dashboard-proxy` (logs under `~/.meimei/logs/`; see `docs/operations/meimei-platform-launchd.v1.md`)
- If **`com.agent.meimei.dashboard-health`** is not loaded, installs it (periodic probe → `GET /api/health` → `kickstart` UI if needed)

When you **Quit MeiMei Control**, it runs `scripts/meimei-menubar-orchestrate-stop.sh` and unloads those agents.

**Repository root:** If you copy **MeiMei Control.app** to `~/Applications`, set **MeiMei Control → Preferences → MeiMei repository root** to your checkout (e.g. `~/Projects/agent.meimei`). If you only run the app from `macos/MeiMei/build/MeiMei Control.app` inside the repo, the path is detected automatically.

CLI equivalents from the repo: `npm run menubar:services:start` / `npm run menubar:services:stop`.

**`npm run dashboard:watchdog:install`** now runs the same **`meimei-domain install`** + health installer (no duplicate `com.agent.meimei.dashboard` job). Prefer one flow; avoid hand-editing LaunchAgent plists outside the repo templates.

This bundle uses **`LSUIElement`**: it appears in the **menu bar**, not the Dock.
