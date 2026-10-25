package ai.blackware.ytdlpcommandbuilder;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(0xff000000);
  getWindow().setNavigationBarColor(0xff000000);
  web = new WebView(this);
  web.setBackgroundColor(0xff000000);
  WebSettings settings = web.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(true);
  settings.setAllowContentAccess(false);
  web.setWebViewClient(new WebViewClient());
  web.setWebChromeClient(new WebChromeClient());
  setContentView(web);
  web.loadUrl("file:///android_asset/index.html");
 }
 @Override public void onBackPressed() {
  if (web.canGoBack()) web.goBack(); else super.onBackPressed();
 }
 @Override protected void onDestroy() {
  web.destroy();
  super.onDestroy();
 }
}
