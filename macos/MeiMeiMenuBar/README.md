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
open build/MeiMeiMenuBar.app
```

Or only the binary (may show a Dock icon unless you run from an `.app` with `LSUIElement`):

```bash
swift build -c release
.build/release/MeiMeiMenuBar
```

## Configure

**MeiMei → Preferences…** (or the first run defaults):

- **MeiMei base URL** — default `https://meimei.localhost:8443` (no trailing slash).
- **OpenClaw chat URL** — default `http://127.0.0.1:18789/chat?session=main`.

Stored in `UserDefaults` under keys `meimei.baseURL` and `meimei.openclawChatURL`.

## Repo root

```text
macos/MeiMeiMenuBar/
  Package.swift
  Sources/MeiMeiMenuBar.swift
  build-app.sh
  README.md
```

Optional: add `npm run menubar:build` from the repository root (see root `package.json`).
