#!/usr/bin/env bash
# Build MeiMei.app and verify bundle + that the process can start (GUI session).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
npm run menubar:build
APP="$ROOT/macos/MeiMei/build/MeiMei.app"
EXE="$APP/Contents/MacOS/MeiMei"
PLIST="$APP/Contents/Info.plist"

[[ -d "$APP" ]] || { echo "FAIL: missing $APP"; exit 1; }
[[ -x "$EXE" ]] || { echo "FAIL: missing or non-executable $EXE"; exit 1; }
plutil -lint "$PLIST" >/dev/null
bid="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST" 2>/dev/null || true)"
[[ "$bid" == "me.agent.meimei.menubar" ]] || { echo "FAIL: unexpected CFBundleIdentifier: $bid"; exit 1; }

echo "Opening app (background)…"
open -gj "$APP"
sleep 2
if pgrep -f '/MeiMei.app/Contents/MacOS/MeiMei' >/dev/null 2>&1; then
  echo "OK: MeiMei is running (menu bar should show sparkles / MeiMei)."
else
  echo "FAIL: MeiMei process not found — need an interactive macOS session."
  exit 1
fi
