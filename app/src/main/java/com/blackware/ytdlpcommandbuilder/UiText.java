package com.blackware.ytdlpcommandbuilder;

import android.content.Context;

/** App-owned Android messages follow the language selected in the web interface. */
final class UiText {
    private UiText() {}
    static String get(Context context, String turkish, String english) {
        return "en".equals(context.getSharedPreferences("builder", Context.MODE_PRIVATE)
            .getString("language", "tr")) ? english : turkish;
    }
}
