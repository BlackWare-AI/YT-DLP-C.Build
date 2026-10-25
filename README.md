# YT-DLP Command Builder · 1.0.0

Android 10+ için çevrimdışı Termux komut oluşturucu. İndirme yapmaz; bağlantılarınızı ve seçtiğiniz ayarları güvenli bir shell komutuna dönüştürür. Paket: `com.blackware.ytdlpcommandbuilder`. Java/WebView uygulamasında yerel ARM kütüphanesi yoktur; ARM64 desteklenir.

## Kullanım

1. Normal `yt-dlp` veya deneysel `$HOME/yt-dlp-story-test/bin/yt-dlp` motorunu seçin. Motor otomatik değiştirilmez; uygulama motor kurmaz.
2. Video, Ses veya StillClip seçin. Ses varsayılan olarak M4A ve gömülü kapak kullanır; gelişmiş ayarlardan MP3 seçilebilir.
3. Bir veya birden fazla http/https içerik bağlantısı yapıştırın. Yapışık URL'ler ayrılır, Instagram paylaşım parametreleri kaldırılır, tekrarlar tekilleştirilir. Diğer sitelerin gerekli sorgu parametreleri korunur.
4. Video modunda kesit ekleyin/silin. İlk satır `0 / 1` şeklindedir; **tam video için tüm kesitleri silin**. Negatif değer sondan saniye, `Son`/`inf` dosya sonudur. Süre bilinmeden karşılaştırılamayan karışık baştan/sondan aralıklar reddedilir; örneğin `-3 / inf` geçerlidir.
5. Komutu kopyalayıp Termux'a yapıştırın. Başarılı kopyalama işlemi otomatik geçmişe kaydedilir; aynı ardışık komut tekrar kaydedilmez.

Termux'ta `yt-dlp` ve `ffmpeg` bulunmalıdır. Paylaşılan depolama erişimi için `termux-setup-storage` çalıştırın. Ses kapak işlemlerinde ffmpeg kullanılır. İlgili içerikte thumbnail veya video-only formatı yoksa yt-dlp hata verebilir; StillClip bilinçli olarak `-f bv` kullanır.

## Komut davranışı

- Video: `-f 'bv*+ba/b' --merge-output-format mp4`.
- Ses: `-f 'ba/b' -x --audio-format m4a --embed-thumbnail --convert-thumbnails jpg`; MP3 seçilebilir. Kapak kırpılmaz. Kapak ekleme tercihi kalıcıdır ve başlangıçta açıktır.
- StillClip: `-f 'bv' --download-sections '*0-1' --force-keyframes-at-cuts`; ses/kesit düzenleyicisi uygulanmaz.
- Varsayılan sleep: requests `2`, min `6`, max `16`. Boş, negatif, sonlu olmayan ve max < min değerleri engellenir.
- `--ignore-config --no-playlist` her çağrıda kullanılır. Böylece başka yt-dlp ayar dosyalarının biçimi, kesitleri veya çıktı yolunu değiştirmesi önlenir. Mevcut dosyaları atla seçeneği `--no-overwrites`, kapalı hali `--force-overwrites` üretir.
- Her URL ve her kesit ayrı yt-dlp çağrısıdır. Çağrılar tek subshell içinde sırayla çalışır; birinin başarısız olması diğerlerini durdurmaz. Shell'in son çıkış kodu son çağrıya aittir; uygulama indirme başarısı göstermez. Ayrı çağrılar arasında sleep sayacı paylaşılmaz; ayarlanan süreler her çağrının kendi içinde yt-dlp tarafından uygulanır.
- Kesit adlarında sıra ve normalize başlangıç/bitiş bulunur (`-video-cut2-52-inf`). Ses biçimi ve StillClip de ayrı dosya adları kullanır. Aynı içerik ve ayarlar yeniden çalıştırıldığında ad sabittir; no-overwrites mevcut çıktıyı korur. Kesit sırası değişirse sıra eki de değişir.
- Kesitler `--force-keyframes-at-cuts` ile ffmpeg tarafından yeniden kodlanır; bu, kesim doğruluğu için ek işlem süresi ve olası kalite kaybı getirir. Kaynağın süresini aşan aralıklar çevrimdışı bilinemez; yt-dlp çalışma anında değerlendirilir.
- Shell argümanları tek tırnakla kaçırılır. Yalnızca yolun başındaki `$HOME` genişletilir; `$()`, backtick ve diğer değişkenler metin olarak kalır. URL'ler `--` ardından bağımsız argümanlardır.

## Dosya adları ve metadata

Story URL'sindeki hesap adı doğrudan kullanılır. Reels/diğer sitelerde `channel`, sonra `uploader`, sonra `creator`, yoksa `unknown` kullanılır. Sayısal `uploader_id` kullanılmaz; `uploader` bazı extractor'larda görünen tam ad olabilir. Gerçek kullanıcı adının her kaynakta bulunması garanti edilemez.

Şablon: `<hesap>-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(id)s-<biçim><kesit>.%(ext)s`.

Tarih/saat yoksa `undated`/`0000` kullanılır; mevcut zaman eklenip tekrarlı dosya oluşturulmaz. yt-dlp zaman alanlarını UTC olarak biçimlendirir. Geçmiş ekranı cihazın yerel saatini kullanır. Aynı içerik içindeki farklı medya öğelerinin ayrımı extractor'ın `id` alanına bağlıdır.

