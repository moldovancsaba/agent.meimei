#!/usr/bin/env bash
# Build (if needed), copy MeiMei menu bar app to ~/Applications for Spotlight, open once.
# Optional: add to Login Items (see script output — automatic add is fragile across macOS versions).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_SRC="${REPO_ROOT}/macos/MeiMei/build/MeiMei.app"
DEST="${HOME}/Applications/MeiMei.app"

if [[ ! -d "$APP_SRC" ]]; then
  echo "Building MeiMei.app…"
  (cd "$REPO_ROOT" && npm run menubar:build)
fi

echo "Installing to ${DEST}…"
mkdir -p "${HOME}/Applications"
rm -rf "${HOME}/Applications/MeiMeiMenuBar.app" "$DEST"
cp -R "$APP_SRC" "$DEST"

# Register with Launch Services so Spotlight picks it up sooner
open "$DEST" || true

echo ""
echo "Done."
echo "  Spotlight: ⌘Space → type **meimei** (app: ~/Applications/MeiMei.app)."
echo "  If results look stale: mdimport ~/Applications/MeiMei.app"
echo "  Auto-start at login: System Settings → General → Login Items → add **MeiMei**."
echo "  (This app is LSUIElement: menu bar only, no Dock icon.)"
