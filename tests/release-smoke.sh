#!/usr/bin/env bash
set -euo pipefail
package=com.blackware.ytdlpcommandbuilder
suffix=""; evidence=release; engine_label='Motor seç'; copy_label='Kopyala'
if [ "${APP_EDITION:-tr}" = en ]; then
  package="${package}.en"; suffix="-EN"; evidence=release-en; engine_label='Choose engine'; copy_label='Copy'
fi
capture_evidence() {
  adb exec-out screencap -p > "${evidence}-screen.png" || true
  adb logcat -d > "${evidence}-logcat.txt" || true
}
trap capture_evidence EXIT
adb install --no-incremental "YT-DLP-Command-Builder-v${RELEASE_VERSION}${suffix}.apk"
# The emulator launcher can show an ANR dialog during first boot.
# Stop that unrelated launcher before opening the app under test.
adb shell am force-stop com.google.android.apps.nexuslauncher
adb shell am start -W -n "$package/com.blackware.ytdlpcommandbuilder.MainActivity"
# A cold WebView can initialize after Activity launch has returned.
# Wait for actual accessible page content rather than a fixed two-second delay.
ready=false
for attempt in {1..20}; do
  adb shell pidof "$package"
  if adb shell uiautomator dump /sdcard/release-ui.xml &&
     adb pull /sdcard/release-ui.xml "${evidence}-ui.xml" &&
     grep -q "$engine_label" "${evidence}-ui.xml"; then
    ready=true
    break
  fi
  if [ -f "${evidence}-ui.xml" ] && grep -q "Pixel Launcher isn.t responding" "${evidence}-ui.xml"; then
    adb shell am force-stop com.google.android.apps.nexuslauncher
    adb shell am start -W -n "$package/com.blackware.ytdlpcommandbuilder.MainActivity"
  fi
  sleep 2
done
if [ "$ready" != true ]; then
  echo '::error::Signed APK did not expose its engine selection UI'
  exit 1
fi
cp "${evidence}-ui.xml" "${evidence}-ui-engine.xml"
# Accessibility dumps only include visible nodes on smaller emulator screens.
for attempt in {1..5}; do
  if grep -q "$copy_label" "${evidence}-ui.xml"; then
    echo 'Signed release UI verified: engine selection and copy action'
    exit 0
  fi
  adb shell input swipe 200 650 200 250 400
  sleep 1
  adb shell uiautomator dump /sdcard/release-ui.xml
  adb pull /sdcard/release-ui.xml "${evidence}-ui.xml"
done
echo '::error::Signed APK did not expose its copy action'
exit 1
