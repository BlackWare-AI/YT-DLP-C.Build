## YT-DLP Command Builder 1.1.4

### Türkçe
- Önceki AMOLED güncelleme teklifi penceresi geri getirildi. Güncelle düğmesi yalnızca kontrol eder; APK, penceredeki **İndir ve yükle** onayından sonra indirilir. **Daha sonra**, geri veya dışarı dokunarak kapatma indirme başlatmaz.
- Not Günlüğü yalnızca Link Notları’ndan beslenir. Temizlenmiş bağlantılar ve etiketler her gün tek kayıtta birikir; aynı URL tekrarlanmaz, en son etiket kullanılır.
- Notlardan kaldırılan bağlantılar günlükte korunur. Mevcut etiket sıralaması günlükte de uygulanır. İşlem Geçmişi ve komut kopyalama bu günlüğe veri eklemez.
- Kısa bekleme, notları kapatma, arka plana geçme ve çıkışta günlük kaydı denetlenir. 10 dakikalık kontrol sürer; değişmeyen kayıt tekrar yazılmaz. Kaydedilmiş taslağın tarihi, kapanma/sonlandırma sonrası gün değişmiş olsa da korunur.
- Link Notları’nda etiket grupları arasına tek satırlık görsel `- - - -` ayraçlar eklendi. Tireler notlara, günlüğe veya panoya eklenmez; seçilip kopyalanamaz.
- TR ve EN APK’leri ayrı olarak aynı release’te yayımlanır. Mevcut yerel veriler korunur.

### English
- Restored the previous AMOLED update offer. Update checks for a release; the APK downloads only after confirming **Install update** in the dialog. **Later**, Back or dismissing the offer does not start a download.
- The Notes Log is fed only by Link Notes. Cleaned links and annotations accumulate in one record per day, with unique URLs and the latest annotation.
- Removing links from current notes does not remove archived entries. Existing tag grouping also orders the daily log. Command history and copying commands do not feed this archive.
- Notes are archived after a short pause, on note closure, background/exit and launch, with a ten-minute fallback check. Unchanged records are not rewritten. Persisted draft edit dates support recovery across midnight.
- Tag groups in Link Notes have a single visual row of spaced dashes. The dashes cannot be selected or copied and are never saved as note or archive text.
- Separate Turkish and English APKs are published in this release. Existing local data is preserved.

Android 10+ · version 1.1.4 · version code 15 · signed with the existing release key.
