# YT-DLP Command Builder · 1.0.1

Android 10+ için çevrimdışı Termux komut oluşturucu. İndirme yapmaz. Paket: `com.blackware.ytdlpcommandbuilder`. Java/WebView uygulamasında yerel ARM kütüphanesi yoktur; ARM64 desteklenir.

## 1.0.1 değişiklikleri

- Dört açık seçim: **Video + Ses**, **Sessiz Video**, **Yalnızca Ses**, **StillClip**.
- Ses her zaman en iyi kaynak sesidir; M4A/MP3 seçimi kaldırıldı.
- `--force-keyframes-at-cuts` hiçbir yeni komuta eklenmez.
- Çoklu bağlantı alanı, `+ Ekle`, numaralı temizlenmiş bağlantı kuyruğu ve ayrı silme düğmeleri.
- AMOLED arayüz yeniden tasarlandı: belirgin seçili kartlar, bölüm numaraları, işlem sayısı, isteğe bağlı komut önizlemesi ve daha sade ayarlar.
- Yeni kurulumda tam video seçilidir. Kesit ekleme ve tek dokunuşla tam videoya dönme desteklenir.
- Eski uygulamanın Video tercihi, anlamı korunarak Video + Ses seçimine taşınır; eski ses biçimi tercihi kullanılmaz. Ayarlar, bağlantılar, kesitler ve geçmiş korunur. Geçmişten kopyalama/düzenleme yeni komut kurallarını kullanır; tarihsel komut metni ve TXT kaydı değiştirilmez.

## Seçimler ve kalite

| Seçim | Komut seçenekleri | Sonuç |
| --- | --- | --- |
| Video + Ses | `-f 'bv+ba/b'` | En iyi ayrı video + en iyi ayrı ses, tek dosyada; yoksa en iyi birleşik kaynak |
| Sessiz Video | `-f 'bv'` | En iyi video-only akış |
| Yalnızca Ses | `-f 'ba/b' -x --audio-format best` | En iyi ses akışı; kaynak codec'i mümkünse dönüştürülmeden korunur |
| StillClip | `-f 'bv' --download-sections '*0-1'` | En iyi sessiz video akışından ilk saniye için kesit isteği |

Kalite/bitrate düşürme veya zorunlu MP3/M4A dönüşümü uygulanmaz. Video + Ses için kapsayıcı zorlanmaz; yt-dlp seçilen akışlara uygun kapsayıcıyı seçer. Codec ve uzantı kaynağa göre değişir. En iyi seçim yt-dlp'nin format sıralamasına göre yapılır.

Ses için `--embed-thumbnail --convert-thumbnails jpg` varsayılan olarak açıktır ve tercihi kalıcıdır. Kapak kırpılmaz. Kapak işlemi kaynak biçiminin desteğine bağlıdır; Opus/Ogg/FLAC için yt-dlp ortamında `mutagen` gerekebilir. Kaynak codec'i yt-dlp tarafından doğrudan korunamıyorsa `best` ses çıkarma davranışını yt-dlp belirler.

## Kullanım

1. Normal `yt-dlp` veya deneysel `$HOME/yt-dlp-story-test/bin/yt-dlp` motorunu manuel seçin. Uygulama motor kurmaz veya kendiliğinden değiştirmez.
2. İndirme seçimini yapın. Video ve sesin birlikte indirilmesi için **Video + Ses** kartını kullanın.
3. Linkleri büyük **Çoklu bağlantı** alanına yapıştırın. Alt alta, boşlukla veya yapışık URL'ler desteklenir. İsterseniz alttaki `+ Ekle` alanıyla listeyi büyütün. Temizlenen linkler numaralı kuyrukta görünür ve ayrı silinebilir.
4. Video + Ses / Sessiz Video için kesit ekleyin. Her yeni satır `0 / 1` ile başlar. `Tam video` tüm kesitleri kaldırır. Negatif değer sondan saniye, `Son`/`inf` dosya sonudur; örneğin `-3 / inf`. Süre bilinmeden karşılaştırılamayan karışık baştan/sondan aralıklar reddedilir.
5. Komutu kopyalayıp Termux'a yapıştırın. Başarılı kopyalama otomatik geçmişe kaydedilir; aynı ardışık komut tekrar kaydedilmez.

Aynı toplu işlemde tüm linklere aynı motor, biçim ve kesitler uygulanır. Instagram Stories/Reels/gönderileri ile yt-dlp'nin diğer http/https içerik URL'leri desteklenir. Instagram paylaşım parametreleri temizlenir; diğer sitelerin gerekli sorgu parametreleri korunur. Aynı temizlenmiş URL bir kez işlenir.

Termux'ta yt-dlp ve ffmpeg bulunmalıdır. Paylaşılan depolama için `termux-setup-storage` çalıştırın. Sessiz video/StillClip, video-only akışı olmayan kaynaklarda yt-dlp format hatası verebilir.

## Kesitler ve komut güvenliği

Her URL ve kesit ayrı yt-dlp çağrısıdır; çağrılar tek subshell içinde sırayla çalışır. Dosya adında biçim, kesit sırası ve normalize aralık bulunur. Bir çağrının hatası diğerlerini durdurmaz; subshell'in son çıkış kodu son çağrıya aittir. Uygulama gerçek indirme başarısı göstermez.

**Anahtar kare oluşturmak için yeniden kodlama zorlanmaz.** Kesit başlangıcı kaynağın anahtar karelerine kayabilir; özellikle StillClip'in fiziksel çıktısı tam 1.000 saniye olmayabilir. İstenen aralık komutta `*0-1` olarak kalır. Kaynağın süresini aşan aralıklar çevrimdışı bilinemez; yt-dlp çalışma anında değerlendirir.

