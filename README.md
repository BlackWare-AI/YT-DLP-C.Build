# YT-DLP Command Builder

**Instagram bağlantıları için yt-dlp ve yt-dlp forklarının indirme seçeneklerini kolayca ayarlayıp Termux'ta çalıştırılacak komutlar hazırlayan Android uygulaması.**

**An Android command builder that makes it easy to configure yt-dlp or yt-dlp forks for Instagram links and run the resulting commands in Termux.**

Bağlantıları ekle, motoru ve indirme biçimini seç, komutu kopyalayıp Termux'a yapıştır. Uygulama yalnızca komut oluşturur; indirme ve dönüştürme işlemlerini Termux'ta yt-dlp/FFmpeg gerçekleştirir. Uygulama Instagram hesabına giriş yapmaz veya bağlantıların erişilebilirliğini kontrol etmez.

Add your links, select an engine and download mode, then copy the command into Termux. The app only builds commands; yt-dlp/FFmpeg in Termux performs downloading and conversion. The app does not sign in to Instagram or check whether links are accessible.

## Türkçe kullanım kılavuzu

1. **Hazırlık:** Android 10 veya üzeri cihazına APK'yı ve Termux'u kur. Termux'ta çalışır bir yt-dlp kurulumu bulunsun; birleştirme, kesit ve JPG için FFmpeg de kurulu olmalı. Ortak depolama kullanacaksan Termux'a depolama erişimi ver.
2. **Dil sürümü:** Aynı GitHub Release sayfasındaki normal APK Türkçedir; dosya adı **-EN.apk** ile biten APK İngilizcedir. Uygulama içinde dil düğmesi yoktur. EN ayrı kurulur; Türkçe uygulama ve kayıtları korunur.
3. **Motor:** Standart yt-dlp için **Normal**, Story fork kurulumu için **Deneysel** seç. Deneysel komut `$HOME/yt-dlp-story-test/bin/yt-dlp` dosyasını kullanır; bu kurulum Termux'ta önceden bulunmalı.
4. **Biçim:** **Video + Ses**, **Sessiz Video**, **Yalnızca Ses**, ilk saniyelik sessiz **Kısa Kesit** veya tek JPG için **Yalnızca Kare** seç. Tüm bağlantılara aynı seçim uygulanır.
5. **Bağlantılar:** Bir veya daha fazla Instagram Story, Reels veya gönderi bağlantısını alana yapıştır. Pano düğmesi mevcut listeye ekler; yinelenen bağlantılar atlanır. Tek bağlantı eklemek için alttaki alanı ve **+ Ekle** düğmesini kullan.
6. **İsteğe bağlı seçim:** Hesap listesi veya çoklu gönderi için sıra alanlarını kullan; 1 ilk öğedir. Kesit istiyorsan başlangıç/bitiş saniyelerini gir. Kare modunda varsayılan **0,5 saniye** veya ilk saniye içindeki özel zamanı seç.
7. **Yollar:** **Gelişmiş ayarlar** içindeki indirme klasörü ve cookies.txt yolunu kendi Termux kurulumuna göre düzenle. Cookies içeriği uygulamaya alınmaz. Boş cookies yolu komuta eklenmez.
8. **Çalıştır:** **Komutu kopyala** düğmesine bas, Termux'u aç, komutu yapıştır ve çalıştır. Başarılı kopyalama komutu geçmişe kaydeder; bağlantı, kesit ve sıra alanlarını temizler. İndirme sonuçları uygulamada takip edilmez.
9. **Notlar ve geçmiş:** **Link Notları** kalıcı not alanıdır. Geçmiş düğmesinden kopyalanan komutları ve günlük **Not Günlüğü** kayıtlarını açabilir, TXT veya tam JSON yedeği dışa aktarabilirsin. Her gün tek not kaydı tutulur; o gün yapılan değişiklikler aynı kaydı günceller.
10. **Uygulamayı güncelle:** **Güncelle** GitHub sürümünü kontrol eder. Güncelleme varsa düğme beyaz olur; tekrar bastığında APK indirilip doğrulanır ve Android yükleme ekranı açılır. Son yüklemeyi Android ekranında onayla.

