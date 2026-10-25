# YT-DLP Command Builder · 1.0.3

Android 10+ için çevrimdışı Termux komut oluşturucu. İndirme yapmaz. Paket: `com.blackware.ytdlpcommandbuilder`. Java/WebView uygulamasında yerel ARM kütüphanesi yoktur; ARM64 desteklenir.

## 1.0.3 değişiklikleri

- Shell argümanları tutarlı çift tırnaklarla kaçırılır; yalnızca yol başındaki `$HOME` genişletilir.
- Yalnızca `instagram.com` / `www.instagram.com` üzerindeki Stories, Reels (`/reel/`), gönderi (`/p/`) ve TV bağlantıları kabul edilir. Paylaşım parametreleri temizlenir; yapışık linkler ayrılır ve tekilleştirilir. İçerik sorgusu yapılmaz; Story kimlik uzunluğu sınırı yoktur.
- Metin alanının içindeki pano düğmesi Instagram bağlantılarını mevcut taslağa ekler. Pano yalnızca düğmeye basıldığında okunur; diğer siteler panodan eklenmez.
- Tam genişlikte **Komutu kopyala** düğmesi seçim paneli ile bağlantı paneli arasındadır.
- Taslak her değişiklikte Android SharedPreferences üzerinden senkron diske yazılır. Başarılı kopyalama geçmişe kaydedildikten sonra bağlantılar temizlenir; diğer ayarlar ve kesitler korunur. Pano veya kayıt hatası bağlantıları silmez.
- Dört biçim, çoklu kesit, tek ana komut, `Video` / `Audio` / `SClip` alt klasörleri, AMOLED arayüz ve siyah uygulama ikonu korunur. `--force-keyframes-at-cuts` eklenmez.

## Seçimler ve kalite

| Seçim | Komut seçenekleri | Sonuç |
| --- | --- | --- |
| Video + Ses | `-f "bv+ba/b"` | En iyi ayrı video + en iyi ayrı ses, tek dosyada; yoksa en iyi birleşik kaynak |
| Sessiz Video | `-f "bv"` | En iyi video-only akış |
| Yalnızca Ses | `-f "ba/b" -x --audio-format best` | En iyi ses akışı; kaynak codec'i mümkünse dönüştürülmeden korunur |
| StillClip | `-f "bv" --download-sections "*0-1"` | En iyi sessiz video akışından ilk saniye için kesit isteği |

Kalite/bitrate düşürme veya zorunlu MP3/M4A dönüşümü uygulanmaz. Video + Ses için kapsayıcı zorlanmaz; yt-dlp seçilen akışlara uygun kapsayıcıyı seçer. Codec ve uzantı kaynağa göre değişir. En iyi seçim yt-dlp'nin format sıralamasına göre yapılır.

Ses için `--embed-thumbnail --convert-thumbnails jpg` varsayılan olarak açıktır ve tercihi kalıcıdır. Kapak kırpılmaz. Kapak işlemi kaynak biçiminin desteğine bağlıdır; Opus/Ogg/FLAC için yt-dlp ortamında `mutagen` gerekebilir. Kaynak codec'i yt-dlp tarafından doğrudan korunamıyorsa `best` ses çıkarma davranışını yt-dlp belirler.

## Kullanım

1. Normal `yt-dlp` veya deneysel `$HOME/yt-dlp-story-test/bin/yt-dlp` motorunu manuel seçin. Uygulama motor kurmaz veya kendiliğinden değiştirmez.
2. İndirme seçimini yapın. Video ve sesin birlikte indirilmesi için **Video + Ses** kartını kullanın.
3. Linkleri büyük **Çoklu bağlantı** alanına yapıştırın. Alt alta, boşlukla veya yapışık URL'ler desteklenir. Alan içindeki pano düğmesi veya alttaki `+ Ekle` alanıyla mevcut listeyi büyütün. Temizlenen linkler numaralı kuyrukta görünür ve ayrı silinebilir.
4. Video + Ses / Sessiz Video için kesit ekleyin. Her yeni satır `0 / 1` ile başlar. `Tam video` tüm kesitleri kaldırır. Tüm linkler ve seçilen kesitler tek komuta yazılır. Negatif değer sondan saniye, `Son`/`inf` dosya sonudur; örneğin `-3 / inf`. Süre bilinmeden karşılaştırılamayan karışık baştan/sondan aralıklar reddedilir.
5. Komutu kopyalayıp Termux'a yapıştırın. Başarılı kopyalama otomatik geçmişe kaydedilir ve bağlantı alanı temizlenir; aynı ardışık komut tekrar kaydedilmez. Kopyalama başarısız olursa bağlantılar korunur.

