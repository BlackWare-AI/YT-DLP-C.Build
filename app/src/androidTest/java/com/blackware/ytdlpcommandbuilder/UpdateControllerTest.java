package com.blackware.ytdlpcommandbuilder;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.Settings;
import android.test.InstrumentationTestCase;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Tests use local APK bytes and fake transport, never a live GitHub request/install. */
public final class UpdateControllerTest extends InstrumentationTestCase {
    private Activity activity;
    private UpdateController controller;
    private final AtomicReference<String> status=new AtomicReference<>("");
    private CountDownLatch done;
    private String terminal;
    private boolean permission;
    private File installed() { return new File(activity.getApplicationInfo().sourceDir); }
    private void main(Runnable action) { getInstrumentation().runOnMainSync(action); }
    private void launch() {
        Intent intent=new Intent(getInstrumentation().getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity=getInstrumentation().startActivitySync(intent);
    }
    private void setup(UpdateController.Source source, String terminal) {
        this.terminal=terminal; done=new CountDownLatch(1);
        controller=new UpdateController(activity,(message,busy)->{
            status.set(message); if (message.startsWith(this.terminal)) done.countDown();
        },source,()->permission);
    }
    private void await() throws Exception { boolean completed=done.await(30,TimeUnit.SECONDS);assertTrue(status.get(),completed); }
    private JSONObject metadata(String digest) throws Exception {
        return new JSONObject().put("tag_name","v1.1.1").put("assets",new JSONArray().put(new JSONObject()
            .put("name","YT-DLP-Command-Builder-v1.1.1.apk")
            .put("browser_download_url","https://github.com/BlackWare-AI/YT-DLP-Command-Builder/releases/download/v1.1.1/YT-DLP-Command-Builder-v1.1.1.apk")
            .put("digest","sha256:"+digest).put("size",123)));
    }
    public void testMetadataAndHostsAreRestricted() throws Exception {
        String digest=new String(new char[64]).replace('\0','a');
        JSONObject json=metadata(digest);
        assertNotNull(UpdateController.parse(json));
        assertEquals(0,UpdateController.compareVersions("1.1.1","1.1.1"));
        assertTrue(UpdateController.compareVersions("1.10.0","1.9.99")>0);
        assertTrue(UpdateController.compareVersions("1.0.9","1.1.0")<0);
        JSONObject asset=json.getJSONArray("assets").getJSONObject(0);
        asset.put("browser_download_url","https://evil.example/update.apk"); assertNull(UpdateController.parse(json));
        json=metadata(digest);json.put("prerelease",true);assertNull(UpdateController.parse(json));
        json=metadata("bad-hash");assertNull(UpdateController.parse(json));
        assertTrue(UpdateController.allowedHost(new URL("https://release-assets.githubusercontent.com/test")));
        for (String url:new String[]{"http://github.com/a","https://github.com.evil.example/a","https://evil@github.com/a","https://github.com:123/a"})
            assertFalse(UpdateController.allowedHost(new URL(url)));
    }
    public void testCurrentHashAndSameVersionReplacement() throws Exception {
        launch();
        byte[] current=metadata(UpdateController.sha256(installed())).toString().getBytes(StandardCharsets.UTF_8);
        setup(address->new ByteArrayInputStream(current),"Uygulama güncel.");
        main(()->controller.check());await();getInstrumentation().waitForIdleSync();controller.close();
        byte[] changed=metadata(new String(new char[64]).replace('\0','0')).toString().getBytes(StandardCharsets.UTF_8);
        setup(address->new ByteArrayInputStream(changed),"Güncelleme mevcut:");
        main(()->controller.check());await();getInstrumentation().waitForIdleSync();
    }
    public void testNetworkAndCorruptDownloadsFailCleanly() throws Exception {
        launch();
        setup(address->{throw new java.io.IOException("offline");},"Güncelleme kontrol edilemedi.");
        main(()->controller.check());await();getInstrumentation().waitForIdleSync();controller.close();
        setup(address->new ByteArrayInputStream(new byte[]{1,2,3}),"Güncelleme indirilemedi");
        UpdateController.Release release=new UpdateController.Release("1.1.1","fixture",new String(new char[64]).replace('\0','0'),3);
        main(()->controller.download(release));await();getInstrumentation().waitForIdleSync();
        getInstrumentation().waitForIdleSync();
        assertFalse(UpdateApkProvider.apk(activity).exists());
        assertFalse(new File(activity.getCacheDir(),"update.pending.apk").exists());
    }
    public void testVerifiedApkOpensInstallerAndProviderIsReadOnly() throws Exception {
        launch();permission=true;
        setup(address->new FileInputStream(installed()),"Kurulumu Android ekranında");
        UpdateController.Release release=new UpdateController.Release("1.1.1","fixture",UpdateController.sha256(installed()),installed().length());
        controller.validatePackage(installed());
        IntentFilter filter=new IntentFilter(Intent.ACTION_VIEW);filter.addDataType(UpdateApkProvider.MIME);filter.addDataScheme("content");
        Instrumentation.ActivityMonitor monitor=getInstrumentation().addMonitor(filter,new Instrumentation.ActivityResult(Activity.RESULT_CANCELED,null),true);
        try {
            main(()->controller.download(release));await();getInstrumentation().waitForIdleSync();
            assertTrue("Installer intent requested",monitor.getHits()>0);
            File apk=UpdateApkProvider.apk(activity);assertTrue(apk.isFile());
            controller.validatePackage(apk);
            try (ParcelFileDescriptor fd=activity.getContentResolver().openFileDescriptor(UpdateApkProvider.uri(activity),"r")) { assertNotNull(fd); }
            try { activity.getContentResolver().openFileDescriptor(UpdateApkProvider.uri(activity),"w");fail("Writable APK"); }
            catch (SecurityException expected) { /* expected */ }
            try { activity.getContentResolver().openFileDescriptor(Uri.parse("content://"+activity.getPackageName()+".updates/other"),"r");fail("Arbitrary file"); }
            catch (SecurityException expected) { /* expected */ }
            File broken=new File(activity.getCacheDir(),"bad-update.apk");
            try (FileOutputStream out=new FileOutputStream(broken)) { out.write(new byte[]{1,2,3}); }
            try { controller.validatePackage(broken);fail("Invalid APK accepted"); } catch (java.io.IOException expected) { /* expected */ }
            broken.delete();
        } finally { getInstrumentation().removeMonitor(monitor); }
    }
    public void testUnknownSourcePermissionCanBeDeclined() throws Exception {
        launch();permission=false;
        setup(address->new FileInputStream(installed()),"Yükleme iznini açıp");
        UpdateController.Release release=new UpdateController.Release("1.1.1","fixture",UpdateController.sha256(installed()),installed().length());
        IntentFilter filter=new IntentFilter(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);filter.addDataScheme("package");
        Instrumentation.ActivityMonitor monitor=getInstrumentation().addMonitor(filter,new Instrumentation.ActivityResult(Activity.RESULT_CANCELED,null),true);
        try {
            main(()->controller.download(release));await();getInstrumentation().waitForIdleSync();
            assertTrue("Unknown-source settings requested",monitor.getHits()>0);
            main(()->controller.onPermissionResult());
            assertTrue(status.get().startsWith("Yükleme izni verilmedi"));
        } finally { getInstrumentation().removeMonitor(monitor); }
    }
    @Override protected void tearDown() throws Exception {
        if (controller!=null) controller.close();
        if (activity!=null) {
            UpdateApkProvider.apk(activity).delete();
            main(()->activity.finish());getInstrumentation().waitForIdleSync();
        }
        super.tearDown();
    }
}
