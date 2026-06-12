#!/usr/bin/env bash
# Publie installateurs Mac/Windows/Android sur GitHub Releases (fichiers > 100 Mo).
# Prerequis : gh auth login
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/client/package.json').version")"
TAG="v${VERSION}"
TITLE="Quantum Bluff ${VERSION}"
UPDATES="${ROOT}/server/updates"

RELEASE_FILES=(
  "Quantum-Bluff-Setup-${VERSION}.exe"
  "Quantum-Bluff-${VERSION}-arm64.dmg"
  "Quantum-Bluff-${VERSION}-arm64-mac.zip"
  "Quantum-Bluff-Android-${VERSION}.apk"
  "latest.yml"
  "latest-mac.yml"
)

if ! command -v gh >/dev/null 2>&1; then
  echo "Installe GitHub CLI : brew install gh && gh auth login"
  exit 1
fi

gh auth status >/dev/null 2>&1 || {
  echo "Connecte-toi : gh auth login"
  exit 1
}

bash "$ROOT/scripts/sync-desktop-downloads.sh"

ASSETS=()
for name in "${RELEASE_FILES[@]}"; do
  path="$UPDATES/$name"
  if [[ -f "$path" ]]; then
    ASSETS+=("$path")
  else
    echo "Manquant : $path"
    exit 1
  fi
done

NOTES="Applications natives Quantum Bluff ${VERSION} - Mac (Apple Silicon), Windows et Android (APK)."

if ! gh release view "$TAG" >/dev/null 2>&1; then
  echo "Creation release brouillon ${TAG}..."
  gh release create "$TAG" --title "$TITLE" --notes "$NOTES" --draft
fi

for asset in "${ASSETS[@]}"; do
  echo "Upload ${asset##*/}..."
  gh release upload "$TAG" "$asset" --clobber
done

gh release edit "$TAG" --draft=false
echo ""
echo "OK - page /downloads :"
echo "  https://github.com/Omxr-Xg/quantum-bluff/releases/tag/${TAG}"
