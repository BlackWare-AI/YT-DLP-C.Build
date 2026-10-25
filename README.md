# YT-DLP Command Builder

AMOLED siyah temalı, Android/Termux odaklı yt-dlp komut oluşturucu.

## İlk prototip
- Normal yt-dlp veya deneysel Termux fork seçimi
- Video, ses (M4A + gömülü thumbnail), StillClip (ilk 1 saniye)
- Çoklu bağlantı, tüm bağlantılarda aynı format
- Video için birden fazla kesit ekleme
- Kalıcı sleep requests, sleep interval min/max
- İndirme ve cookies dosyası yolları
- Komut kopyalama, yerel işlem geçmişi ve TXT dışa aktarma

Bu sürüm komut üretir, indirme yapmaz. Android APK henüz hazırlanmadı.

## Kullanım
GitHub Pages ile index.html dosyasını yayınlayın veya statik bir web sunucusunda açın. Oluşturulan komutu Termux'a yapıştırın.

Cookies içeriği saklanmaz; yalnızca dosya yolu saklanır. Geçmiş tarayıcının localStorage alanındadır; veriler silinirse kayıtlar kaybolur. TXT dışa aktarabilirsiniz.

Instagram Story erişimi geçerli oturum ve yt-dlp extractor uyumluluğuna bağlıdır. Kesitleri ve ffmpeg davranışını cihazda test edin.
