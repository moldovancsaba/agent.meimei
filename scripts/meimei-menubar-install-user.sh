#!/usr/bin/env bash
# Build (if needed), copy MeiMei Control menu bar app to ~/Applications for Spotlight, open once.
# Optional: add to Login Items (see script output — automatic add is fragile across macOS versions).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_SRC="${REPO_ROOT}/macos/MeiMei/build/MeiMei Control.app"
DEST="${HOME}/Applications/MeiMei Control.app"

if [[ ! -d "$APP_SRC" ]]; then
  echo "Building MeiMei Control.app…"
  (cd "$REPO_ROOT" && npm run menubar:build)
fi

echo "Installing to ${DEST}…"
mkdir -p "${HOME}/Applications"
rm -rf "${HOME}/Applications/MeiMeiMenuBar.app" "${HOME}/Applications/MeiMei.app" "$DEST"
cp -R "$APP_SRC" "$DEST"

# MeiMei Control reads this when Preferences → repository root is empty (no guessing after install from repo).
mkdir -p "${HOME}/.meimei"
printf "%s\n" "${REPO_ROOT}" > "${HOME}/.meimei/repository_root"

# Register with Launch Services so Spotlight picks it up sooner
open "$DEST" || true

echo ""
echo "Done."
echo "  Spotlight: ⌘Space → type **MeiMei Control** or **meimei** (app: ~/Applications/MeiMei Control.app)."
echo "  If results look stale: mdimport \"$DEST\""
echo "  Auto-start at login: System Settings → General → Login Items → add **MeiMei Control**."
echo "  (This app is LSUIElement: menu bar only, no Dock icon.)"
