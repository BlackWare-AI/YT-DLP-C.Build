package com.blackware.ytdlpcommandbuilder;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.provider.Settings;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

/** Native, user-initiated GitHub updater; the WebView remains offline. */
final class UpdateController {
    static final int INSTALL_PERMISSION = 42;
    static final String RELEASES = "https://api.github.com/repos/BlackWare-AI/YT-DLP-Command-Builder/releases/latest";
    private static final String DOWNLOAD_PREFIX = "https://github.com/BlackWare-AI/YT-DLP-Command-Builder/releases/download/";
    private static final long MAX_APK = 100L * 1024 * 1024;
    interface Source { InputStream read(String address) throws IOException; }
    interface Status { void show(String message, boolean busy); }
    private final Activity activity;
    private final Status status;
    private final Source source;
    private final java.util.function.BooleanSupplier canInstall;
    private AlertDialog offerDialog;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean closed;
    private volatile HttpsURLConnection active;
    private boolean busy;
    private String readyDigest;
    private boolean permissionPending;

    static final class Release {
        final String version, url, digest;
        final long size;
        Release(String version, String url, String digest, long size) {
            this.version=version; this.url=url; this.digest=digest; this.size=size;
        }
    }
    UpdateController(Activity activity, Status status) { this(activity,status,null); }
    UpdateController(Activity activity, Status status, Source source) { this(activity,status,source,null); }
    UpdateController(Activity activity, Status status, Source source, java.util.function.BooleanSupplier permission) {
        this.activity=activity; this.status=status;
        this.canInstall=permission==null ? ()->activity.getPackageManager().canRequestPackageInstalls() : permission;
        this.source=source==null ? this::read : source;
    }
    private InputStream read(String address) throws IOException {
        HttpsURLConnection connection=open(address);
        try {
            return new java.io.FilterInputStream(connection.getInputStream()) {
                @Override public void close() throws IOException {
                    try { super.close(); } finally { connection.disconnect(); active=null; }
                }
            };
        } catch (IOException e) { connection.disconnect(); active=null; throw e; }
    }
    private void ui(Runnable action) {
        activity.runOnUiThread(() -> { if (!closed && !activity.isFinishing()) action.run(); });
    }
    private void finish(String message) { ui(() -> { busy=false; status.show(message,false); }); }
    void check() {
        if (busy || closed) return;
        busy=true; status.show("Güncelleme kontrol ediliyor…",true);
        worker.execute(() -> {
            try {
                JSONObject json;
                try (InputStream in=source.read(RELEASES)) {
                    ByteArrayOutputStream bytes=new ByteArrayOutputStream(); byte[] buffer=new byte[8192]; int n;
                    while ((n=in.read(buffer))!=-1) {
                        if (bytes.size()+n>1024*1024) throw new IOException();
                        bytes.write(buffer,0,n);
                    }
                    json=new JSONObject(bytes.toString("UTF-8"));
                }
                Release release=parse(json);
                PackageInfo installed=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);
                if (release==null) { finish("Yayımlanmış uygun bir APK bulunamadı."); return; }
                if (compareVersions(release.version,installed.versionName)<0 ||
                    release.digest.equals(sha256(new File(activity.getApplicationInfo().sourceDir)))) {
                    finish("Uygulama güncel."); return;
                }
                ui(() -> {
                    busy=false; status.show("Güncelleme mevcut: "+release.version,false);
                    offerDialog=new AlertDialog.Builder(activity).setTitle("Güncelleme mevcut")
                        .setMessage("GitHub sürümü: "+release.version+"\nAPK indirilip Android yükleme ekranı açılacak.")
                        .setNegativeButton("Daha sonra",null)
                        .setPositiveButton("İndir ve yükle",(d,w)->download(release)).show();
                });
            } catch (Exception e) { finish("Güncelleme kontrol edilemedi. İnternet bağlantısını kontrol edip yeniden deneyin."); }
        });
    }
    static Release parse(JSONObject json) throws Exception {
        if (json.optBoolean("draft") || json.optBoolean("prerelease")) return null;
        String version=json.getString("tag_name").replaceFirst("^v","");
        if (!version.matches("[0-9]+\\.[0-9]+\\.[0-9]+")) return null;
        JSONArray assets=json.getJSONArray("assets");
        for (int i=0;i<assets.length();i++) {
            JSONObject asset=assets.getJSONObject(i);
            String name="YT-DLP-Command-Builder-v"+version+".apk";
            String url=asset.optString("browser_download_url");
            String digest=asset.optString("digest"); long size=asset.optLong("size");
            if (name.equals(asset.optString("name")) &&
                url.equals(DOWNLOAD_PREFIX+"v"+version+"/"+name) &&
                digest.matches("sha256:[0-9a-fA-F]{64}") && size>0 && size<=MAX_APK)
                return new Release(version,url,digest.substring(7).toLowerCase(java.util.Locale.ROOT),size);
        }
        return null;
    }
    static int compareVersions(String a, String b) {
        String[] left=a.split("\\."), right=b.split("\\.");
        if (left.length!=3 || right.length!=3) throw new IllegalArgumentException("Invalid version");
        for (int i=0;i<3;i++) {
            int result=new java.math.BigInteger(left[i]).compareTo(new java.math.BigInteger(right[i]));
            if (result!=0) return result;
        }
        return 0;
    }
    static boolean allowedHost(URL url) {
        return "https".equals(url.getProtocol()) && url.getUserInfo()==null &&
            (url.getPort()==-1 || url.getPort()==443) &&
            Arrays.asList("api.github.com","github.com","release-assets.githubusercontent.com","objects.githubusercontent.com").contains(url.getHost());
    }
    private HttpsURLConnection open(String address) throws IOException {
        URL url=new URL(address);
        for (int redirect=0;redirect<6;redirect++) {
            if (closed || !allowedHost(url)) throw new IOException("Invalid download host");
            HttpsURLConnection connection=(HttpsURLConnection)url.openConnection(); active=connection;
            connection.setConnectTimeout(15000); connection.setReadTimeout(20000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("User-Agent","YT-DLP-Command-Builder");
            connection.setRequestProperty("Accept",url.getHost().equals("api.github.com") ? "application/vnd.github+json" : "application/octet-stream");
            int code;
            try { code=connection.getResponseCode(); }
            catch (IOException e) { connection.disconnect(); active=null; throw e; }
            if (code==200) return connection;
            String location=connection.getHeaderField("Location"); connection.disconnect(); active=null;
            if ((code==301 || code==302 || code==303 || code==307 || code==308) && location!=null) url=new URL(url,location);
            else throw new IOException("GitHub request failed");
        }
        throw new IOException("Too many redirects");
    }
    void download(Release release) {
        if (busy || closed) return;
        busy=true; status.show("Güncelleme indiriliyor…",true);
        worker.execute(() -> {
            File part=new File(activity.getCacheDir(),"update.pending.apk");
            File apk=UpdateApkProvider.apk(activity);
            boolean success=false;
            try {
                activity.revokeUriPermission(UpdateApkProvider.uri(activity),Intent.FLAG_GRANT_READ_URI_PERMISSION);
                apk.delete();
                try (InputStream in=source.read(release.url); FileOutputStream out=new FileOutputStream(part)) {
                    byte[] buffer=new byte[16384]; long total=0; int n, last=-1;
                    while ((n=in.read(buffer))!=-1) {
                        if (closed || (total+=n)>release.size) throw new IOException();
                        out.write(buffer,0,n);
                        int progress=(int)(100*total/release.size);
                        if (progress!=last) { last=progress; ui(()->status.show("Güncelleme indiriliyor: %"+progress,true)); }
                    }
                    if (total!=release.size) throw new IOException("Incomplete APK");
                }
                if (!release.digest.equals(sha256(part))) throw new IOException("APK digest mismatch");
                validatePackage(part);
                if (!part.renameTo(apk)) throw new IOException();
                readyDigest=release.digest; success=true;
                ui(()->{ busy=false; status.show("Güncelleme indirildi.",false); install(); });
            } catch (Exception ignored) { /* Cleanup completes before retry is enabled. */ }
            finally { part.delete(); if (!success) apk.delete(); }
            if (!success) finish("Güncelleme indirilemedi veya doğrulanamadı. Yeniden deneyin.");
        });
    }
    void validatePackage(File file) throws Exception {
        PackageManager pm=activity.getPackageManager();
        // Android 10 collects archive certificates only when GET_SIGNATURES is also set.
        PackageInfo candidate=pm.getPackageArchiveInfo(file.getAbsolutePath(),PackageManager.GET_SIGNING_CERTIFICATES | PackageManager.GET_SIGNATURES);
        PackageInfo installed=pm.getPackageInfo(activity.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
        if (candidate==null || !activity.getPackageName().equals(candidate.packageName) ||
            candidate.getLongVersionCode()<installed.getLongVersionCode() ||
            compareVersions(candidate.versionName,installed.versionName)<0 ||
            candidate.signingInfo==null || installed.signingInfo==null) throw new IOException("Invalid APK");
        Signature[] actual=candidate.signingInfo.getApkContentsSigners();
        Signature[] expected=installed.signingInfo.getApkContentsSigners();
        if (actual.length!=expected.length || !new java.util.HashSet<>(Arrays.asList(actual)).equals(new java.util.HashSet<>(Arrays.asList(expected))))
            throw new IOException("APK signer mismatch");
    }
    static String sha256(File file) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try (InputStream in=new FileInputStream(file)) {
            byte[] buffer=new byte[16384]; int n;
            while ((n=in.read(buffer))!=-1) digest.update(buffer,0,n);
        }
        StringBuilder hex=new StringBuilder(); for (byte b:digest.digest()) hex.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
        return hex.toString();
    }
    private void install() {
        if (!UpdateApkProvider.apk(activity).isFile() || readyDigest==null) { status.show("APK bulunamadı; yeniden kontrol edin.",false); return; }
        try {
            if (!canInstall.getAsBoolean()) {
                permissionPending=true;
                status.show("Yükleme iznini açıp uygulamaya geri dönün.",false);
                activity.startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())),INSTALL_PERMISSION);
                return;
            }
            Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(UpdateApkProvider.uri(activity),UpdateApkProvider.MIME)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.setClipData(ClipData.newRawUri("update",UpdateApkProvider.uri(activity)));
            activity.startActivity(intent);
            status.show("Kurulumu Android ekranında onaylayın.",false);
        } catch (Exception e) { permissionPending=false; status.show("Yükleme ekranı açılamadı. Yeniden deneyin.",false); }
    }
    void onPermissionResult() {
        if (!permissionPending) return;
        permissionPending=false;
        if (canInstall.getAsBoolean()) install();
        else status.show("Yükleme izni verilmedi. Güncelleme için yeniden kontrol edin.",false);
    }
    void close() {
        closed=true; activity.runOnUiThread(()->{if (offerDialog!=null) offerDialog.dismiss();});
        if (active!=null) active.disconnect(); worker.shutdownNow();
    }
}
