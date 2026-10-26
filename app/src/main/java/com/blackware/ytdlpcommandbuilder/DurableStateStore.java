package com.blackware.ytdlpcommandbuilder;

import android.content.SharedPreferences;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;

/** Two independent atomic, checksummed snapshots plus the legacy preferences mirror. */
final class DurableStateStore {
    private static final Object LOCK = new Object();
    private final AtomicFile primary;
    private final AtomicFile secondary;
    private final SharedPreferences preferences;
    private Snapshot cached;
    private final Object backupLock = new Object();
    private final AtomicReference<Snapshot> pendingBackup = new AtomicReference<>();
    private final AtomicBoolean backupScheduled = new AtomicBoolean();
    private final ExecutorService backupWriter = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "durable-state-backup"); thread.setDaemon(true); return thread;
    });

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
        final char[] hex = "0123456789abcdef".toCharArray();
        char[] result = new char[bytes.length * 2];
        for (int i = 0; i < bytes.length; i++) { int value = bytes[i] & 255; result[i * 2] = hex[value >>> 4]; result[i * 2 + 1] = hex[value & 15]; }
        return new String(result);
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
        Snapshot copy;
        synchronized (backupLock) { copy = readFile(secondary); }
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
        Snapshot snapshot = latest(); cached = snapshot;
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
            Snapshot old = cached == null ? latest() : cached;
            if (old == null && hasStoredData()) return false;
            Snapshot next = new Snapshot(Math.max(System.currentTimeMillis(), old == null ? 1 : old.revision + 1), payload);
            String digest = checksum(payload);
            String envelope = new JSONObject().put("revision", next.revision).put("payload", payload).put("sha256", digest).toString();
            // The acknowledged primary snapshot is written and verified synchronously on every edit.
            if (!writeFile(primary, envelope, next)) return false;
            cached = next;
            // Redundant recovery copies are coalesced off the WebView bridge thread.
            pendingBackup.set(next);
            scheduleBackup();
            return true;
        } catch (Exception failure) { return false; }
    } }

    private void scheduleBackup() {
        if (backupScheduled.compareAndSet(false, true)) backupWriter.execute(() -> {
            try {
                Snapshot snapshot;
                while ((snapshot = pendingBackup.getAndSet(null)) != null) {
                    String digest = checksum(snapshot.payload);
                    String envelope = new JSONObject().put("revision", snapshot.revision).put("payload", snapshot.payload).put("sha256", digest).toString();
                    synchronized (backupLock) { writeFile(secondary, envelope, snapshot); }
                    preferences.edit().putString("state", snapshot.payload).putLong("state_revision", snapshot.revision).putString("state_sha256", digest).apply();
                }
            } catch (Exception ignored) { /* The synchronously verified primary remains authoritative. */ }
            finally {
                backupScheduled.set(false);
                if (pendingBackup.get() != null) scheduleBackup();
            }
        });
    }
}