Aynı toplu işlemde tüm linklere aynı motor, biçim ve kesitler uygulanır. Yalnızca Instagram Stories/Reels/gönderi/TV URL'leri desteklenir. Alan adı kesin doğrulanır; sahte alan adları ve diğer siteler reddedilir. Instagram paylaşım parametreleri temizlenir. Aynı temizlenmiş URL bir kez işlenir.

Termux'ta yt-dlp ve ffmpeg bulunmalıdır. Paylaşılan depolama için `termux-setup-storage` çalıştırın. Sessiz video/StillClip, video-only akışı olmayan kaynaklarda yt-dlp format hatası verebilir.

## Kesitler ve komut güvenliği

Tüm URL'ler ve kesitler tek yt-dlp çağrısına aktarılır. Aynı motor, biçim, bekleme ve dosya yolu ayarları toplu işleme uygulanır. Birden fazla aralık tekrar eden `--download-sections` seçenekleridir. yt-dlp 2026.10.21 üzerinde girilen aralık sırasının korunduğu test edilmiştir; diğer motor/fork sürümlerinin işleme davranışını yt-dlp belirler.

Kesit adlarında `%(section_start)s` ve `%(section_end|end)s` vardır; aynı videonun farklı kesitleri birbirinin üzerine yazılmaz. `%(id)s` farklı içerikleri ayırır; yalnızca `autonumber` kullanılıp tekrarlı çalıştırmalarda isimlerin kayması önlenir. Aynı çözümlenmiş aralığı birden fazla kez eklemek aynı dosya adına karşılık gelebilir; no-overwrites mevcut dosyayı korur.

Uygulama indirme yapmaz ve gerçek indirme başarısı göstermez. Toplu indirmedeki hataları ve devam davranışını yt-dlp yönetir.

**Anahtar kare oluşturmak için yeniden kodlama zorlanmaz.** Kesit başlangıcı kaynağın anahtar karelerine kayabilir; özellikle StillClip'in fiziksel çıktısı tam 1.000 saniye olmayabilir. İstenen aralık komutta `*0-1` olarak kalır. Kaynağın süresini aşan aralıklar çevrimdışı bilinemez; yt-dlp çalışma anında değerlendirir.

`--ignore-config --no-playlist` her çağrıda kullanılır. Varsayılan sleep: requests `2`, min `6`, max `16`. Boş, negatif, sonlu olmayan ve max < min değerleri engellenir. Beklemeler tek toplu yt-dlp çağrısı içinde uygulanır. Mevcut dosyaları atla seçeneği açıkken `--no-overwrites`, kapalıyken `--force-overwrites` kullanılır.

Shell argümanları güvenle kaçırılır. Yalnızca yolun başındaki `$HOME` genişletilir; `$()`, backtick ve diğer değişkenler metin olarak kalır. URL'ler `--` ardından bağımsız argümanlardır.

## Dosya adları

Story URL'sindeki kullanıcı adı doğrudan kullanılır. Diğer kaynaklarda `channel`, ardından `uploader`, `creator`, yoksa `unknown` kullanılır; sayısal `uploader_id` kullanılmaz. `uploader` bazı extractor'larda görünen tam ad olabilir.

Şablon: `<hesap>-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(id)s-<biçim><kesit>.%(ext)s`.

Biçim ekleri: `av`, `video`, `audio-best`, `still`. Kesit eki `-cut%(section_start)s-%(section_end|end)s` şeklindedir. Eksik tarih/saat `undated`/`0000` olur. Dosya adı aynı ayarlarda sabittir; no-overwrites aynı çıktıyı korur. yt-dlp saatleri UTC, geçmiş cihazın yerel saatiyle gösterilir.

