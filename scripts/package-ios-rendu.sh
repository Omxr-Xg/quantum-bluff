#!/usr/bin/env bash
# Produit un .xcarchive.zip dans Game_Versions/ pour le rendu (iOS / Capacitor).
# Prérequis : Xcode, CocoaPods non requis (SPM).
#
# Sans compte Apple payant / identité de signature : définir
#   export QB_IOS_ARCHIVE_UNSIGNED=1
# (archive sans signature — pour un .ipa installable, ouvrir Xcode → Organizer → Distribute.)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/client/package.json').version")"
ARCHIVE_DIR="$ROOT/build/ios"
ARCHIVE_PATH="$ARCHIVE_DIR/App.xcarchive"
PROJECT="$ROOT/client/ios/App/App.xcodeproj"
OUT_ZIP="$ROOT/Game_Versions/Quantum-Bluff-iOS-${VERSION}.xcarchive.zip"

cd "$ROOT/client"
npm run build:cap
npx cap sync ios

mkdir -p "$ARCHIVE_DIR"
rm -rf "$ARCHIVE_PATH"

XCODE_FLAGS=(
  -project "$PROJECT"
  -scheme App
  -configuration Release
  -destination 'generic/platform=iOS'
  -archivePath "$ARCHIVE_PATH"
  archive
)

if [[ "${QB_IOS_ARCHIVE_UNSIGNED:-}" == "1" ]]; then
  XCODE_FLAGS+=(CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=NO)
fi

xcodebuild "${XCODE_FLAGS[@]}"

rm -f "$OUT_ZIP"
(
  cd "$ARCHIVE_DIR"
  zip -r -y "$OUT_ZIP" "$(basename "$ARCHIVE_PATH")"
)

echo ""
echo "OK — archive iOS : $OUT_ZIP"
echo "Pour générer un .ipa : Xcode → Window → Organizer → Archives → Distribute App."
