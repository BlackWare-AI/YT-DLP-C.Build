## YT-DLP Command Builder 1.1.1

- Frame downloads only the first second without audio or video re-encoding and extracts a full-resolution JPG once with `-q:v 1 -pix_fmt yuvj444p`.
- Frame commands keep cookie handling in yt-dlp and continue processing other links after an individual failure.
- Frame uses the configured download directory and preserves existing outputs with numbered filenames.
- B (default) keeps only a validated JPG; A keeps the video section and JPG. Temporary work files are cleaned on failure and interruption without relying on TMPDIR.
- Android version remains 1.1.1 (version code 12).

Android 10 or newer. This app only generates commands. It does not download or query Instagram content. Signed with the existing release identity.