Kaynaklar: [yt-dlp format seçimi](https://github.com/yt-dlp/yt-dlp#format-selection), [seçenekler](https://github.com/yt-dlp/yt-dlp#usage-and-options), [Instagram extractor](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/instagram.py). Canlı Instagram metadata'sı oturum ve fork sürümüne bağlıdır; oturumlu canlı testler otomatik testlerin kapsamında değildir.

## Kalıcılık ve gizlilik

Varsayılan klasör `$HOME/storage/shared/Download/Apps/YT-DLPTemp`, cookies yolu `$HOME/storage/shared/Download/Apps/YT-DLPTemp/cookies.txt`. İndirme yolu ana klasördür; seçilen biçimin alt klasörü otomatik eklenir. Ana klasör ve cookies yolu bağımsız elle değişir; boş cookies yolu kullanılmaz. `content://` URI'leri Termux yolu olarak kabul edilmez. Cookies içeriği okunmaz.

Android'de ayarlar/taslak/geçmiş özel SharedPreferences alanında her değişiklikte `commit()` ile diske yazılır. Kaydedilmiş bağlantılar arka plana alma, süreç sonlandırma, çökme veya telefon yeniden başlatma sonrasında geri yüklenir; başarılı kopyalama veya kullanıcının silmesi dışında temizlenmez. Web prototipinde localStorage kullanılır. Geçmiş günlere göre gruplandırılır; görüntüleme, kopyalama, düzenleme, tek/tüm kayıt TXT dışa aktarma ve onayla silme desteklenir. Eski prototipin ayrıntısız kayıtları görüntülenebilir/TXT olarak aktarılabilir; güncel komut üretmek için bağlantılar yeniden girilmelidir.

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

Web dosyaları tek kaynaktır; Gradle üretilen assets klasörüne kopyalar. APK: `app/build/outputs/apk/debug/app-debug.apk`. `.github/workflows/android.yml` PR, main ve manuel tetiklemede çalışır. Artifact: **YT-DLP-Command-Builder-1.0.3-debug**, dosya **YT-DLP-Command-Builder-1.0.3-debug.apk**.

Motor testleri shell/URL/format/kesit/yol ve alt klasör doğrulamasını; gerçek yt-dlp/ffmpeg testleri tek işlemde üç URL × üç kesitle dokuz ayrı çıktıyı, Story/Reels kullanıcı adlarını, mevcut klasör korumayı, en iyi kaynak sesini, AAC/Opus codec korumayı, kapak ve sessiz çıktıyı sınar. Kesit süresi testi anahtar kareleri bilinen sentetik kaynak kullanır; tüm gerçek videolarda kare doğruluğu iddiası değildir. UI testleri kart yüksekliklerinin eşitliğini, başlığın alta taşınmasını, tek komutu, dört modu, çoklu link ekle/sil, pano/geçmiş/TXT/kalıcılık/eski ayar geçişini ve 320–760 px düzeni sınar. Android 10/15 emülatör testleri yerel panodan ekleme, panoya kopyalama, başarılı kopyalamada temizleme, TXT, kalıcılık ve ayrı instrumentation süreçleri arasında `am force-stop` sonrası taslak kurtarmayı doğrular; fiziksel telefon klavyesi, sistem geri hareketi ve dosya seçicisi etkileşimi ayrıca kontrol edilmelidir.

Debug anahtarı Actions cache içinde yalnızca test APK güncellemelerinde tutarlılık için saklanır; Release anahtarı değildir. Daha önce üretilmiş önbelleksiz debug APK farklı imza taşıyabilir ve üzerine kurulamayabilir. Kalıcı üretim güncellemeleri için Release anahtarını kullanın.

## Release

`release.yml` yalnızca elle çalıştırılır. Secrets: `SIGNING_KEYSTORE_BASE64`, `SIGNING_STORE_PASSWORD`, `SIGNING_KEY_ALIAS`, `SIGNING_KEY_PASSWORD`. Anahtarlar kaynak koda yazılmaz. R8 Release oluşturulur, imzalanır ve `v1.0.3` yayımlanır; mevcut etiketin üstüne yazılmaz.
