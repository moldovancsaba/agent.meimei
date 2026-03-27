#!/usr/bin/env bash
# Wrap the SwiftPM binary in a minimal .app with LSUIElement (no Dock icon).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
swift build -c release
BIN=".build/release/MeiMeiMenuBar"
DEST="${1:-$ROOT/build/MeiMeiMenuBar.app}"
mkdir -p "$DEST/Contents/MacOS"
cp "$BIN" "$DEST/Contents/MacOS/MeiMeiMenuBar"
chmod +x "$DEST/Contents/MacOS/MeiMeiMenuBar"
cat >"$DEST/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>MeiMeiMenuBar</string>
  <key>CFBundleIdentifier</key>
  <string>me.agent.meimei.menubar</string>
  <key>CFBundleName</key>
  <string>MeiMei</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSUIElement</key>
  <true/>
</dict>
</plist>
PLIST
echo "Built: $DEST"
echo "Open once: open \"$DEST\""
