#!/usr/bin/env bash
# Produit un .xcarchive.zip dans Game_Versions/ pour le rendu (iOS / Capacitor).
# Prérequis : Xcode, CocoaPods non requis (SPM).
#
# Sans compte Apple payant / identité de signature : définir
#   export QB_IOS_ARCHIVE_UNSIGNED=1
# (archive sans signature — pour un .ipa installable, ouvrir Xcode → Organizer → Distribute.)
#
# Pour générer aussi un .ipa installable sur iPhone (signature OK, pas UNSIGNED) :
#   cp scripts/ios/ExportOptions-adhoc.plist.example scripts/ios/ExportOptions.plist
#   # Remplace REPLACE_WITH_YOUR_TEAM_ID par ton Team ID (developer.apple.com → Membership)
#   export QB_IOS_EXPORT_IPA=1
#   bash scripts/package-ios-rendu.sh
# → Game_Versions/Quantum-Bluff-iOS-<version>.ipa
# Ad Hoc : chaque iPhone destinataire doit être enregistré (UDID) dans le compte développeur.
# Pour envoyer à tout le monde sans lister les UDID : TestFlight (même compte payant).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/client/package.json').version")"
ARCHIVE_DIR="$ROOT/build/ios"
ARCHIVE_PATH="$ARCHIVE_DIR/App.xcarchive"
PROJECT="$ROOT/client/ios/App/App.xcodeproj"
OUT_ZIP="$ROOT/Game_Versions/Quantum-Bluff-iOS-${VERSION}.xcarchive.zip"
EXPORT_DIR="$ARCHIVE_DIR/ipa-export"
IPA_OUT="$ROOT/Game_Versions/Quantum-Bluff-iOS-${VERSION}.ipa"

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

if [[ "${QB_IOS_EXPORT_IPA:-}" == "1" ]]; then
  if [[ "${QB_IOS_ARCHIVE_UNSIGNED:-}" == "1" ]]; then
    echo "Erreur : impossible d'exporter un .ipa depuis une archive non signée (QB_IOS_ARCHIVE_UNSIGNED=1)." >&2
    exit 1
  fi
  PLIST="${QB_IOS_EXPORT_PLIST:-$ROOT/scripts/ios/ExportOptions.plist}"
  if [[ ! -f "$PLIST" ]]; then
    echo "Erreur : fichier ExportOptions introuvable : $PLIST" >&2
    echo "Copie scripts/ios/ExportOptions-adhoc.plist.example (ou -development) vers scripts/ios/ExportOptions.plist et remplace le Team ID." >&2
    exit 1
  fi
  rm -rf "$EXPORT_DIR"
  mkdir -p "$EXPORT_DIR"
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist "$PLIST"
  IPA_FILE="$(find "$EXPORT_DIR" -maxdepth 1 -name '*.ipa' | head -1 || true)"
  if [[ -z "$IPA_FILE" ]]; then
    echo "Erreur : export terminé mais aucun .ipa dans $EXPORT_DIR" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$IPA_OUT")"
  cp "$IPA_FILE" "$IPA_OUT"
  echo "OK — IPA (à installer sur iPhone enregistrés / envoyer le fichier) : $IPA_OUT"
else
  echo "Pour générer un .ipa en ligne de commande : QB_IOS_EXPORT_IPA=1 (+ ExportOptions.plist). Sinon : Xcode → Organizer → Distribute App."
fi
