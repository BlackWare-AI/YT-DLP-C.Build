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
        preferences = getInstrumentation().getTargetContext().getSharedPreferences("store-test", 0);
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
    public void testLegacyMigrationAndRedundantCopies() throws Exception {
        String old=payload("legacy notes");
        preferences.edit().putString("state",old).commit();
        assertEquals(old,store.read());
        assertTrue(store.save(old));
        assertTrue(new File(directory,"builder-state.json").isFile());
        assertTrue(new File(directory,"builder-state-backup.json").isFile());
        corrupt("builder-state.json"); assertEquals(old,store.read());
    }
    public void testNewestBackupWinsOverStaleMirror() throws Exception {
        String old=payload("old"), current=payload("newest");
        assertTrue(store.save(old)); assertTrue(store.save(current));
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
        corrupt("builder-state.json"); corrupt("builder-state-backup.json");
        assertEquals(current,store.read());
    }
    public void testAllDamagedCopiesFailClosed() throws Exception {
        assertTrue(store.save(payload("preserve damaged records")));
        corrupt("builder-state.json"); corrupt("builder-state-backup.json");
        preferences.edit().putString("state","broken").commit();
        assertEquals("unreadable persistent state",store.read());
        assertFalse(store.save(payload("must not overwrite")));
        assertEquals("unreadable persistent state",store.read());
    }
    public void testIntentionalClearingDoesNotResurrectOldDraft() throws Exception {
        assertTrue(store.save(payload("notes stay")));
        JSONObject cleared=new JSONObject(payload("notes stay")).put("links","").put("cuts",new JSONArray());
        assertTrue(store.save(cleared.toString())); corrupt("builder-state.json");
        JSONObject recovered=new JSONObject(store.read());
        assertEquals("",recovered.getString("links")); assertEquals(0,recovered.getJSONArray("cuts").length());
        assertEquals("notes stay",recovered.getString("notes")); assertEquals(1,recovered.getJSONArray("history").length());
    }
}
