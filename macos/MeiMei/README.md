# MeiMei menu bar app

Small macOS status-bar app: open the local MeiMei HTTPS dashboard, Apps/Tools, Admin, OpenClaw chat, copy URL, preferences.

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
open build/MeiMei.app
```

Or only the binary (may show a Dock icon unless you run from an `.app` with `LSUIElement`):

```bash
swift build -c release
.build/release/MeiMei
```

## Configure

**MeiMei → Preferences…** (or the first run defaults):

- **MeiMei base URL** — default `https://meimei.localhost:8443` (no trailing slash).
- **OpenClaw chat URL** — default `http://127.0.0.1:18789/chat?session=main`.

Stored in `UserDefaults` under keys `meimei.baseURL` and `meimei.openclawChatURL`.

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

There is **no** MeiMei menu bar app pre-installed by the repo: you build it locally. The built bundle is **`MeiMei.app`** with executable **`MeiMei`**, so Spotlight and Activity Monitor show **MeiMei**. Each build touches `build/.metadata_never_index` so **Spotlight should not index** the repo `build/` copy—use **`~/Applications/MeiMei.app`** as the canonical install.

- **Spotlight (type “meimei”):** install once:
  ```bash
  npm run menubar:install
  ```
  Then **⌘Space** → `meimei`. The app icon comes from `public/images/logo_sovereign.png`. If Spotlight still shows a stale name, run **`mdimport ~/Applications/MeiMei.app`**.

- **Start automatically at login:** **System Settings → General → Login Items & Extensions → Open at Login** → add **MeiMei** from Applications. (The dashboard **server** is separate: `meimei-domain` / `dashboard:watchdog` — this menu app only opens URLs.)

This bundle uses **`LSUIElement`**: it appears in the **menu bar**, not the Dock.