Yalnızca Kare modu ilk saniyeden bir JPG üretir ve geçici videoyu temizler. JPG'ler `$HOME/storage/shared/Download/Apps/YT-DLP/Frame/` klasörüne gider. Süresi dolmuş veya erişilemeyen içerikler seçilen motor tarafından indirilemeyebilir.

## APK editions

Both editions are published under **v1.1.3** in this repository: `YT-DLP-Command-Builder-v1.1.3.apk` (TR) and `YT-DLP-Command-Builder-v1.1.3-EN.apk` (EN). They use separate Android application IDs and local storage, so they can be installed together. Existing Turkish installations update in place.

## Our goal

Make yt-dlp easier to use on Android while keeping users in control. The app focuses on clear options, reliable command formatting, privacy, and a simple interface—without hiding or replacing the underlying Termux workflow.

## Features

- **Two engines:** choose standard `yt-dlp` or a custom experimental yt-dlp installation.
- **Download modes:** video with audio, video without audio, audio only, a one-second **Kısa Kesit** (`StillClip`), and **Yalnızca Kare** (`Frame`) for one high-quality JPG image from a selected video time.
- **Multiple Instagram links:** accept Stories, `/reel/`, `/p/`, and `/tv/` links on `instagram.com` or `www.instagram.com`. Clean share parameters, split glued links, and remove duplicates without querying the media. Other domains, credentials and spoofed domains are rejected; Story IDs have no length restriction.
- **Paste from clipboard:** tap the small clipboard button inside the link field to append Instagram links without replacing the current draft. Repeated links are skipped. The clipboard is read only when you tap the button.
- **Optional item positions:** for Story account lists, profile lists and post carousels, leave the three fields blank or enter an exact ordinal, an exclusive after/before boundary, or both boundaries. The panel sits between links and video cuts and works in every mode. For example, after 3 and before 7 selects items 4–6 via `--playlist-items "4:6"`. Indices are 1-based in the order returned by yt-dlp, not media IDs or guaranteed chronological order. The same selection applies to collection links in the batch; direct Story links retain `--no-playlist`. Profile-post enumeration depends on the selected motor and is currently marked non-working in upstream yt-dlp; Story account URLs use `/stories/username/`.
- **Video segments:** add multiple start/end ranges, including ranges that end at the end of a video.
- **Audio artwork:** optionally embed available thumbnails in audio files.
- **Advanced settings:** customize download and cookies paths, request delays, and overwrite behavior.
- **Link Notes:** a full-screen AMOLED notepad slides in from the left. The header shows the number of Instagram links. A standalone Instagram username is converted to its Story account URL in both the notes and main link field; recognized format annotations such as `V1s` remain text. Paste/query cleanup preserves surrounding format notes. A confirmed clear action removes only the current notes; operation history and archived daily notes remain intact. Notes and drafts are persisted locally.
- **Command preview and copy:** inspect the complete shell command before using it.
- **Local history:** switch between copied-command history and a separate Notes Log. While the app is open, notes are checked every ten minutes; one snapshot is kept per local calendar day and updated only when that day’s note text changes. Empty notes do not create records. Clearing notes never deletes either history.
- **Full settings export:** the information/history menu exports a JSON file containing settings, draft links, notes, unfinished input, item selection, cuts, command history and the daily Notes Log. Cookies file contents are never read.
- **Offline and private:** no analytics, ads or account login. Command building stays offline; the optional GitHub updater uses network access only when requested.
- **AMOLED-friendly interface:** a minimal black design optimized for Android.

## English usage guide

