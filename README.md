# YT-DLP Command Builder

**A lightweight, offline Android app for building ready-to-use yt-dlp commands for Termux.**

YT-DLP Command Builder helps you prepare download commands without manually writing long terminal instructions. Paste your Instagram links, choose the output format and optional video segments, then copy the generated command into Termux.

**The app creates commands only.** It does not download media, open Instagram links, access accounts, or execute yt-dlp.

## Our goal

Make yt-dlp easier to use on Android while keeping users in control. The app focuses on clear options, reliable command formatting, privacy, and a simple interface—without hiding or replacing the underlying Termux workflow.

## Features

- **Two engines:** choose standard `yt-dlp` or a custom experimental yt-dlp installation.
- **Download modes:** video with audio, video without audio, audio only, and a one-second StillClip.
- **Multiple Instagram links:** accept Stories, `/reel/`, `/p/`, and `/tv/` links on `instagram.com` or `www.instagram.com`. Clean share parameters, split glued links, and remove duplicates without querying the media. Other domains, credentials and spoofed domains are rejected; Story IDs have no length restriction.
- **Paste from clipboard:** tap the small clipboard button inside the link field to append Instagram links without replacing the current draft. Repeated links are skipped. The clipboard is read only when you tap the button.
- **Optional item positions:** for Story account lists, profile lists and post carousels, leave the three fields blank or enter an exact ordinal, an exclusive after/before boundary, or both boundaries. The panel sits between links and video cuts and works in every mode. For example, after 3 and before 7 selects items 4–6 via `--playlist-items "4:6"`. Indices are 1-based in the order returned by yt-dlp, not media IDs or guaranteed chronological order. The same selection applies to collection links in the batch; direct Story links retain `--no-playlist`. Profile-post enumeration depends on the selected motor and is currently marked non-working in upstream yt-dlp; Story account URLs use `/stories/username/`.
- **Video segments:** add multiple start/end ranges, including ranges that end at the end of a video.
- **Audio artwork:** optionally embed available thumbnails in audio files.
- **Advanced settings:** customize download and cookies paths, request delays, and overwrite behavior.
- **Command preview and copy:** inspect the complete shell command before using it.
- **Local history:** review previous commands and export records as text.
- **Full settings export:** the information/history menu exports a JSON file containing settings, draft links, item selection, cuts and complete history. Cookies file contents are never read. This change adds export only.
- **Offline and private:** no analytics, ads, account login, or network access required by the app.
- **AMOLED-friendly interface:** a minimal black design optimized for Android.

## How to use

1. Install the Android APK from a build or release.
2. Choose **Normal yt-dlp** or **Experimental yt-dlp**.
3. Select the download mode.
4. Paste one or more supported links.
5. Add video segments if needed, or adjust paths and delays under advanced settings.
6. Tap the full-width **Copy Command** button below the engine/mode panel, open Termux, paste the command, and run it. Successful copying saves the command to history and clears the link field, video segments and item selection while keeping engine, format and advanced settings. Failed copying keeps the links.

All links in one batch use the same mode and settings. The application does not check whether a media item exists or is accessible.

## Requirements

- Android 10 or newer.
- [Termux](https://termux.dev/).
- A working [yt-dlp](https://github.com/yt-dlp/yt-dlp) installation in Termux, or the experimental executable at the configured path.
- [FFmpeg](https://ffmpeg.org/) for media merging, extraction, thumbnails, and segment processing when required.
- Access to shared storage if you use the default download folder.

The default output directory is:

```text
$HOME/storage/shared/Download/Apps/YT-DLPTemp
```

The default cookies file is:

```text
$HOME/storage/shared/Download/Apps/YT-DLPTemp/cookies.txt
```

These are independent configurable paths. The app stores the path, not the contents of your cookies file. Outputs go into `Video` (video with/without audio), `Audio` (audio), or `SClip` (StillClip) below the main download directory. yt-dlp reuses existing folders.

Commands use safely escaped double-quoted arguments. Only a leading `$HOME` in a path expands; other shell substitutions stay literal. All URLs and repeated `--download-sections` options belong to one yt-dlp invocation. Audio uses `-f "ba/b" -x --audio-format best` with artwork enabled by default. No forced MP3/M4A conversion or `--force-keyframes-at-cuts` is added. Cuts can align with source keyframes rather than exact requested boundaries.

## What the app does not do

- It does **not** download or convert files itself.
- It does **not** install or update yt-dlp or FFmpeg.
- It does **not** log in to Instagram or verify media availability.
- It does **not** guarantee that a generated command will download inaccessible or expired content.

Actual downloading and any resulting errors are handled by yt-dlp when you run the command in Termux.

## Privacy and data

Settings, drafts, and command history are stored locally on the device. Every draft edit is synchronously committed to Android SharedPreferences, so saved links survive backgrounding, process termination, crashes, and device restarts. Links are cleared only by user deletion or successful copying; successful copying also clears video cuts and item selection, including cuts hidden in audio/StillClip mode; a history/storage failure retains the draft. The browser prototype uses localStorage. The Android app does not require internet access, and it does not include ads or analytics. Export your history before clearing app data or uninstalling the app.

## Building from source

The repository contains the Android project, shared web interface, tests, and GitHub Actions workflows.

- Debug build: `.github/workflows/android.yml`
- Release workflow: `.github/workflows/release.yml`
- Package: `com.blackware.ytdlpcommandbuilder`
- Current documented version: `1.0.4`

To build locally, use JDK 17, Android SDK 35, and the project's Gradle configuration:

```sh
gradle :app:assembleDebug
```

Debug APK output: `app/build/outputs/apk/debug/app-debug.apk`. The Actions artifact is `YT-DLP-Command-Builder-1.0.4-debug`.

Validation commands:

```sh
node --test tests/engine.test.cjs
npm install --no-save --ignore-scripts playwright@1.58.2
npx playwright install chromium
node tests/ui.cjs
python -m pip install yt-dlp==2026.10.21
python tests/media_integration.py
gradle :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
gradle :app:connectedDebugAndroidTest
```

CI tests Android 10/15 native clipboard append/copy, draft persistence, successful-copy clearing, history and TXT export. Separate instrumentation processes verify saved-draft recovery across `am force-stop`. Web tests cover failed clipboard/storage writes, duplicate handling, history and responsive layouts; shell tests verify argument preservation with Bash and sh. Local synthetic yt-dlp/FFmpeg fixtures verify multi-URL/multi-cut outputs, metadata fallbacks, codecs and thumbnails without accessing Instagram. Physical-device keyboard/gesture/file-picker checks and a real phone reboot remain manual checks.

Release builds require signing credentials stored in GitHub Actions secrets. Refer to the workflows for build and publishing details.

## Contributing

Bug reports, feature suggestions, pull requests, and forks are welcome. Please keep changes focused on reliable command generation, Android usability, and compatibility with yt-dlp.

**YT-DLP Command Builder is an independent community project and is not affiliated with Instagram or the yt-dlp maintainers.** Use it only for content you are authorized to access and download.
