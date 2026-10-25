package com.blackware.ytdlpcommandbuilder;

import android.content.SharedPreferences;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.json.JSONObject;

/** Two independent atomic, checksummed snapshots plus the legacy preferences mirror. */
final class DurableStateStore {
    private static final Object LOCK = new Object();
    private final AtomicFile primary;
    private final AtomicFile secondary;
    private final SharedPreferences preferences;

    DurableStateStore(File directory, SharedPreferences preferences) {
        primary = new AtomicFile(new File(directory, "builder-state.json"));
        secondary = new AtomicFile(new File(directory, "builder-state-backup.json"));
        this.preferences = preferences;
    }

    private static final class Snapshot {
        final long revision;
        final String payload;
        Snapshot(long revision, String payload) { this.revision = revision; this.payload = payload; }
    }

    private static void validate(String payload) throws Exception {
        JSONObject state = new JSONObject(payload);
        state.getJSONObject("settings");
        state.getJSONArray("cuts");
        state.getJSONArray("history");
        if (!(state.get("links") instanceof String)) throw new IllegalArgumentException("Invalid draft");
        for (String key : new String[]{"notes", "newLink"}) {
            if (state.has(key) && !(state.get(key) instanceof String)) throw new IllegalArgumentException("Invalid " + key);
        }
    }

    private static String checksum(String payload) throws Exception {
        byte[] bytes = MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder(64);
        for (byte value : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
        return result.toString();
    }

    private Snapshot readFile(AtomicFile file) {
        try {
            JSONObject envelope = new JSONObject(new String(file.readFully(), StandardCharsets.UTF_8));
            String payload = envelope.getString("payload");
            if (!checksum(payload).equals(envelope.getString("sha256"))) return null;
            validate(payload);
            return new Snapshot(envelope.getLong("revision"), payload);
        } catch (Exception invalid) { return null; }
    }

    private Snapshot latest() {
        Snapshot best = readFile(primary);
        Snapshot copy = readFile(secondary);
        if (copy != null && (best == null || copy.revision > best.revision)) best = copy;
        try {
            String payload = preferences.getString("state", "");
            if (!payload.isEmpty()) {
                validate(payload);
                long revision = preferences.getLong("state_revision", 0);
                if (revision > 0 && !checksum(payload).equals(preferences.getString("state_sha256", ""))) throw new IllegalArgumentException("Invalid mirror checksum");
                if (best == null || revision > best.revision) best = new Snapshot(revision, payload);
            }
        } catch (Exception invalid) { /* Keep either valid atomic snapshot. */ }
        return best;
    }

    private boolean exists(AtomicFile file) {
        File base = file.getBaseFile();
        return base.exists() || new File(base.getPath() + ".bak").exists() || new File(base.getPath() + ".new").exists();
    }

    private boolean hasStoredData() {
        return exists(primary) || exists(secondary) || preferences.contains("state");
    }

    String read() { synchronized (LOCK) {
        Snapshot snapshot = latest();
        if (snapshot != null) return snapshot.payload;
        // Fail closed in JS: unreadable records must never be replaced with defaults.
        return hasStoredData() ? "unreadable persistent state" : "";
    } }

    private boolean writeFile(AtomicFile file, String envelope, Snapshot expected) {
        FileOutputStream output = null;
        try {
            output = file.startWrite();
            output.write(envelope.getBytes(StandardCharsets.UTF_8));
            output.getFD().sync();
            file.finishWrite(output);
            output = null;
            Snapshot actual = readFile(file);
            return actual != null && actual.revision == expected.revision && actual.payload.equals(expected.payload);
        } catch (Exception failure) {
            if (output != null) { try { file.failWrite(output); } catch (Exception ignored) { /* Keep the other copies. */ } }
            return false;
        }
    }

    boolean save(String payload) { synchronized (LOCK) {
        try {
            validate(payload);
            Snapshot old = latest();
            if (old == null && hasStoredData()) return false;
            Snapshot next = new Snapshot(Math.max(System.currentTimeMillis(), old == null ? 1 : old.revision + 1), payload);
            String envelope = new JSONObject().put("revision", next.revision).put("payload", payload)
                .put("sha256", checksum(payload)).toString();
            boolean first = writeFile(primary, envelope, next);
            boolean second = writeFile(secondary, envelope, next);
            boolean mirror = false;
            try { mirror = preferences.edit().putString("state", payload).putLong("state_revision", next.revision).putString("state_sha256", checksum(payload)).commit(); }
            catch (Exception failure) { /* Either atomic copy still counts as durable success. */ }
            // Acknowledgement requires at least one verified, durable current copy.
            return first || second || mirror;
        } catch (Exception failure) { return false; }
    } }
}
