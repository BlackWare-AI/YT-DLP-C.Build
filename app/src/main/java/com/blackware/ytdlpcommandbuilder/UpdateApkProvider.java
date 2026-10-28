package com.blackware.ytdlpcommandbuilder;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Exposes exactly one verified APK, read-only, through a temporary URI grant. */
public final class UpdateApkProvider extends ContentProvider {
    static final String MIME = "application/vnd.android.package-archive";
    static Uri uri(android.content.Context context) {
        return Uri.parse("content://" + context.getPackageName() + ".updates/update.apk");
    }
    static File apk(android.content.Context context) { return new File(context.getCacheDir(), "update.apk"); }
    private void check(Uri value) {
        if (!uri(getContext()).equals(value)) throw new SecurityException("Unknown update URI");
    }
    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri value) { check(value); return MIME; }
    @Override public ParcelFileDescriptor openFile(Uri value, String mode) throws FileNotFoundException {
        check(value);
        if (!"r".equals(mode)) throw new SecurityException("Read-only update");
        return ParcelFileDescriptor.open(apk(getContext()), ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Cursor query(Uri value, String[] projection, String selection, String[] args, String sort) {
        check(value);
        String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
        MatrixCursor cursor = new MatrixCursor(columns);
        Object[] row = new Object[columns.length];
        for (int i=0;i<columns.length;i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(columns[i])) row[i]="YT-DLP-Command-Builder.apk";
            else if (OpenableColumns.SIZE.equals(columns[i])) row[i]=apk(getContext()).length();
        }
        cursor.addRow(row); return cursor;
    }
    @Override public Uri insert(Uri value, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri value, String selection, String[] args) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri value, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
}
