package com.blackware.ytdlpcommandbuilder;

import android.app.Activity;
import android.content.Intent;
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
        fail("Condition not met: "+expression);
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
    public void testOfflineLaunchCommandsPersistenceAndHistory() throws Exception {
        getInstrumentation().getTargetContext().getSharedPreferences("builder",0).edit().clear().commit();
        launch();
        try {
            await("typeof Builder==='object' && document.getElementById('copy')!==null");
            js("document.getElementById('links').value='https://instagram.com/stories/user.name/123?utm_source=ahttps://instagram.com/reel/abc/';document.getElementById('links').dispatchEvent(new Event('input'));document.querySelector('#engines [data-value=normal]').click();document.getElementById('addCut').click();true");
            await("document.getElementById('count').textContent==='2 bağlantı' && document.querySelectorAll('#cuts .cut').length===2 && !document.getElementById('copy').disabled");
            js("document.getElementById('copy').click();true");
            await("JSON.parse(Android.getState()).history.length===1");
            js("document.getElementById('copy').click();true");
            await("JSON.parse(Android.getState()).history.length===1");
            js("document.getElementById('historyBtn').click();true");
            await("document.getElementById('dialog').open && document.querySelectorAll('.history-item').length===1");
            assertEquals("true",js("window.handleBack()"));
            assertEquals("false",js("document.getElementById('dialog').open"));
            getInstrumentation().runOnMainSync(() -> activity.finish());
            getInstrumentation().waitForIdleSync();
            launch();
            await("typeof Builder==='object' && document.getElementById('count').textContent==='2 bağlantı'");
            assertEquals("true",js("document.querySelector('#engines [data-value=normal]').getAttribute('aria-pressed')==='true' && document.querySelectorAll('#cuts .cut').length===2 && JSON.parse(Android.getState()).history.length===1"));
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }
}
