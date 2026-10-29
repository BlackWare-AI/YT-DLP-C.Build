package com.blackware.ytdlpcommandbuilder;

import android.content.SharedPreferences;
import android.test.InstrumentationTestCase;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

/** Real Android filesystem tests, isolated from the user's production records. */
public final class StateStoreTest extends InstrumentationTestCase {
    private File directory;
    private SharedPreferences preferences;
    private DurableStateStore store;
    @Override protected void setUp() throws Exception {
        super.setUp();
        directory = new File(getInstrumentation().getTargetContext().getCacheDir(), "store-test-" + System.nanoTime());
        assertTrue(directory.mkdirs());
        preferences = getInstrumentation().getTargetContext().getSharedPreferences("store-test-" + directory.getName(), 0);
        preferences.edit().clear().commit();
        store = new DurableStateStore(directory, preferences);
    }
    @Override protected void tearDown() throws Exception {
        for (File file : directory.listFiles()) file.delete();
        directory.delete(); preferences.edit().clear().commit(); super.tearDown();
    }
    private String payload(String notes) throws Exception {
        return new JSONObject().put("schema",2).put("settings",new JSONObject().put("engine","normal").put("mode","audio"))
            .put("links","https://instagram.com/stories/durable.user/1").put("notes",notes).put("newLink","unfinished")
            .put("cuts",new JSONArray().put(new JSONObject().put("start","3").put("end","inf")))
            .put("selection",new JSONObject().put("after","2"))
            .put("history",new JSONArray().put(new JSONObject().put("command","saved history"))).toString();
    }
    private void corrupt(String filename) throws Exception {
        try (FileOutputStream output = new FileOutputStream(new File(directory,filename))) {
            output.write("broken".getBytes(StandardCharsets.UTF_8)); output.getFD().sync();
        }
    }
    private void awaitBackup(String expected) throws Exception {
        File target=new File(directory,"builder-state-backup.json"); long end=System.currentTimeMillis()+3000;
        while(System.currentTimeMillis()<end) {
            if(target.isFile()) try {
                JSONObject envelope=new JSONObject(new String(java.nio.file.Files.readAllBytes(target.toPath()),StandardCharsets.UTF_8));
                if(expected.equals(envelope.getString("payload"))) return;
            } catch(Exception ignored) { }
            Thread.sleep(10);
        }
        fail("Timed out waiting for redundant snapshot");
    }
    private void awaitMirror(String expected) throws Exception {
        long end=System.currentTimeMillis()+3000;
        while(!expected.equals(preferences.getString("state","")) && System.currentTimeMillis()<end) Thread.sleep(10);
        assertEquals(expected,preferences.getString("state",""));
    }
    private String draft(String notes) throws Exception {
        JSONObject value=new JSONObject(payload(notes));value.remove("history");value.remove("notesDailyHistory");return value.toString();
    }
    public void testSmallDraftKeepsArchiveAndRecoversAfterRestart() throws Exception {
        JSONObject base=new JSONObject(payload("old"));
        base.put("notesDailyHistory",new JSONArray().put(new JSONObject().put("date","2026-10-28").put("notes","daily")));
        assertTrue(store.save(base.toString()));awaitBackup(base.toString());
        byte[] archive=java.nio.file.Files.readAllBytes(new File(directory,"builder-state.json").toPath());
        assertTrue(store.saveDraft(draft("latest typed notes")));
        assertTrue(java.util.Arrays.equals(archive,java.nio.file.Files.readAllBytes(new File(directory,"builder-state.json").toPath())));
        store=new DurableStateStore(directory,preferences);
        JSONObject recovered=new JSONObject(store.read());
        assertEquals("latest typed notes",recovered.getString("notes"));
        assertEquals(base.getJSONArray("history").toString(),recovered.getJSONArray("history").toString());
        assertEquals(base.getJSONArray("notesDailyHistory").toString(),recovered.getJSONArray("notesDailyHistory").toString());
        corrupt("builder-draft.json");
        assertEquals("latest typed notes",new JSONObject(store.read()).getString("notes"));
        corrupt("builder-draft-backup.json");
        assertEquals("unreadable persistent state",store.read());
        assertFalse(store.save(payload("must preserve")));assertFalse(store.saveDraft(draft("must preserve")));
    }
    public void testFullSnapshotSupersedesDraftWithoutResurrectingClearedLinks() throws Exception {
        assertTrue(store.save(payload("base")));assertTrue(store.saveDraft(draft("typed")));
        JSONObject next=new JSONObject(payload("typed")).put("links","").put("history",new JSONArray());
        assertTrue(store.save(next.toString()));awaitBackup(next.toString());
        assertFalse(new File(directory,"builder-draft.json").exists());
        corrupt("builder-state.json");
        JSONObject recovered=new JSONObject(new DurableStateStore(directory,preferences).read());
        assertEquals("",recovered.getString("links"));assertEquals(0,recovered.getJSONArray("history").length());
    }
    public void testInterruptedDraftWriteKeepsPreviousEdit() throws Exception {
        assertTrue(store.save(payload("base")));assertTrue(store.saveDraft(draft("last durable edit")));
        AtomicFile file=new AtomicFile(new File(directory,"builder-draft.json"));
        FileOutputStream out=file.startWrite();out.write('{');out.close();
        assertEquals("last durable edit",new JSONObject(new DurableStateStore(directory,preferences).read()).getString("notes"));
    }
    public void testLegacyMigrationAndRedundantCopies() throws Exception {
        String old=payload("legacy notes");
        preferences.edit().putString("state",old).commit();
        assertEquals(old,store.read());
        assertTrue(store.save(old));
        awaitBackup(old);
        assertTrue(new File(directory,"builder-state.json").isFile());
        assertTrue(new File(directory,"builder-state-backup.json").isFile());
        corrupt("builder-state.json"); assertEquals(old,store.read());
    }
    public void testNewestBackupWinsOverStaleMirror() throws Exception {
        String old=payload("old"), current=payload("newest");
        assertTrue(store.save(old)); assertTrue(store.save(current));
        awaitBackup(current);
        corrupt("builder-state.json");
        preferences.edit().putString("state",old).putLong("state_revision",0).commit();
        assertEquals(current,store.read());
    }
    public void testInterruptedWriteKeepsLastCompleteSnapshot() throws Exception {
        String current=payload("last saved before crash"); assertTrue(store.save(current));
        AtomicFile file=new AtomicFile(new File(directory,"builder-state.json"));
        FileOutputStream output=file.startWrite(); output.write('{'); output.close(); // Process died before finishWrite.
        assertEquals(current,store.read());
    }
    public void testPreferencesMirrorRecoversBothDamagedFiles() throws Exception {
        String current=payload("mirror notes"); assertTrue(store.save(current));
        awaitBackup(current); awaitMirror(current);
        corrupt("builder-state.json"); corrupt("builder-state-backup.json");
        assertEquals(current,store.read());
    }
    public void testAllDamagedCopiesFailClosed() throws Exception {
        assertTrue(store.save(payload("preserve damaged records")));
        awaitBackup(payload("preserve damaged records")); awaitMirror(payload("preserve damaged records"));
        corrupt("builder-state.json"); corrupt("builder-state-backup.json");
        preferences.edit().putString("state","broken").commit();
        assertEquals("unreadable persistent state",store.read());
        assertFalse(store.save(payload("must not overwrite")));
        assertEquals("unreadable persistent state",store.read());
    }
    public void testIntentionalClearingDoesNotResurrectOldDraft() throws Exception {
        assertTrue(store.save(payload("notes stay")));
        JSONObject cleared=new JSONObject(payload("notes stay")).put("links","").put("cuts",new JSONArray());
        assertTrue(store.save(cleared.toString())); awaitBackup(cleared.toString()); corrupt("builder-state.json");
        JSONObject recovered=new JSONObject(store.read());
        assertEquals("",recovered.getString("links")); assertEquals(0,recovered.getJSONArray("cuts").length());
        assertEquals("notes stay",recovered.getString("notes")); assertEquals(1,recovered.getJSONArray("history").length());
    }
}
