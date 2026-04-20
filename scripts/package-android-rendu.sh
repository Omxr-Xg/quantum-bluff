#!/usr/bin/env bash
# Build web Capacitor + assembleRelease → APK dans Game_Versions/ (sans suffixe -debug).
# La variante release est signée avec la clé debug Gradle (installable hors Play Store, démo/rendu).
# Pour un AAB/keystore prod : Android Studio → Generate Signed App Bundle or APK…
#
set -euo pipefail

# Gradle a besoin d’un JDK. Le PATH du terminal n’inclut souvent pas Java alors qu’Android Studio embarque un JBR.
resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    return 0
  fi
  # macOS — JDK inclus dans Android Studio (chemin standard)
  local mac_jbr="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  if [[ -x "${mac_jbr}/bin/java" ]]; then
    export JAVA_HOME="$mac_jbr"
    return 0
  fi
  # Linux — emplacements courants
  for p in "${ANDROID_STUDIO_JBR:-}" "$HOME/android-studio/jbr" "/opt/android-studio/jbr"; do
    if [[ -n "$p" && -x "${p}/bin/java" ]]; then
      export JAVA_HOME="$p"
      return 0
    fi
  done
  # Dernier recours : /usr/libexec/java_home sur macOS
  if [[ -x /usr/libexec/java_home ]]; then
    local jh
    jh="$(/usr/libexec/java_home 2>/dev/null || true)"
    if [[ -n "$jh" && -x "${jh}/bin/java" ]]; then
      export JAVA_HOME="$jh"
      return 0
    fi
  fi
  echo "Erreur : aucun JDK trouvé. Installe Java 17+ (Temurin, etc.) ou définis JAVA_HOME, par exemple :"
  echo "  export JAVA_HOME=\"/Applications/Android Studio.app/Contents/jbr/Contents/Home\""
  exit 1
}

# SDK Android (Gradle lit surtout local.properties ; Android Studio le crée à l’ouverture du projet).
resolve_android_sdk() {
  local sdk=""
  if [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME}/platforms" ]]; then
    sdk="$ANDROID_HOME"
  elif [[ -d "${HOME}/Library/Android/sdk" ]]; then
    sdk="${HOME}/Library/Android/sdk"
  elif [[ -d "${HOME}/Android/Sdk" ]]; then
    sdk="${HOME}/Android/Sdk"
  fi
  if [[ -z "$sdk" ]]; then
    echo "Erreur : Android SDK introuvable. Ouvre une fois le projet dans Android Studio"
    echo "(client/android) pour installer le SDK, ou définis ANDROID_HOME vers ton dossier sdk."
    exit 1
  fi
  export ANDROID_HOME="$sdk"
  # local.properties est ignoré par git ; on le génère pour les builds en CLI.
  printf 'sdk.dir=%s\n' "$sdk" >"$ROOT/client/android/local.properties"
}

resolve_java_home

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/client/package.json').version")"
ANDROID="$ROOT/client/android"

resolve_android_sdk
OUT_APK="$ROOT/Game_Versions/Quantum-Bluff-Android-${VERSION}.apk"

cd "$ROOT/client"
npm run build:cap
npx cap sync android

cd "$ANDROID"
chmod +x ./gradlew
./gradlew assembleRelease

BUILT="$ANDROID/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$BUILT" ]]; then
  echo "APK introuvable : $BUILT"
  exit 1
fi

mkdir -p "$ROOT/Game_Versions"
cp -f "$BUILT" "$OUT_APK"
echo ""
echo "OK — APK release (signé debug) : $OUT_APK"
echo "Installation test : adb install -r \"$OUT_APK\""