`--ignore-config --no-playlist` her çağrıda kullanılır. Varsayılan sleep: requests `2`, min `6`, max `16`. Boş, negatif, sonlu olmayan ve max < min değerleri engellenir. Beklemeler her yt-dlp çağrısının kendi içinde uygulanır. Mevcut dosyaları atla seçeneği açıkken `--no-overwrites`, kapalıyken `--force-overwrites` kullanılır.

Shell argümanları güvenle kaçırılır. Yalnızca yolun başındaki `$HOME` genişletilir; `$()`, backtick ve diğer değişkenler metin olarak kalır. URL'ler `--` ardından bağımsız argümanlardır.

## Dosya adları

Story URL'sindeki kullanıcı adı doğrudan kullanılır. Diğer kaynaklarda `channel`, ardından `uploader`, `creator`, yoksa `unknown` kullanılır; sayısal `uploader_id` kullanılmaz. `uploader` bazı extractor'larda görünen tam ad olabilir.

Şablon: `<hesap>-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(id)s-<biçim><kesit>.%(ext)s`.

Biçim ekleri: `av`, `video`, `audio-best`, `still`. Eksik tarih/saat `undated`/`0000` olur. Dosya adı aynı ayarlarda sabittir; no-overwrites aynı çıktıyı korur. yt-dlp saatleri UTC, geçmiş cihazın yerel saatiyle gösterilir.

Kaynaklar: [yt-dlp format seçimi](https://github.com/yt-dlp/yt-dlp#format-selection), [seçenekler](https://github.com/yt-dlp/yt-dlp#usage-and-options), [Instagram extractor](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/instagram.py). Canlı Instagram metadata'sı oturum ve fork sürümüne bağlıdır; oturumlu canlı testler otomatik testlerin kapsamında değildir.

## Kalıcılık ve gizlilik

Varsayılan klasör `$HOME/storage/shared/Download/Apps/YT-DLPTemp`, cookies yolu `$HOME/storage/shared/Download/Apps/YT-DLPTemp/cookies.txt`. Yollar bağımsız elle değişir; boş cookies yolu kullanılmaz. `content://` URI'leri Termux yolu olarak kabul edilmez. Cookies içeriği okunmaz.

Android'de ayarlar/taslak/geçmiş özel SharedPreferences alanında tutulur. Web prototipinde localStorage kullanılır. Geçmiş günlere göre gruplandırılır; görüntüleme, kopyalama, düzenleme, tek/tüm kayıt TXT dışa aktarma ve onayla silme desteklenir. Eski prototipin ayrıntısız kayıtları görüntülenebilir/TXT olarak aktarılabilir; güncel komut üretmek için bağlantılar yeniden girilmelidir.

Geçmiş kendiliğinden budanmaz. Okunamayan veriler üzerine yazılmaz. Verileri temizlemek veya uygulamayı kaldırmak yerel kayıtları siler; geçmişinizi önce dışa aktarın. Sistem yedeklemesi kapalıdır.

Uygulamada INTERNET veya depolama izni, reklam, analitik veya üçüncü taraf runtime bağımlılığı yoktur. WebView sadece dört paketli dosyayı sunar; gezinme/ağ/file/content erişimi ve WebView debugging kapalıdır. Pano yerel Android API, TXT dışa aktarma sistem Belge Oluştur seçicisini kullanır.

## Derleme ve doğrulama

JDK 17, Gradle 8.11.1, Android SDK 35 / build-tools 35.0.0:

```sh
node --test tests/engine.test.cjs
python -m pip install yt-dlp==2026.10.21
python tests/media_integration.py
npm install --no-save --ignore-scripts playwright@1.58.2
npx playwright install chromium
node tests/ui.cjs
gradle :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
gradle :app:connectedDebugAndroidTest
```

Web dosyaları tek kaynaktır; Gradle üretilen assets klasörüne kopyalar. APK: `app/build/outputs/apk/debug/app-debug.apk`. `.github/workflows/android.yml` PR, main ve manuel tetiklemede çalışır. Artifact: **YT-DLP-Command-Builder-1.0.1-debug**, dosya **YT-DLP-Command-Builder-1.0.1-debug.apk**.

Motor testleri shell/URL/format/kesit/yol doğrulamasını; gerçek yt-dlp/ffmpeg testleri ayrı kesitleri, en iyi kaynak sesini, AAC/Opus codec korumayı, kapak ve sessiz çıktıyı sınar. Kesit süresi testi anahtar kareleri bilinen sentetik kaynak kullanır; tüm gerçek videolarda kare doğruluğu iddiası değildir. UI testleri dört modu, çoklu link ekle/sil, pano/geçmiş/TXT/kalıcılık/eski ayar geçişini ve 320–760 px düzeni sınar. Android 10/15 emülatör testi yerel pano/TXT/kalıcılığı doğrular; fiziksel telefon klavyesi, sistem geri hareketi ve dosya seçicisi etkileşimi ayrıca kontrol edilmelidir.

Debug anahtarı Actions cache içinde yalnızca test APK güncellemelerinde tutarlılık için saklanır; Release anahtarı değildir. Daha önce üretilmiş önbelleksiz debug APK farklı imza taşıyabilir ve üzerine kurulamayabilir. Kalıcı üretim güncellemeleri için Release anahtarını kullanın.

## Release

`release.yml` yalnızca elle çalıştırılır. Secrets: `SIGNING_KEYSTORE_BASE64`, `SIGNING_STORE_PASSWORD`, `SIGNING_KEY_ALIAS`, `SIGNING_KEY_PASSWORD`. Anahtarlar kaynak koda yazılmaz. R8 Release oluşturulur, imzalanır ve `v1.0.1` yayımlanır; mevcut etiketin üstüne yazılmaz.
