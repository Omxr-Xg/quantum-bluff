#!/usr/bin/env bash
# Copie installateurs Electron + APK Android vers server/updates et client/public/downloads.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_SRC="${ROOT}/client/dist-electron"
GAME_VERSIONS="${ROOT}/Game_Versions"
UPDATES="${ROOT}/server/updates"
PUBLIC_DL="${ROOT}/client/public/downloads"
VERSION="$(node -p "require('$ROOT/client/package.json').version")"
APK_NAME="Quantum-Bluff-Android-${VERSION}.apk"

mkdir -p "$UPDATES" "$PUBLIC_DL"

copy_file() {
  local src="$1"
  cp -f "$src" "$UPDATES/"
  cp -f "$src" "$PUBLIC_DL/"
  echo "→ $(basename "$src")"
}

shopt -s nullglob
ELECTRON_FILES=(
  "$ELECTRON_SRC"/*.exe
  "$ELECTRON_SRC"/*.dmg
  "$ELECTRON_SRC"/*-mac.zip
  "$ELECTRON_SRC"/latest.yml
  "$ELECTRON_SRC"/latest-mac.yml
)

if [[ ${#ELECTRON_FILES[@]} -gt 0 ]]; then
  for f in "${ELECTRON_FILES[@]}"; do
    copy_file "$f"
  done
else
  echo "Avertissement : aucun installateur Electron dans $ELECTRON_SRC"
fi

APK_CANDIDATES=(
  "$GAME_VERSIONS/$APK_NAME"
  "$ROOT/client/android/app/build/outputs/apk/release/app-release.apk"
)

APK_FOUND=""
for apk in "${APK_CANDIDATES[@]}"; do
  if [[ -f "$apk" ]]; then
    APK_FOUND="$apk"
    break
  fi
done

if [[ -n "$APK_FOUND" ]]; then
  cp -f "$APK_FOUND" "$UPDATES/$APK_NAME"
  cp -f "$APK_FOUND" "$PUBLIC_DL/$APK_NAME"
  echo "→ $APK_NAME"
else
  echo "Avertissement : APK introuvable. Lance : npm run package:android-rendu"
fi

# Alias sans espaces (page /downloads + GitHub Releases)
alias_release() {
  local src_name="$1" dest_name="$2"
  for dir in "$UPDATES" "$PUBLIC_DL"; do
    if [[ -f "$dir/$src_name" ]]; then
      cp -f "$dir/$src_name" "$dir/$dest_name"
      echo "→ $dest_name"
    fi
  done
}

alias_release "Quantum Bluff Setup ${VERSION}.exe" "Quantum-Bluff-Setup-${VERSION}.exe"
alias_release "Quantum Bluff-${VERSION}-arm64.dmg" "Quantum-Bluff-${VERSION}-arm64.dmg"
alias_release "Quantum Bluff-${VERSION}-arm64-mac.zip" "Quantum-Bluff-${VERSION}-arm64-mac.zip"

echo "OK — fichiers copies vers server/updates et client/public/downloads"
