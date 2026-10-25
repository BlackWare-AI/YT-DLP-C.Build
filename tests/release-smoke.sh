#!/usr/bin/env bash
set -euo pipefail
package=com.blackware.ytdlpcommandbuilder
capture_evidence() {
  adb exec-out screencap -p > release-screen.png || true
  adb logcat -d > release-logcat.txt || true
}
trap capture_evidence EXIT
adb install --no-incremental "YT-DLP-Command-Builder-v${RELEASE_VERSION}.apk"
# The emulator launcher can show an ANR dialog during first boot.
# Stop that unrelated launcher before opening the app under test.
adb shell am force-stop com.google.android.apps.nexuslauncher
adb shell am start -W -n "$package/.MainActivity"
# A cold WebView can initialize after Activity launch has returned.
# Wait for actual accessible page content rather than a fixed two-second delay.
ready=false
for attempt in {1..20}; do
  adb shell pidof "$package"
  if adb shell uiautomator dump /sdcard/release-ui.xml &&
     adb pull /sdcard/release-ui.xml release-ui.xml &&
     grep -q 'Motor seç' release-ui.xml; then
    ready=true
    break
  fi
  if [ -f release-ui.xml ] && grep -q "Pixel Launcher isn.t responding" release-ui.xml; then
    adb shell am force-stop com.google.android.apps.nexuslauncher
    adb shell am start -W -n "$package/.MainActivity"
  fi
  sleep 2
done
if [ "$ready" != true ]; then
  echo '::error::Signed APK did not expose its engine selection UI'
  exit 1
fi
cp release-ui.xml release-ui-engine.xml
# Accessibility dumps only include visible nodes on smaller emulator screens.
for attempt in {1..5}; do
  if grep -q 'Komutu kopyala' release-ui.xml; then
    echo 'Signed release UI verified: engine selection and copy action'
    exit 0
  fi
  adb shell input swipe 200 650 200 250 400
  sleep 1
  adb shell uiautomator dump /sdcard/release-ui.xml
  adb pull /sdcard/release-ui.xml release-ui.xml
done
echo '::error::Signed APK did not expose its copy action'
exit 1
