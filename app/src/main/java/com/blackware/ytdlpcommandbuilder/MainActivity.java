package com.blackware.ytdlpcommandbuilder;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Rect;
import android.os.SystemClock;
import android.view.inputmethod.InputMethodManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.FutureTask;

/** Only packaged assets are served; update traffic runs outside the offline WebView. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://app.local/";
    private static final int EXPORT_TEXT = 41;
    private static final Set<String> ASSETS = new HashSet<>(Arrays.asList("index.html", "engine.js", "app.js", "styles.css", "notes-ui.js"));
    private WebView web;
    private UpdateController updater;
    private SharedPreferences prefs;
    private boolean exporting;
    private DurableStateStore stateStore;
    private long lastBackAt;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("builder", MODE_PRIVATE);
        stateStore = new DurableStateStore(getFilesDir(), prefs);
        exporting = savedInstanceState != null && savedInstanceState.getBoolean("exporting");
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return insets;
            });
        } else {
            getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setBlockNetworkLoads(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // No navigations; all user links are plain text inputs.
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                String name = path != null && path.startsWith("/") ? path.substring(1) : "";
                if ("https".equals(uri.getScheme()) && "app.local".equals(uri.getHost()) &&
                    uri.getPort() == -1 && ASSETS.contains(name) && "GET".equals(request.getMethod())) {
                    try {
                        String mime = name.endsWith(".js") ? "application/javascript" :
                            name.endsWith(".css") ? "text/css" : "text/html";
                        return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                            Collections.singletonMap("X-Content-Type-Options", "nosniff"), getAssets().open(name));
                    } catch (java.io.IOException ignored) { /* Return a closed failure response. */ }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton(UiText.get(MainActivity.this,"Tamam","OK"), (d,w) -> result.confirm())
                    .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton(UiText.get(MainActivity.this,"Sil","Delete"), (d,w) -> result.confirm())
                    .setNegativeButton(UiText.get(MainActivity.this,"Vazgeç","Cancel"), (d,w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
        });
        updater = new UpdateController(this, (message, busy) -> web.evaluateJavascript(
            "window.setUpdateStatus && window.setUpdateStatus(" + org.json.JSONObject.quote(message) + "," + busy + "," + (updater!=null && updater.hasUpdate()) + ")", null));
        web.addJavascriptInterface(new Bridge(), "Android");
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        web.loadUrl(ORIGIN + "index.html");
    }

    public final class Bridge {
        @JavascriptInterface public void checkUpdates() { runOnUiThread(() -> updater.check()); }
        @JavascriptInterface public String getState() { return stateStore.read(); }
        @JavascriptInterface public boolean saveState(String value) { return stateStore.save(value); }
        @JavascriptInterface public boolean saveDraftState(String value) { return stateStore.saveDraft(value); }
        @JavascriptInterface public String readClipboard() {
            FutureTask<String> task = new FutureTask<>(() -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                ClipData clip = clipboard == null ? null : clipboard.getPrimaryClip();
                if (clip == null || clip.getItemCount() == 0) return "";
                CharSequence text = clip.getItemAt(0).getText();
                return text == null ? "" : text.toString();
            });
            runOnUiThread(task);
            try { return task.get(); } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public boolean copy(String text) {
            FutureTask<Boolean> task = new FutureTask<>(() -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (clipboard == null) return false;
                clipboard.setPrimaryClip(ClipData.newPlainText("yt-dlp command", text));
                return true;
            });
            runOnUiThread(task);
            try { return task.get(); } catch (Exception e) { return false; }
        }
        @JavascriptInterface public void exportText(String text, String filename) {
            runOnUiThread(() -> {
                if (exporting) { toast(UiText.get(MainActivity.this,"Önce açık dışa aktarma işlemini bitirin.","Finish the current export first.")); return; }
                try {
                    try (FileOutputStream out = new FileOutputStream(exportFile())) {
                        out.write(text.getBytes(StandardCharsets.UTF_8));
                    }
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(filename.endsWith(".json") ? "application/json" : "text/plain");
                    intent.putExtra(Intent.EXTRA_TITLE, filename.replaceAll("[^a-zA-Z0-9._-]", "_"));
                    exporting = true;
                    startActivityForResult(intent, EXPORT_TEXT);
                } catch (Exception e) { exporting = false; toast(UiText.get(MainActivity.this,"Dışa aktarma açılamadı.","Could not open export.")); }
            });
        }
    }
    private File exportFile() { return new File(getFilesDir(), "pending-export.txt"); }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    @Override protected void onSaveInstanceState(Bundle out) {
        out.putBoolean("exporting", exporting); super.onSaveInstanceState(out);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == UpdateController.INSTALL_PERMISSION) { updater.onPermissionResult(); return; }
        if (request != EXPORT_TEXT) return;
        exporting = false;
        if (result != RESULT_OK || data == null || data.getData() == null) {
            exportFile().delete(); toast(UiText.get(MainActivity.this,"Dışa aktarma iptal edildi.","Export cancelled.")); return;
        }
        Uri destination = data.getData();
        File completed = new File(getCacheDir(), "export-" + System.nanoTime() + ".txt");
        if (!exportFile().renameTo(completed)) { toast(UiText.get(MainActivity.this,"TXT kaydedilemedi; yeniden deneyin.","Could not save TXT; try again.")); return; }
        new Thread(() -> {
            boolean success = false;
            try (FileInputStream in = new FileInputStream(completed);
                 OutputStream out = getContentResolver().openOutputStream(destination, "wt")) {
                if (out == null) throw new java.io.IOException("Destination unavailable");
                byte[] buffer = new byte[8192]; int length;
                while ((length = in.read(buffer)) != -1) out.write(buffer,0,length);
                success = true;
            } catch (Exception ignored) { /* User gets failure, never a false success. */ }
            completed.delete();
            final boolean done = success;
            runOnUiThread(() -> toast(done ? UiText.get(MainActivity.this,"TXT dosyası kaydedildi.","TXT file saved.") : UiText.get(MainActivity.this,"TXT kaydedilemedi; yeniden deneyin.","Could not save TXT; try again.")));
        }, "text-export").start();
    }
    private boolean keyboardVisible() {
        WindowInsets insets = web.getRootWindowInsets();
        if (Build.VERSION.SDK_INT >= 30) return insets != null && insets.isVisible(WindowInsets.Type.ime());
        Rect visible = new Rect();
        getWindow().getDecorView().getWindowVisibleDisplayFrame(visible);
        int height = getWindow().getDecorView().getRootView().getHeight();
        return height - visible.bottom > height * 0.20;
    }
    @Override public void onBackPressed() {
        if (keyboardVisible()) {
            lastBackAt = 0;
            InputMethodManager keyboard = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (keyboard != null) keyboard.hideSoftInputFromWindow(web.getWindowToken(), 0);
            return;
        }
        web.evaluateJavascript("window.handleBack && window.handleBack()", result -> {
            if ("true".equals(result)) { lastBackAt = 0; return; }
            long now = SystemClock.elapsedRealtime();
            if (lastBackAt != 0 && now - lastBackAt <= 2000) {
                lastBackAt = 0;
                web.evaluateJavascript("window.prepareExit && window.prepareExit()", saved -> {
                    if ("true".equals(saved)) finish();
                    else toast(UiText.get(MainActivity.this,"Veriler kaydedilemedi; uygulama açık tutuldu.","Data could not be saved; the app was kept open."));
                });
            } else { lastBackAt = now; toast(UiText.get(MainActivity.this,"Çıkmak için tekrar geri basın.","Press Back again to exit.")); }
        });
    }
    @Override protected void onPause() { lastBackAt = 0; web.evaluateJavascript("window.prepareExit && window.prepareExit()", null); super.onPause(); }
    @Override protected void onDestroy() {
        updater.close();
        web.removeJavascriptInterface("Android"); web.destroy(); super.onDestroy();
    }
}
