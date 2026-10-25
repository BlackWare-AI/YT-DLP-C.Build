# YT-DLP Command Builder

**A lightweight, offline Android app for building ready-to-use yt-dlp commands for Termux.**

YT-DLP Command Builder helps you prepare download commands without manually writing long terminal instructions. Paste your Instagram links, choose the output format and optional video segments, then copy the generated command into Termux.

**The app creates commands only.** It does not download media, open Instagram links, access accounts, or execute yt-dlp.

## Our goal

Make yt-dlp easier to use on Android while keeping users in control. The app focuses on clear options, reliable command formatting, privacy, and a simple interface—without hiding or replacing the underlying Termux workflow.

## Features

- **Two engines:** choose standard `yt-dlp` or a custom experimental yt-dlp installation.
- **Download modes:** video with audio, video without audio, audio only, and a one-second StillClip.
- **Multiple links:** paste several links and generate one command with the same settings for all of them.
- **Video segments:** add multiple start/end ranges, including ranges that end at the end of a video.
- **Audio artwork:** optionally embed available thumbnails in audio files.
- **Advanced settings:** customize download and cookies paths, request delays, and overwrite behavior.
- **Command preview and copy:** inspect the complete shell command before using it.
- **Local history:** review previous commands and export records as text.
- **Offline and private:** no analytics, ads, account login, or network access required by the app.
- **AMOLED-friendly interface:** a minimal black design optimized for Android.

## How to use

1. Install the Android APK from a build or release.
2. Choose **Normal yt-dlp** or **Experimental yt-dlp**.
3. Select the download mode.
4. Paste one or more supported links.
5. Add video segments if needed, or adjust paths and delays under advanced settings.
6. Tap **Copy Command**, open Termux, paste the command, and run it.

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

These are configurable paths. The app stores the path, not the contents of your cookies file.

## What the app does not do

- It does **not** download or convert files itself.
- It does **not** install or update yt-dlp or FFmpeg.
- It does **not** log in to Instagram or verify media availability.
- It does **not** guarantee that a generated command will download inaccessible or expired content.

Actual downloading and any resulting errors are handled by yt-dlp when you run the command in Termux.

## Privacy and data

Settings, drafts, and command history are stored locally on the device. The Android app does not require internet access, and it does not include ads or analytics. Export your history before clearing app data or uninstalling the app.

## Building from source

The repository contains the Android project, shared web interface, tests, and GitHub Actions workflows.

- Debug build: `.github/workflows/android.yml`
- Release workflow: `.github/workflows/release.yml`
- Package: `com.blackware.ytdlpcommandbuilder`
- Current documented version: `1.0.2`

To build locally, use JDK 17, Android SDK 35, and the project's Gradle configuration:

```sh
gradle :app:assembleDebug
```

Debug APK output: `app/build/outputs/apk/debug/app-debug.apk`.

Release builds require signing credentials stored in GitHub Actions secrets. Refer to the workflows for build and publishing details.

## Contributing

Bug reports, feature suggestions, pull requests, and forks are welcome. Please keep changes focused on reliable command generation, Android usability, and compatibility with yt-dlp.

**YT-DLP Command Builder is an independent community project and is not affiliated with Instagram or the yt-dlp maintainers.** Use it only for content you are authorized to access and download.