1. **Prepare Termux:** Install the APK on Android 10 or later, install Termux, and set up working yt-dlp and FFmpeg executables. Allow Termux access to shared storage if using a shared download folder.
2. **Choose an edition:** The regular APK on the same GitHub Release page is Turkish; the **-EN.apk** asset is English. There is no in-app language switch. EN installs separately without replacing the Turkish app or its data.
3. **Choose an engine:** **Standard** uses `yt-dlp`. **Experimental** uses the separately installed Story fork at `$HOME/yt-dlp-story-test/bin/yt-dlp`.
4. **Choose a mode:** **Video + Audio**, **Silent Video**, **Audio Only**, **Short Clip** (the first silent second), or **Frame Only** (one JPG). All links in the batch share these settings.
5. **Add Instagram links:** Paste one or more Story, Reels or post links. The clipboard button appends supported links and skips duplicates. Use the smaller field and **+ Add** for another link.
6. **Adjust optional selections:** Use item positions for account lists or post carousels (1 means the first item). Add video start/end segments if needed. Frame Only offers **0.5 seconds** or a custom time within the first second.
7. **Check paths:** Open **Advanced settings** and enter your Termux download folder and cookies.txt path. The app stores the path only. Leave cookies blank to omit the option.
8. **Run the command:** Tap **Copy command**, open Termux, paste and execute it. Successful copying saves a history record and clears link, segment and position fields. Download results are handled in Termux.
9. **Keep notes and backups:** **Link Notes** stores your notes. Open History for copied commands and the daily **Notes Log**, or export TXT/full JSON backups. Each day has one note record; changes that day update it.
10. **Update the app:** Tap **Update** to check GitHub. If an update is available, the button turns white. Tap it again to download and verify the APK, then confirm installation in Android.

Frame Only keeps one verified JPG per link in `$HOME/storage/shared/Download/Apps/YT-DLP/Frame/` and removes temporary video. The selected engine may be unable to download expired or inaccessible content.

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

These are independent configurable paths. The app stores the path, not the contents of your cookies file. Outputs go into `Video` (video with/without audio), `Audio` (audio), or `SClip` (Kısa Kesit / internal mode `StillClip`) below the main download directory. Yalnızca Kare JPG files go to `$HOME/storage/shared/Download/Apps/YT-DLP/Frame/` (the existing `Frame` folder name is unchanged). yt-dlp and the generated Frame command reuse or create their output folders.

Commands use safely escaped double-quoted arguments. Only a leading `$HOME` in a path expands; other shell substitutions stay literal. All URLs and repeated `--download-sections` options belong to one command. Frame uses the experimental yt-dlp executable and its configured cookies to download only the `*0-1` video section into a private temporary directory. FFmpeg selects the closest real frame on either side of the target (default 0.5 seconds), including the final available frame in a short or low-FPS clip. It encodes one JPG using `-q:v 1 -pix_fmt yuvj444p` at source dimensions, with no resizing, sharpening or image effects. If extraction fails or returns no valid JPG, the same temporary video supplies its first valid frame. Standard JPG is lossy. Frame keeps only one verified JPG per URL; no video retention choice remains. The generated command is a single isolated Bash invocation with no input prompts. Temporary files use `mktemp -d` in Termux private storage, with a HOME cache fallback when needed; explicit cleanup and signal/exit traps remove only the directories created by that run. Validated JPG bytes are staged and moved without overwriting existing filenames. A final summary counts successful/failed JPGs and lists failed URLs with brief reasons. Custom target times remain within the downloaded first second. Audio uses `-f "ba/b" -x --audio-format best` with artwork enabled by default. No forced MP3/M4A conversion or `--force-keyframes-at-cuts` is added. Cuts can align with source keyframes rather than exact requested boundaries.

## What the app does not do

- It does **not** download or convert files itself.
- It does **not** install or update yt-dlp or FFmpeg.
- It does **not** log in to Instagram or verify media availability.
- It does **not** guarantee that a generated command will download inaccessible or expired content.

Actual downloading and any resulting errors are handled by yt-dlp when you run the command in Termux.

## Privacy and data

