#!/usr/bin/env bash
# Wrap the SwiftPM binary in a minimal .app with LSUIElement (no Dock icon).
# Display name: MeiMei Control. Executable remains MeiMei (SwiftPM product).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
swift build -c release
BIN=".build/release/MeiMei"
DEST="${1:-$ROOT/build/MeiMei Control.app}"
mkdir -p "$DEST/Contents/MacOS" "$DEST/Contents/Resources"
cp "$BIN" "$DEST/Contents/MacOS/MeiMei"
chmod +x "$DEST/Contents/MacOS/MeiMei"

REPO="$(cd "$ROOT/../.." && pwd)"
SRC_ICON="$REPO/public/images/logo_sovereign.png"
# iconutil requires the directory name to end with .iconset
BASE="$(mktemp -d "${TMPDIR:-/tmp}/meimei.XXXXXX")"
ICONSET="${BASE}.iconset"
mv "$BASE" "$ICONSET"
trap 'rm -rf "$ICONSET"' EXIT
if [[ -f "$SRC_ICON" ]]; then
  sipz() { sips -z "$1" "$1" "$SRC_ICON" --out "$ICONSET/$2" >/dev/null; }
  sipz 16 icon_16x16.png
  sipz 32 icon_16x16@2x.png
  sipz 32 icon_32x32.png
  sipz 64 icon_32x32@2x.png
  sipz 128 icon_128x128.png
  sipz 256 icon_128x128@2x.png
  sipz 256 icon_256x256.png
  sipz 512 icon_256x256@2x.png
  sipz 512 icon_512x512.png
  sipz 1024 icon_512x512@2x.png
  iconutil -c icns "$ICONSET" -o "$DEST/Contents/Resources/AppIcon.icns"
fi

mkdir -p "$ROOT/build"
touch "$ROOT/build/.metadata_never_index"
rm -rf "$ROOT/build/MeiMeiMenuBar.app" "$ROOT/build/MeiMei.app"

icon_keys=""
if [[ -f "$DEST/Contents/Resources/AppIcon.icns" ]]; then
  icon_keys="
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>"
fi

cat >"$DEST/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>MeiMei</string>
  <key>CFBundleIdentifier</key>
  <string>me.agent.meimei.menubar</string>
  <key>CFBundleName</key>
  <string>MeiMei Control</string>
  <key>CFBundleDisplayName</key>
  <string>MeiMei Control</string>$icon_keys
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
EOF
echo "Built: $DEST"
echo "Open once: open \"$DEST\""