Kaynaklar: [yt-dlp seçenekleri ve çıktı şablonları](https://github.com/yt-dlp/yt-dlp#output-template), [Instagram extractor](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/instagram.py). Canlı Instagram metadata'sı, oturum ve kullanılan fork sürümüne bağlıdır. Oturumlu canlı Instagram testi bu depodaki testlerin kapsamında değildir.

## Ayarlar, geçmiş ve gizlilik

İndirme klasörü: `$HOME/storage/shared/Download/Apps/YT-DLPTemp`.
Cookies dosyası: `$HOME/storage/shared/Download/Apps/YT-DLPTemp/cookies.txt`.
İkisi bağımsız elle değiştirilebilir; cookies boşsa seçenek eklenmez. Android `content://` URI'leri Termux yolu olarak kabul edilmez.

Android'de ayarlar, taslak ve geçmiş uygulamanın özel SharedPreferences alanına yazılır; yalnızca WebView/tarayıcı depolamasına bağlı değildir. Web prototipinde localStorage kullanılır ve eski prototip kayıtları korunur. Geçmiş günlere göre gruplandırılır; ayrıntı, kopyalama, tek/tüm kayıt TXT dışa aktarma, onayla silme ve tekrar düzenleme desteklenir. Eski prototipte ayrıntıları kaydedilmemiş işlemler sadece görüntülenebilir/kopyalanabilir.

Kayıtlar kendiliğinden budanmaz. Okunamayan kayıtların üzerine yazılmaz; depolama/kopyalama hataları bildirilir. Uygulama verilerini temizlemek veya uygulamayı kaldırmak yerel verileri siler; geçmişi TXT olarak dışa aktarın. Sistem yedeklemesi kapalıdır. TXT dosyaları komutları ve yolları içerir; cookies dosyasının içeriği uygulama tarafından okunmaz.

Android panosu yerel API ile kullanılır; TXT dışa aktarma sistemin Belge Oluştur seçicisini kullanır ve depolama izni istemez. Uygulamada internet izni, reklam, analitik, indirme motoru veya üçüncü taraf çalışma zamanı bağımlılığı yoktur. WebView yalnızca paket içindeki dört izinli dosyayı sanal HTTPS kökeninden sunar; gezinme/ağ/dosya/content erişimi ve WebView hata ayıklaması kapalıdır.

## Derleme ve testler

JDK 17, Gradle 8.11.1, Android SDK 35 / build-tools 35.0.0:

```sh
node --test tests/engine.test.cjs
gradle :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

Web dosyaları tek kaynaktır; Gradle tarafından üretilen assets klasörüne kopyalanır. Çıktı `app/build/outputs/apk/debug/app-debug.apk`.

`.github/workflows/android.yml` özellik dallarında, PR'larda ve main üzerinde çalışır. Motor/shell testleri, APK ve lint, Chromium UI testleri, yerel medya üzerinde gerçek yt-dlp/ffmpeg testleri ve Android 10/15 emülatör smoke testleri içerir. APK artifact adı **YT-DLP-Command-Builder-1.0.0-debug**; içindeki dosya **YT-DLP-Command-Builder-1.0.0-debug.apk**. GitHub Actions debug anahtarları geçicidir; farklı çalıştırmaların APK'leri birbirinin üzerine güncellenemeyebilir. Kalıcı güncellemeler için Release anahtarını kullanın.

```sh
# Yalnızca geliştirme/test ortamı için:
npm install --no-save --ignore-scripts playwright@1.58.2
npx playwright install chromium
node tests/ui.cjs
python -m pip install yt-dlp==2026.10.21
python tests/media_integration.py
# Android emülatörü veya bağlı test cihazı:
gradle :app:connectedDebugAndroidTest
```

`tests/engine.test.cjs`: URL, motor, format, kesit, yollar, sayılar, gerçek bash/sh sözdizimi ve argv kaçış testleri.
`tests/media_integration.py`: sentetik extractor metadata'sı + yerel HTTP medyası ile gerçek yt-dlp/ffmpeg; ayrı kesitler ve süreler, mevcut dosya koruma, M4A/MP3 kapak, sessiz StillClip ve eksik metadata fallback'i.
`tests/ui.cjs`: arayüz, seçimler, kesit ekle/sil, kalıcılık, pano, geçmiş, TXT, silme onayı, bozuk kayıt koruma ve ekran genişlikleri.
`AppSmokeTest.java`: Android'de çevrimdışı açılış, paketlenmiş JS, seçimler, yerel pano/geçmiş, tekrar açma ve uygulama içi geri davranışı. Fiziksel telefondaki klavye, sistem geri hareketi ve Belge Oluştur sağlayıcısının elle doğrulanması ayrıca gerekir.

## İmzalı Release

Mevcut `release.yml` yalnızca elle çalıştırılır; sıradan push'larda Release yayımlamaz. GitHub Secrets: `SIGNING_KEYSTORE_BASE64`, `SIGNING_STORE_PASSWORD`, `SIGNING_KEY_ALIAS`, `SIGNING_KEY_PASSWORD`. Şifreler/anahtar kaynak koda yazılmaz. Workflow R8 ile Release oluşturur, imzalar ve `v1.0.0` Release yayımlar. Aynı sürüm etiketi zaten varsa yeni sürüm/etiket kararı gerekir.