Settings, drafts, unfinished add-link input, notes, selections, command history and one-per-day note snapshots are stored locally. Every edit is synchronously saved. Android keeps two independent AtomicFile snapshots with SHA-256 checksums and monotonically increasing revisions, plus a synchronized SharedPreferences mirror. The newest valid copy is restored after interruption or damage; legacy preferences migrate automatically. If all copies are unreadable, saving is blocked rather than replacing them with empty defaults. Browser builds use two localStorage slots and recover the newest valid snapshot. Saved state survives backgrounding and process termination; clearing app data or uninstalling removes local data. Links are cleared only by user deletion or successful copying; successful copying also clears video cuts and item selection, including cuts hidden in audio/StillClip mode; a history/storage failure retains the draft. The browser prototype uses localStorage. Command building does not require internet access. The optional native GitHub updater uses Internet and package-install permissions, while the WebView stays offline. No shared-storage permission, ads or analytics are included. Export your history before clearing app data or uninstalling the app.

## Building from source

The repository contains the Android project, shared web interface, tests, and GitHub Actions workflows.

- Debug build: `.github/workflows/android.yml`
- Release workflow: `.github/workflows/release.yml`
- Package: `com.blackware.ytdlpcommandbuilder`
- Current documented version: `1.1.3`

To build locally, use JDK 17, Android SDK 35, and the project's Gradle configuration:

```sh
gradle :app:assembleDebug
# Separate English APK (same version)
gradle :app:assembleDebug -PappLanguage=en
```

Press Back twice within two seconds on the main screen to exit. Back first dismisses the keyboard or closes the open panel. Exiting is blocked if the final save fails.

All modes use `<username>-<YYYYMMDD>-<HHMM>-<counter>.ext`, for example `acikgoztugce-20261025-1419-01.mp4`. Content IDs and mode/cut suffixes are removed. The two-digit `autonumber` advances for each item/section and restarts at 01 per command; different batches can share a filename when account/date/minute/counter match. `--no-overwrites` preserves files with existing names. Missing metadata keeps the existing safe fallbacks.

Debug APK output: `app/build/outputs/apk/debug/app-debug.apk`. The Actions artifact is `YT-DLP-Command-Builder-1.1.3-debug`.

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

CI tests Android 10/15 native clipboard append/copy, draft persistence, successful-copy clearing, history and TXT export. Separate instrumentation processes verify saved-draft recovery across `am force-stop`. Web tests cover failed clipboard/storage writes, duplicate handling, daily note snapshots (one per date), note clearing without history loss, username conversion, history and responsive layouts; shell tests verify argument preservation with Bash and sh. Local synthetic yt-dlp/FFmpeg fixtures verify multi-URL/multi-cut outputs, metadata fallbacks, codecs and thumbnails without accessing Instagram. Physical-device keyboard/gesture/file-picker checks and a real phone reboot remain manual checks.

Release builds require signing credentials stored in GitHub Actions secrets. Updating `.github/release-version` on main requests a signed release; the marker must match Android `versionName`. Manual workflow dispatch remains available. Release tags target the exact workflow commit; signing keys never enter source control. Refer to the workflows for build and publishing details.

## Contributing

Bug reports, feature suggestions, pull requests, and forks are welcome. Please keep changes focused on reliable command generation, Android usability, and compatibility with yt-dlp.

**YT-DLP Command Builder is an independent community project and is not affiliated with Instagram or the yt-dlp maintainers.** Use it only for content you are authorized to access and download.

## In-app updates

The **Update / Güncelle** button beside the history button checks the latest public GitHub Release. When an update is available, it turns white with black text; a second tap downloads the release APK into private cache, checks its SHA-256, package name, signing certificate and version, then opens Android’s installer. Android may first ask you to allow installs from this app. Installation always requires Android’s confirmation. Same-version APK replacements are detected using the release asset hash. Each edition downloads only its matching APK. No Instagram content or cookies are sent by the updater.
