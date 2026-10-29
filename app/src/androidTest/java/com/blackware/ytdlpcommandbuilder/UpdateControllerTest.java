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
    private static final String VERSION=BuildConfig.VERSION_NAME;
    private static final String APK_NAME="YT-DLP-Command-Builder-v"+VERSION+(BuildConfig.ENGLISH_EDITION ? "-EN.apk" : ".apk");
    private static final String APK_URL="https://github.com/BlackWare-AI/YT-DLP-Command-Builder/releases/download/v"+VERSION+"/"+APK_NAME;
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
        return new JSONObject().put("tag_name","v"+VERSION).put("assets",new JSONArray().put(new JSONObject()
            .put("name",APK_NAME)
            .put("browser_download_url",APK_URL)
            .put("digest","sha256:"+digest).put("size",123)));
    }
    public void testMetadataAndHostsAreRestricted() throws Exception {
        String digest=new String(new char[64]).replace('\0','a');
        JSONObject json=metadata(digest);
        assertNotNull(UpdateController.parse(json));
        assertEquals(0,UpdateController.compareVersions("1.1.3","1.1.3"));
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
    private android.app.AlertDialog offer() throws Exception {
        java.lang.reflect.Field field=UpdateController.class.getDeclaredField("offerDialog");
        field.setAccessible(true);return (android.app.AlertDialog)field.get(controller);
    }
    private android.widget.Button findButton(android.view.View view,String text) {
        if(view instanceof android.widget.Button && text.contentEquals(((android.widget.Button)view).getText())) return (android.widget.Button)view;
        if(view instanceof android.view.ViewGroup) {
            android.view.ViewGroup group=(android.view.ViewGroup)view;
            for(int i=0;i<group.getChildCount();i++) {android.widget.Button found=findButton(group.getChildAt(i),text);if(found!=null)return found;}
        }
        return null;
    }
    public void testAvailableUpdateWaitsForOfferConfirmation() throws Exception {
        launch();
        java.util.concurrent.atomic.AtomicInteger metadataRequests=new java.util.concurrent.atomic.AtomicInteger();
        java.util.concurrent.atomic.AtomicInteger apkRequests=new java.util.concurrent.atomic.AtomicInteger();
        AtomicReference<String> lastAddress=new AtomicReference<>("");
        byte[] release=metadata(new String(new char[64]).replace('\0','0')).toString().getBytes(StandardCharsets.UTF_8);
        setup(address->{lastAddress.set(address);if(address.equals(UpdateController.RELEASES)){metadataRequests.incrementAndGet();return new ByteArrayInputStream(release);}apkRequests.incrementAndGet();return new ByteArrayInputStream(new byte[]{1,2,3});},UiText.get(activity,"Güncelleme mevcut:","Update available:"));
        main(()->controller.check());await();getInstrumentation().waitForIdleSync();
        android.app.AlertDialog first=offer();assertNotNull(first);assertTrue(first.isShowing());
        assertEquals(1,metadataRequests.get());assertEquals(0,apkRequests.get());
        main(()->assertTrue(controller.hasUpdate()));
        assertFalse(UpdateApkProvider.apk(activity).exists());
        String later=UiText.get(activity,"Daha sonra","Later"),install=UiText.get(activity,"İndir ve yükle","Install update");
        main(()->{
            android.widget.Button laterButton=findButton(first.getWindow().getDecorView(),later);
            android.widget.Button installButton=findButton(first.getWindow().getDecorView(),install);
            assertNotNull(laterButton);assertNotNull(installButton);
            assertEquals(android.graphics.Color.rgb(190,190,190),laterButton.getCurrentTextColor());
            assertEquals(android.graphics.Color.rgb(245,245,245),installButton.getCurrentTextColor());
            assertEquals(android.graphics.Color.rgb(32,32,32),((android.graphics.drawable.GradientDrawable)installButton.getBackground()).getColor().getDefaultColor());
        });
        // Render the laid-out dialog itself; a system screenshot can precede its first frame.
        java.util.concurrent.atomic.AtomicBoolean laidOut=new java.util.concurrent.atomic.AtomicBoolean();
        long deadline=android.os.SystemClock.uptimeMillis()+5000;
        do {
            main(()->{android.view.View decor=first.getWindow().getDecorView();laidOut.set(decor.isLaidOut() && decor.getWidth()>0 && decor.getHeight()>0);});
            if(laidOut.get())break;
            android.os.SystemClock.sleep(20);
        } while(android.os.SystemClock.uptimeMillis()<deadline);
        assertTrue("Update offer must lay out",laidOut.get());
        AtomicReference<android.graphics.Bitmap> rendered=new AtomicReference<>();
        main(()->{
            android.view.View decor=first.getWindow().getDecorView();
            android.graphics.Bitmap image=android.graphics.Bitmap.createBitmap(decor.getWidth(),decor.getHeight(),android.graphics.Bitmap.Config.ARGB_8888);
            decor.draw(new android.graphics.Canvas(image));rendered.set(image);
            if(BuildConfig.ENGLISH_EDITION) {
                android.widget.Button positive=findButton(decor,install);
                assertEquals("The English confirmation label must stay on one line",1,positive.getLineCount());
                assertTrue("The English confirmation label must fit its button",positive.getLayout().getLineWidth(0)<=positive.getWidth()-positive.getCompoundPaddingLeft()-positive.getCompoundPaddingRight()+1);
            }
        });
        android.graphics.Bitmap screenshot=rendered.get();
        try(FileOutputStream out=new FileOutputStream(new File(activity.getFilesDir(),"update-offer.png"))) {screenshot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
        screenshot.recycle();
        // A second check while the offer is open must not download or stack a dialog.
        main(()->controller.check());getInstrumentation().waitForIdleSync();
        assertSame(first,offer());assertEquals(1,metadataRequests.get());assertEquals(0,apkRequests.get());
        main(()->findButton(first.getWindow().getDecorView(),later).performClick());getInstrumentation().waitForIdleSync();
        assertFalse(first.isShowing());assertEquals(0,apkRequests.get());
        // Reopening after Later or cancelling the offer still requires explicit confirmation.
        done=new CountDownLatch(1);main(()->controller.check());await();getInstrumentation().waitForIdleSync();
        android.app.AlertDialog cancelled=offer();main(cancelled::cancel);getInstrumentation().waitForIdleSync();
        assertFalse(cancelled.isShowing());assertEquals(0,apkRequests.get());
        done=new CountDownLatch(1);main(()->controller.check());await();getInstrumentation().waitForIdleSync();
        android.app.AlertDialog confirmed=offer();assertNotNull(confirmed);
        terminal=UiText.get(activity,"Güncelleme indirilemedi","The update could not be downloaded");done=new CountDownLatch(1);
        main(()->findButton(confirmed.getWindow().getDecorView(),install).performClick());await();getInstrumentation().waitForIdleSync();
        assertEquals(3,metadataRequests.get());assertEquals(1,apkRequests.get());
        assertEquals(APK_URL,lastAddress.get());
        assertFalse(confirmed.isShowing());
        main(()->assertFalse(controller.hasUpdate()));
        assertFalse(new File(activity.getCacheDir(),"update.pending.apk").exists());
    }
    public void testClosingControllerDismissesOfferWithoutDownloading() throws Exception {
        launch();
        java.util.concurrent.atomic.AtomicInteger requests=new java.util.concurrent.atomic.AtomicInteger();
        byte[] release=metadata(new String(new char[64]).replace('\0','0')).toString().getBytes(StandardCharsets.UTF_8);
        setup(address->{requests.incrementAndGet();return new ByteArrayInputStream(release);},UiText.get(activity,"Güncelleme mevcut:","Update available:"));
        main(()->controller.check());await();getInstrumentation().waitForIdleSync();
        android.app.AlertDialog dialog=offer();assertNotNull(dialog);assertTrue(dialog.isShowing());
        controller.close();getInstrumentation().waitForIdleSync();
        assertFalse(dialog.isShowing());
        main(()->controller.check());assertEquals(1,requests.get());
        assertFalse(UpdateApkProvider.apk(activity).exists());
    }
    public void testNetworkAndCorruptDownloadsFailCleanly() throws Exception {
        launch();
        setup(address->{throw new java.io.IOException("offline");},"Güncelleme kontrol edilemedi.");
        main(()->controller.check());await();getInstrumentation().waitForIdleSync();controller.close();
        setup(address->new ByteArrayInputStream(new byte[]{1,2,3}),"Güncelleme indirilemedi");
        UpdateController.Release release=new UpdateController.Release(VERSION,"fixture",new String(new char[64]).replace('\0','0'),3);
        main(()->controller.download(release));await();getInstrumentation().waitForIdleSync();
        getInstrumentation().waitForIdleSync();
        assertFalse(UpdateApkProvider.apk(activity).exists());
        assertFalse(new File(activity.getCacheDir(),"update.pending.apk").exists());
    }
    public void testVerifiedApkOpensInstallerAndProviderIsReadOnly() throws Exception {
        launch();permission=true;
        setup(address->new FileInputStream(installed()),"Kurulumu Android ekranında");
        UpdateController.Release release=new UpdateController.Release(VERSION,"fixture",UpdateController.sha256(installed()),installed().length());
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
        UpdateController.Release release=new UpdateController.Release(VERSION,"fixture",UpdateController.sha256(installed()),installed().length());
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
