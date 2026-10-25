package com.blackware.ytdlpcommandbuilder;

import android.app.Activity;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.IntentFilter;
import android.app.Instrumentation;
import android.net.Uri;
import android.provider.MediaStore;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import android.os.SystemClock;
import android.test.InstrumentationTestCase;
import android.webkit.WebView;
import android.view.ViewGroup;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Platform-only smoke test: launches APK, exercises packaged JS and native bridge. */
public final class AppSmokeTest extends InstrumentationTestCase {
    private Activity activity;
    private WebView web;
    private String js(String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        getInstrumentation().runOnMainSync(() -> web.evaluateJavascript(script, value -> {
            result.set(value); latch.countDown();
        }));
        assertTrue("JavaScript callback timeout", latch.await(10,TimeUnit.SECONDS));
        return result.get();
    }
    private void await(String expression) throws Exception {
        long deadline=SystemClock.uptimeMillis()+15000;
        do { if ("true".equals(js(expression))) return; SystemClock.sleep(100); }
        while (SystemClock.uptimeMillis()<deadline);
        fail("Condition not met: "+expression+"; UI state: "+js("JSON.stringify({ready:document.readyState,count:document.getElementById('count')&&document.getElementById('count').textContent,cuts:document.querySelectorAll('#cuts .cut').length,error:document.getElementById('error')&&document.getElementById('error').textContent})"));
    }
    private void launch() {
        Intent intent=new Intent(getInstrumentation().getTargetContext(),MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity=getInstrumentation().startActivitySync(intent);
        getInstrumentation().runOnMainSync(() -> {
            ViewGroup content=activity.findViewById(android.R.id.content);
            web=(WebView)((ViewGroup)content.getChildAt(0)).getChildAt(0);
        });
    }
    private void verifyExport(boolean backup) throws Exception {
        String mime=backup ? "application/json" : "text/plain";
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, "builder-smoke-"+System.nanoTime()+(backup ? ".json" : ".txt"));
        values.put(MediaStore.Downloads.MIME_TYPE, mime);
        Uri destination = getInstrumentation().getTargetContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
        assertNotNull(destination);
        IntentFilter filter = new IntentFilter(Intent.ACTION_CREATE_DOCUMENT);
        filter.addCategory(Intent.CATEGORY_OPENABLE); filter.addDataType(mime);
        Instrumentation.ActivityMonitor monitor = getInstrumentation().addMonitor(filter,
            new Instrumentation.ActivityResult(Activity.RESULT_OK,new Intent().setData(destination)),true);
        try {
            js("document.getElementById('"+(backup ? "exportSettings" : "export")+"').click();true");
            long deadline=SystemClock.uptimeMillis()+10000; String text="";
            do {
                try (InputStream in=getInstrumentation().getTargetContext().getContentResolver().openInputStream(destination);
                     ByteArrayOutputStream bytes=new ByteArrayOutputStream()) {
                    byte[] buffer=new byte[8192]; int length;
                    while ((length=in.read(buffer))!=-1) bytes.write(buffer,0,length);
                    text=bytes.toString("UTF-8");
                } catch (java.io.FileNotFoundException pendingWrite) {
                    // Android 10 creates the backing file when the async writer opens it.
                    // Keep polling; the final assertion still requires complete TXT data.
                }
                if (backup) {
                    try { new org.json.JSONObject(text).getJSONObject("state"); break; }
                    catch (org.json.JSONException pendingWrite) { /* Wait for complete JSON. */ }
                } else if (text.contains("--download-sections")) break;
                SystemClock.sleep(100);
            } while (SystemClock.uptimeMillis()<deadline);
            assertTrue("System create-document intent was requested",monitor.getHits()>0);
            if (backup) {
                org.json.JSONObject exported=new org.json.JSONObject(text).getJSONObject("state");
                org.json.JSONObject saved=new org.json.JSONObject(getInstrumentation().getTargetContext().getSharedPreferences("builder",0).getString("state",""));
                for (String key : new String[]{"settings","selection","cuts","links","history","schema","notes","newLink"})
                    assertEquals("Backup must preserve "+key,saved.get(key).toString(),exported.get(key).toString());
            } else assertTrue("Native TXT output must contain complete commands",text.contains("--download-sections") && text.contains("user.name"));
        } finally {
            getInstrumentation().removeMonitor(monitor);
            getInstrumentation().getTargetContext().getContentResolver().delete(destination,null,null);
        }
    }
    public void testSavedDraftSurvivesProcessDeath() throws Exception {
        android.os.Bundle args=((android.test.InstrumentationTestRunner)getInstrumentation()).getArguments();
        boolean verify="verify".equals(args.getString("phase"));
        launch();
        try {
            await("document.readyState==='complete' && typeof window.handleBack==='function'");
            if (!verify) {
                js("document.getElementById('links').value='https://instagram.com/stories/process.user';document.getElementById('links').dispatchEvent(new Event('input'));document.getElementById('notesBtn').click();document.getElementById('notes').value='process notes V+S';document.getElementById('notes').dispatchEvent(new Event('input'));document.getElementById('notesClose').click();document.getElementById('newLink').value='pending link';document.getElementById('newLink').dispatchEvent(new Event('input'));document.getElementById('itemAfter').value='3';document.getElementById('itemAfter').dispatchEvent(new Event('input'));document.getElementById('fullVideo').click();document.getElementById('addCut').click();true");
            }
            assertEquals("true",js("document.getElementById('links').value==='https://instagram.com/stories/process.user' && JSON.parse(Android.getState()).links==='https://instagram.com/stories/process.user' && document.getElementById('itemAfter').value==='3' && JSON.parse(Android.getState()).selection.after==='3' && JSON.parse(Android.getState()).cuts.length===1 && document.getElementById('notes').value==='process notes V+S' && document.getElementById('newLink').value==='pending link'"));
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }
    public void testOfflineLaunchCommandsPersistenceAndHistory() throws Exception {
        getInstrumentation().getTargetContext().getSharedPreferences("builder",0).edit().clear().commit();
        for (String name : new String[]{"builder-state.json","builder-state-backup.json"})
            for (String suffix : new String[]{"",".new",".bak"}) new java.io.File(getInstrumentation().getTargetContext().getFilesDir(),name+suffix).delete();
        launch();
        assertTrue("Launcher icon must be packaged",getInstrumentation().getTargetContext().getApplicationInfo().icon!=0);
        try {
            await("document.readyState==='complete' && typeof window.handleBack==='function'");
            js("document.getElementById('links').value='https://instagram.com/stories/user.name/123?utm_source=ahttps://instagram.com/reel/abc/';document.getElementById('links').dispatchEvent(new Event('input'));document.querySelector('#engines [data-value=normal]').click();document.getElementById('addCut').click();document.getElementById('addCut').click();true");
            await("document.getElementById('count').textContent==='2 bağlantı' && document.querySelectorAll('#cuts .cut').length===2 && !document.getElementById('copy').disabled");
            getInstrumentation().runOnMainSync(() -> activity.finish());
            getInstrumentation().waitForIdleSync(); launch();
            await("document.readyState==='complete' && document.getElementById('count').textContent==='2 bağlantı'");
            // The paste button reads the actual Android clipboard on user action.
            getInstrumentation().runOnMainSync(() -> {
                ClipboardManager cm=(ClipboardManager)activity.getSystemService(Activity.CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("links","https://example.org/v https://instagram.com/stories/user.name/123 https://instagram.com/p/pasted/"));
            });
            js("document.getElementById('paste').click();true");
            await("document.getElementById('count').textContent==='3 bağlantı'");
            js("document.getElementById('paste').click();true");
            await("document.getElementById('count').textContent==='3 bağlantı'");
            js("document.getElementById('itemOnly').value='2';document.getElementById('itemOnly').dispatchEvent(new Event('input'));true");
            await("document.getElementById('output').textContent.includes('--playlist-items \"2\"')");
            js("document.getElementById('notesBtn').click();document.getElementById('notes').value='https://instagram.com/stories/stock.user/1 - SClip, sonra V+S';document.getElementById('notes').dispatchEvent(new Event('input'));document.getElementById('notesClose').click();true");
            getInstrumentation().runOnMainSync(() -> {
                ClipboardManager cm=(ClipboardManager)activity.getSystemService(Activity.CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("notes","https://www.instagram.com/hilaalats?psln=abc== V4S"));
            });
            js("document.getElementById('notesBtn').click();document.getElementById('notes').setSelectionRange(0,0);document.getElementById('notesPaste').click();true");
            await("JSON.parse(Android.getState()).notes.startsWith('https://www.instagram.com/hilaalats V4S') && JSON.parse(Android.getState()).notes.includes('stock.user') && !JSON.parse(Android.getState()).notes.includes('psln')");
            js("document.getElementById('notesClose').click();true");
            js("document.getElementById('copy').click();true");
            await("JSON.parse(Android.getState()).history.length===1 && JSON.parse(Android.getState()).links==='' && document.getElementById('links').value==='' && JSON.parse(Android.getState()).cuts.length===0 && document.querySelectorAll('#cuts .cut').length===0 && document.getElementById('itemOnly').value==='' && JSON.parse(Android.getState()).selection.only==='' && JSON.parse(Android.getState()).notes.includes('stock.user')");
            AtomicReference<String> clipboard = new AtomicReference<>();
            getInstrumentation().runOnMainSync(() -> {
                ClipboardManager cm = (ClipboardManager) activity.getSystemService(Activity.CLIPBOARD_SERVICE);
                clipboard.set(cm.getPrimaryClip().getItemAt(0).getText().toString());
            });
            assertTrue("Native clipboard must contain complete commands", clipboard.get().contains("--download-sections") && clipboard.get().contains("user.name"));
            assertEquals("Only one yt-dlp command",2,clipboard.get().split("--no-playlist",-1).length);
            assertTrue("Video output subdirectory",clipboard.get().contains("/Video"));
            js("document.getElementById('copy').click();true");
            await("JSON.parse(Android.getState()).history.length===1");
            js("document.getElementById('historyBtn').click();true");
            await("document.getElementById('dialog').open && document.querySelectorAll('.history-item').length===1");
            verifyExport(false);
            verifyExport(true);
            assertEquals("true",js("window.handleBack()"));
            assertEquals("false",js("document.getElementById('dialog').open"));
            js("document.getElementById('links').value='https://instagram.com/stories/persist.user/1https://instagram.com/reel/restored/';document.getElementById('links').dispatchEvent(new Event('input'));true");
            getInstrumentation().runOnMainSync(() -> activity.finish());
            getInstrumentation().waitForIdleSync();
            launch();
            await("typeof Builder==='object' && document.getElementById('count').textContent==='2 bağlantı'");
            assertEquals("true",js("document.querySelector('#engines [data-value=normal]').getAttribute('aria-pressed')==='true' && document.querySelectorAll('#cuts .cut').length===0 && JSON.parse(Android.getState()).history.length===1"));
            getInstrumentation().runOnMainSync(() -> activity.onBackPressed());
            SystemClock.sleep(350); assertFalse("First back must not exit",activity.isFinishing());
            SystemClock.sleep(2100);
            getInstrumentation().runOnMainSync(() -> activity.onBackPressed());
            SystemClock.sleep(350); assertFalse("Expired first back must not exit",activity.isFinishing());
            getInstrumentation().runOnMainSync(() -> activity.onBackPressed());
            long deadline=SystemClock.uptimeMillis()+5000;
            while(!activity.isFinishing() && SystemClock.uptimeMillis()<deadline) SystemClock.sleep(100);
            assertTrue("Two consecutive back presses exit",activity.isFinishing());
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }
}
