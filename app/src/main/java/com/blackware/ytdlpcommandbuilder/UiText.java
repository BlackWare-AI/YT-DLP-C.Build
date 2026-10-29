package com.blackware.ytdlpcommandbuilder;

import android.content.Context;

/** Native product copy follows the fixed APK edition. */
final class UiText {
    private UiText() {}
    static String get(Context context, String turkish, String english) {
        return BuildConfig.ENGLISH_EDITION ? english : turkish;
    }
}
