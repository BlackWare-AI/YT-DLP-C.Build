'use strict';
// Product copy is localized explicitly; notes, URLs and saved commands stay untouched.
const language='en';
const english={
  "Motor seç": "Choose engine",
  "Çevrimdışı": "Offline",
  "Normal": "Standard",
  "Deneysel": "Experimental",
  "Ne indireceksin?": "What will you download?",
  "En iyi kalite": "Best quality",
  "Video + Ses": "Video & Audio",
  "Tek dosyada": "In one file",
  "Sessiz Video": "Silent Video",
  "Yalnızca görüntü": "Video only",
  "Yalnızca Ses": "Audio Only",
  "En iyi kaynak sesi": "Best source audio",
  "Kısa Kesit": "Short Clip",
  "İlk saniye · sessiz": "First second · silent",
  "Yalnızca Kare": "Frame Only",
  "Tek JPG kare": "One JPG frame",
  "Link Notları": "Link Notes",
  "Komutu kopyala": "Copy command",
  "Çoklu bağlantı": "Multiple links",
  "0 bağlantı": "0 links",
  "Bir veya birden fazla içerik bağlantısı": "One or more content links",
  "Panodan bağlantı ekle": "Add links from clipboard",
  "Tam adres veya stories/... / reel/... · Yapışık Instagram bağlantıları otomatik ayrılır.": "Full URL or stories/... / reel/... · Joined Instagram links are separated automatically.",
  "Listeye yeni bağlantı ekle": "Add a new link to the list",
  "Bir bağlantı daha…": "Another link…",
  "Bağlantı ekle": "Add link",
  "+ Ekle": "+ Add",
  "İşlenecek bağlantılar": "Links to process",
  "Story / post sırası": "Story / post position",
  "İsteğe bağlı": "Optional",
  "Yalnızca sıra": "Exact position",
  "Bu sıradan sonra": "After this position",
  "Bu sıradan önce": "Before this position",
  "Boş": "Empty",
  "Sıra 1’den başlar; içerik kimliği değildir. Boşken seçim uygulanmaz. Sonrası/öncesi belirtilen öğeyi içermez. Örnek: 3 sonrası, 4. öğeden başlar. Aynı seçim listedeki hesap ve post bağlantılarına uygulanır; tüm biçimlerde geçerlidir.": "Positions start at 1; they are not content IDs. Leave blank to skip selection. After/before excludes the specified item: after 3 starts at item 4. The same selection applies to account and post links in the list, in every mode.",
  "Video kesitleri": "Video segments",
  "Tam video": "Full video",
  "+ Kesit ekle": "+ Add segment",
  "Başlangıç / sn": "Start / seconds",
  "Bitiş / sn veya Son": "End / seconds or inf",
  "Tam video seçili. İstersen birden fazla kesit ekleyebilirsin.": "Full video selected. You can add multiple segments.",
  "Kare zamanı": "Frame time",
  "JPG · özgün çözünürlük": "JPG · original resolution",
  "Frame zamanı": "Frame time",
  "0,5 saniye": "0.5 seconds",
  "Özel zaman": "Custom time",
  "Özel kare zamanı, saniye": "Custom frame time, seconds",
  "Saniye cinsinden zaman": "Time in seconds",
  "Tek JPG · geçici video otomatik silinir. FFmpeg gerekir.": "One JPG · temporary video is deleted automatically. Requires FFmpeg.",
  "Komut": "Command",
  "Komutu göster": "Show command",
  "Gelişmiş ayarlar": "Advanced settings",
  "Yollar ve bekleme": "Paths and delays",
  "Ana indirme klasörü": "Main download folder",
  "Cookies dosyası": "Cookies file",
  "$HOME/... veya /storage/emulated/0/... · Boş cookies yolu kullanılmaz.": "$HOME/... or /storage/emulated/0/... · An empty cookies path is omitted.",
  "İstek arası / sn": "Request delay / sec",
  "İndirme min / sn": "Download min / sec",
  "İndirme max / sn": "Download max / sec",
  "Ses dosyasına kapak göm": "Embed audio artwork",
  "Kaynak kapak görseli varsa": "If source artwork is available",
  "Mevcut dosyaları atla": "Skip existing files",
  "Aynı dosyayı yeniden indirme": "Do not download the same file again",
  "Komutu Termux'a yapıştır. yt-dlp ve ffmpeg gerekir.": "Paste the command into Termux. Requires yt-dlp and ffmpeg.",
  "Güncelle": "Update",
  "İşlem geçmişi": "Command history",
  "KAYITLAR": "RECORDS",
  "Kayıt türü": "Record type",
  "İşlem Geçmişi": "Command History",
  "Not Günlüğü": "Notes Log",
  "Geçmişi kapat": "Close history",
  "İndirme sonucu kaydedilmez.": "Download results are not recorded.",
  "Tüm ayarları dışa aktar (JSON)": "Export all settings (JSON)",
  "Motor, biçim, yollar, beklemeler, taslak bağlantılar, sıra/kesit seçimleri, link notları ve geçmiş birlikte kaydedilir. Cookies dosyasının içeriği alınmaz.": "Engine, format, paths, delays, draft links, item/segment selections, link notes and history are saved together. Cookies file contents are not included.",
  "TXT dışa aktar": "Export TXT",
  "Tümünü temizle": "Clear all",
  "Link Notları’ndaki temizlenmiş bağlantılar ve etiketler gün içinde tek kayıtta birikir. Tekrarlar eklenmez; son etiket kullanılır. Notlardan silinen satırlar günlükte korunur. Değişiklikler kısa bir bekleme sonrası ve kapanışta kaydedilir; 10 dakikalık kontrol de sürer.": "Cleaned links and tags from Link Notes accumulate in one daily record. Duplicate links are skipped; the latest tag is kept. Removing a note does not remove it from the log. Changes are archived after a short pause and on exit, with a 10-minute backup check.",
  "Link notlarını kapat": "Close link notes",
  "Bağlantıları, indirme biçimlerini ve özel isteklerini buraya yaz. Boş bir satıra dokunup yapıştırabilirsin. Instagram adresleri kısa yola çevrilir; biçim notların korunur.": "Write links, download formats and special requests here. Tap an empty line to paste. Instagram URLs become short paths; your format notes are preserved.",
  "Kalıcı bağlantı ve biçim notları": "Saved link and format notes",
  "Tüm notları sil": "Delete all notes",
  "Notlara panodan yapıştır": "Paste clipboard into notes",
  "Seçili yere yapıştır": "Paste at selection",
  "Otomatik kaydedilir": "Saved automatically",
  "Onay": "Confirm",
  "Vazgeç": "Cancel",
  "Sil": "Delete",
  "Geçerli ana kayıt veya yedek bulunamadı.": "No valid main record or backup was found.",
  "Eski kayıt yapısı geçersiz.": "The legacy record structure is invalid.",
  "Veriler kaydedilemedi.": "Data could not be saved.",
  "En iyi görüntü + en iyi ses. Uyumlu kapsayıcıyı yt-dlp seçer.": "Best video + best audio. yt-dlp chooses a compatible container.",
  "En iyi sessiz video akışı. Ses eklenmez.": "Best silent video stream. No audio is added.",
  "En iyi ses akışı, kaynak biçimi korunarak çıkarılır.": "The best audio stream is extracted in its source format.",
  "En iyi sessiz video akışından ilk 1 saniye.": "The first second of the best silent video stream.",
  "İlk saniyeden tek JPG; geçici video silinir.": "One JPG from the first second; the temporary video is deleted.",
  "Saniye gir; sondan saymak için -3 / inf kullan. Tüm linkler ve kesitler tek komutta, çıktılar ayrı dosyalarda. Yeniden kodlama zorlanmaz; başlangıç anahtar kareye kayabilir.": "Enter seconds; use -3 / inf to count from the end. All links and segments use one command with separate output files. Re-encoding is not forced; the start may shift to a keyframe.",
  "Başlangıç": "Start",
  "Bitiş": "End",
  "Etkin": "Active",
  "Profil bağlantısı gönderi listesi içindir; motorun profil desteğine bağlıdır. Story listesi için /stories/hesap/ kullanın. Sıra, yt-dlp’nin döndürdüğü listedeki sıradır.": "Profile links request a post list, depending on engine support. Use /stories/username/ for Stories. Positions follow the list returned by yt-dlp.",
  "Story hesap listesi veya post içindeki öğeler seçilir. Sıra, yt-dlp’nin döndürdüğü listedeki sıradır; tarih sırası garanti edilmez.": "Select items in a Story account list or a post. Positions follow the list returned by yt-dlp; chronological order is not guaranteed.",
  "Komut hazır": "Command ready",
  "Pano işlemi başarısız.": "Clipboard operation failed.",
  "Silme işlemi": "Delete confirmation",
  "Henüz kayıt yok.": "No records yet.",
  "Ses": "Audio",
  "Bu eski kaydı güncel kurallarla oluşturmak için bağlantılarını yeniden girin.": "Re-enter the links to rebuild this older record using current rules.",
  "Kopyala": "Copy",
  "Tekrar düzenle": "Edit again",
  "Eski prototip kaydında düzenleme bilgisi bulunmuyor. Komutu kopyalayabilirsiniz.": "This older prototype record has no editing data. You can copy its command.",
  "Bu işlem geçmişi kaydı silinsin mi?": "Delete this command history record?",
  "Kaydı sil": "Delete record",
  "Henüz not günlüğü kaydı yok.": "No daily notes yet.",
  "Panoda uygun Instagram bağlantısı yok.": "No supported Instagram links in the clipboard.",
  "Eklemek için bir Instagram bağlantısı girin.": "Enter an Instagram link to add.",
  "Bu bağlantılar zaten listede.": "These links are already in the list.",
  "Pano boş veya metin içermiyor.": "The clipboard is empty or contains no text.",
  "Pano okunamadı.": "Could not read the clipboard.",
  "Komut kopyalandı · Geçmişte kayıtlı": "Command copied · Saved in history",
  "Tüm işlem geçmişi kalıcı olarak silinsin mi?": "Permanently delete all command history?",
  "İşlem geçmişini temizle": "Clear command history",
  "Tümünü sil": "Delete all",
  "Kaydedildi": "Saved",
  "Link Notları tamamen silinsin mi? Not Günlüğü ve işlem geçmişi korunur.": "Delete all Link Notes? The Notes Log and command history will be kept.",
  "Link Notlarını temizle": "Clear Link Notes",
  "Notları sil": "Delete notes",
  "Notlar silindi · Günlük kayıtlar korundu": "Notes deleted · Daily records kept",
  "Güncelleme indiriliyor…": "Downloading update…",
  "Güncelleme kontrol ediliyor…": "Checking for updates…",
  "Güncelleme kontrolü Android uygulamasında kullanılabilir.": "Update checks are available in the Android app.",
  "Uygulama güncel.": "The app is up to date.",
  "Yayımlanmış uygun bir APK bulunamadı.": "No suitable published APK was found.",
  "Güncelleme kontrol edilemedi. İnternet bağlantısını kontrol edip yeniden deneyin.": "Could not check for updates. Check your internet connection and try again.",
  "Güncelleme indirildi.": "Update downloaded.",
  "Güncelleme indirilemedi veya doğrulanamadı. Yeniden deneyin.": "The update could not be downloaded or verified. Try again.",
  "APK bulunamadı; yeniden kontrol edin.": "APK not found; check again.",
  "Yükleme iznini açıp uygulamaya geri dönün.": "Allow installation, then return to the app.",
  "Kurulumu Android ekranında onaylayın.": "Confirm installation on the Android screen.",
  "Yükleme ekranı açılamadı. Yeniden deneyin.": "Could not open the installer. Try again.",
  "Yükleme izni verilmedi. Güncelleme için yeniden kontrol edin.": "Installation permission was not granted. Check for updates again.",
  "Tamam": "OK",
  "Önce açık dışa aktarma işlemini bitirin.": "Finish the current export first.",
  "Dışa aktarma açılamadı.": "Could not open export.",
  "Dışa aktarma iptal edildi.": "Export cancelled.",
  "TXT dosyası kaydedildi.": "TXT file saved.",
  "TXT kaydedilemedi; yeniden deneyin.": "Could not save TXT; try again.",
  "Veriler kaydedilemedi; uygulama açık tutuldu.": "Data could not be saved; the app was kept open.",
  "Çıkmak için tekrar geri basın.": "Press Back again to exit.",
  "Yol / veya $HOME/ ile başlamalı; content:// adresi kullanılamaz.": "The path must start with / or $HOME/; content:// is not supported.",
  "Öğe sırası 1 veya daha büyük bir tam sayı olmalı.": "Item position must be an integer of 1 or greater.",
  "Yalnızca sıra ile sonrası/öncesi birlikte kullanılamaz.": "Exact position cannot be combined with after/before.",
  "Sonrası/öncesi arasında seçilecek öğe yok.": "There are no items between the after/before boundaries.",
  "Yalnızca instagram.com içerik bağlantıları kabul edilir.": "Only instagram.com content links are accepted.",
  "Instagram içerik bağlantısı girin (Story, Reels, gönderi veya TV).": "Enter an Instagram content link (Story, Reels, post or TV).",
  "Geçersiz bağlantı.": "Invalid link.",
  "Frame zamanı 0 ile 1 saniye arasında olmalı.": "Frame time must be between 0 and 1 second.",
  "Geçersiz motor veya biçim.": "Invalid engine or format.",
  "En az bir Instagram içerik bağlantısı girin.": "Enter at least one Instagram content link.",
  "Sleep max, minimumdan küçük olamaz.": "Sleep max cannot be less than the minimum.",
  " bağlantı": " links",
  " bağlantı | ": " links | ",
  " bağlantı eklendi.": " links added.",
  " kesit": " segments",
  " kesit ": " segment ",
  "Kesit ": "Segment ",
  " sil": " delete",
  "Bağlantı ": "Link ",
  " komut": " command",
  "Komut kopyalandı, kayıt tamamlanamadı; bağlantılar korundu: ": "Command copied, but saving failed; links were kept: ",
  "Kayıtlı veriler okunamadı; mevcut kayıtların üzerine yazılmayacak. ": "Saved data could not be read; existing records will not be overwritten. ",
  "Günlük not kaydı yapılamadı: ": "Could not save daily notes: ",
  "Güncelle. ": "Update. ",
  "Güncelleme mevcut: ": "Update available: ",
  "Güncelleme indiriliyor: %": "Downloading update: %",
  "\nYalnızca komut oluşturuldu ve kopyalandı.\n": "\nOnly the command was created and copied.\n",
  "\nÖğe seçimi: ": "\nItem selection: ",
  "\nKesitler: ": "\nSegments: ",
  "Bağlantılarını buraya topluca yapıştır…\n\nhttps://www.instagram.com/stories/hesap/123\nhttps://www.instagram.com/reel/ABC/": "Paste your links here…\n\nhttps://www.instagram.com/stories/username/123\nhttps://www.instagram.com/reel/ABC/",
  "stories/hesap/123\nBiçim: V+S / V / S / SClip\nÖzel istek: …": "stories/username/123\nFormat: V+S / V / S / SClip\nSpecial request: …"
};
const locale=()=>language==='en' ? 'en-US' : 'tr-TR';
const quantity=(n,tr,en)=>n+(language==='en' ? ' '+en+(n===1 ? '' : 's') : tr);
const linkCount=n=>quantity(n,' bağlantı','link');
function t(value) {
  if(language!=='en' || typeof value!=='string')return value;
  if(Object.prototype.hasOwnProperty.call(english,value))return english[value];
  const patterns=[
    [/^(Sleep (?:min|max|requests)) sıfır veya pozitif bir sayı olmalı\.$/,'$1 must be zero or a positive number.'],
    [/^Kesit (\d+): saniye veya bitiş için inf\/Son girin\.$/,'Segment $1: enter seconds, or inf for the end.'],
    [/^Kesit (\d+): süre bilinmeden baştan ve sondan zamanlar karşılaştırılamaz; aynı zaman yönünü veya inf kullanın\.$/,'Segment $1: times from the start and end cannot be compared without a duration; use the same time direction or inf.'],
    [/^Kesit (\d+): bitiş başlangıçtan büyük olmalı\.$/,'Segment $1: the end must be greater than the start.'],
    [/^Güncelleme mevcut: (.*)$/,'Update available: $1'],
    [/^Güncelleme indiriliyor: %(\d+)$/,'Downloading update: %$1']
  ];
  for(const [pattern,replacement] of patterns)if(pattern.test(value))return value.replace(pattern,replacement);
  const prefix='Kayıtlı veriler okunamadı; mevcut kayıtların üzerine yazılmayacak. ';
  if(value.startsWith(prefix))return english[prefix]+t(value.slice(prefix.length));
  return value;
}
// Capture packaged labels once. This never traverses notes/history rendered from user data.
const staticCopy=[];
const textWalker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(textWalker.nextNode()) {
  const node=textWalker.currentNode, source=node.textContent.trim();
  if(english[source])staticCopy.push({node,source,leading:node.textContent.match(/^\s*/)[0],trailing:node.textContent.match(/\s*$/)[0]});
}
const attributeCopy=[];
for(const node of document.querySelectorAll('[placeholder],[aria-label],[title]')) {
  for(const name of ['placeholder','aria-label','title']) {
    const source=node.getAttribute(name);
    if(english[source])attributeCopy.push({node,name,source});
  }
}
function applyLanguage() {
  document.documentElement.lang=language;
  document.querySelector('#modes [data-value=av] strong').style.fontSize='clamp(10px,3vw,12px)';
  for(const {node,source,leading,trailing} of staticCopy)node.textContent=leading+t(source)+trailing;
  for(const {node,name,source} of attributeCopy)node.setAttribute(name,t(source));
  const status=document.getElementById('updateStatus');
  if(status.dataset.message!==undefined) {
    status.textContent=t(status.dataset.message);
    document.getElementById('checkUpdate').setAttribute('aria-label',t('Güncelle. ')+t(status.dataset.message));
  }
  // Clear ephemeral messages rather than carrying a previous-language notification.
  for(const id of ['status','linkStatus','notesStatus'])document.getElementById(id).textContent='';
}
const $ = id => document.getElementById(id);
const native = window.Android;
const notesView=NotesUI.attach($('notes'));
let notesArchiveTimer=0, notesLogFailed=false;
let state, storageError = '', copying = false;
function validState(v) {
  return v && typeof v.settings==='object' && v.settings && !Array.isArray(v.settings) &&
    Array.isArray(v.history) && Array.isArray(v.cuts) && typeof v.links==='string' &&
    (v.notesDailyHistory===undefined || Array.isArray(v.notesDailyHistory)) &&
    (v.notes===undefined || typeof v.notes==='string') && (v.newLink===undefined || typeof v.newLink==='string');
}
function readState() {
  try {
    const raw=native ? [native.getState()] : [localStorage.getItem('builder.state'),localStorage.getItem('builder.state.backup')];
    const candidates=[];
    for(const value of raw) if(value) {
      try {const v=JSON.parse(value);if(validState(v)) candidates.push(v);} catch(e) { /* Try the independent backup. */ }
    }
    if(candidates.length) return candidates.sort((a,b)=>(b.storageRevision || 0)-(a.storageRevision || 0))[0];
    if(raw.some(Boolean)) throw Error(t('Geçerli ana kayıt veya yedek bulunamadı.'));
    const legacy={settings:JSON.parse(localStorage.getItem('builder.settings') || '{}'),
      links:'', cuts:[], history:JSON.parse(localStorage.getItem('builder.history') || '[]')};
    if(!validState(legacy)) throw Error(t('Eski kayıt yapısı geçersiz.'));
    return legacy;
  } catch(e) {
    storageError=t('Kayıtlı veriler okunamadı; mevcut kayıtların üzerine yazılmayacak. ')+t(e.message);
    return {settings:{},links:'',cuts:[],history:[]};
  }
}
state=readState();
applyLanguage();
state.settings=Builder.normalizeSettings(state.settings,state.schema);
state.schema=2;
state.selection={only:'',after:'',before:'',...state.selection};
state.notes=state.notes===undefined ? '' : state.notes;
state.newLink=state.newLink===undefined ? '' : state.newLink;
state.notesDailyHistory=Array.isArray(state.notesDailyHistory) ? state.notesDailyHistory : [];
let savedHistory=null, savedDailyHistory=null;
function persist() {
  if(storageError) throw Error(storageError);
  if(native) {
    let saved;
    if(typeof native.saveDraftState==='function' && savedHistory===state.history && savedDailyHistory===state.notesDailyHistory) {
      const {history,notesDailyHistory,...draft}=state;
      saved=native.saveDraftState(JSON.stringify(draft));
    } else saved=native.saveState(JSON.stringify(state));
    if(!saved) throw Error(t('Veriler kaydedilemedi.'));
    savedHistory=state.history;savedDailyHistory=state.notesDailyHistory;
  } else {
    state.storageRevision=Math.max(Date.now(),(state.storageRevision || 0)+1);
    const raw=JSON.stringify(state);let saved=false;
    for(const key of ['builder.state','builder.state.backup']) {
      try {localStorage.setItem(key,raw);saved=true;} catch(e) { /* The other slot can still save. */ }
    }
    if(!saved) throw Error(t('Veriler kaydedilemedi.'));
  }
}
function save() {try {persist();return true;} catch(e) {$('status').textContent=t(e.message);return false;}}
function renderButtons() {
  for (const [id,key] of [['engines','engine'],['modes','mode']]) {
    for (const b of $(id).querySelectorAll('button[data-value]')) {
      const active = b.dataset.value === state.settings[key];
      b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));
    }
  }
  $('cutSection').hidden = !['av','video'].includes(state.settings.mode);
  $('frameSection').hidden = state.settings.mode!=='frame';
  $('frameCustomTime').hidden = state.settings.frameTime!=='custom';
  for(const button of $('frameTimes').querySelectorAll('button[data-frame-time]')) {
    const active=button.dataset.frameTime===state.settings.frameTime;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  $('modeHint').textContent={av:t('En iyi görüntü + en iyi ses. Uyumlu kapsayıcıyı yt-dlp seçer.'),video:t('En iyi sessiz video akışı. Ses eklenmez.'),audio:t('En iyi ses akışı, kaynak biçimi korunarak çıkarılır.'),still:t('En iyi sessiz video akışından ilk 1 saniye.'),frame:t('İlk saniyeden tek JPG; geçici video silinir.')}[state.settings.mode];
}
function renderCuts() {
  $('cuts').textContent='';
  $('cutLabels').hidden=!state.cuts.length;
  $('cutCount').textContent=state.cuts.length ? quantity(state.cuts.length,' kesit','segment') : t('Tam video');
  $('fullVideo').disabled=!state.cuts.length;
  $('cutHint').textContent=state.cuts.length ? t('Saniye gir; sondan saymak için -3 / inf kullan. Tüm linkler ve kesitler tek komutta, çıktılar ayrı dosyalarda. Yeniden kodlama zorlanmaz; başlangıç anahtar kareye kayabilir.') : t('Tam video seçili. İstersen birden fazla kesit ekleyebilirsin.');
  state.cuts.forEach((c,i) => {
    const row = document.createElement('div'); row.className='cut';
    for (const [key,label] of [['start',t('Başlangıç')],['end',t('Bitiş')]]) {
      const inp = document.createElement('input'); inp.value=c[key]; inp.placeholder=label;
      inp.setAttribute('aria-label',label+t(' kesit ')+(i+1));
      inp.oninput=()=>{ c[key]=inp.value; save(); preview(); }; row.append(inp);
    }
    const del=document.createElement('button'); del.textContent='×';
    del.setAttribute('aria-label',language==='en' ? 'Delete segment '+(i+1) : 'Kesit '+(i+1)+' sil');
    del.onclick=()=>{ state.cuts.splice(i,1); renderCuts(); save(); preview(); };
    row.append(del); $('cuts').append(row);
  });
}
function renderNotesCount() {
  $('notes').classList.toggle('notes-empty',!$('notes').value.trim());
  notesView.render();
  $('notesCount').textContent=linkCount(Builder.countNoteLinks(state.notes));
}
let renderedLinksKey=null;
function renderLinks(urls) {
  const key=language+JSON.stringify(urls);if(key===renderedLinksKey)return;renderedLinksKey=key;
  $('count').textContent=linkCount(urls.length);
  $('linkList').textContent='';
  urls.forEach((url,i)=>{
    const u=new URL(url), parts=u.pathname.split('/').filter(Boolean);
    const row=document.createElement('div'); row.className='link-row';
    const index=document.createElement('span');index.className='link-index';index.textContent=i+1;
    const meta=document.createElement('div');meta.className='link-meta';
    const title=document.createElement('strong');
    title.textContent=parts[0]==='stories' ? '@'+parts[1]+' · Story' : (['reel','reels'].includes(parts[0]) ? 'Reels · '+parts[1] : u.hostname);
    const link=document.createElement('small');link.textContent=url;link.title=url;
    meta.append(title,link);
    const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',language==='en' ? 'Delete link '+(i+1) : 'Bağlantı '+(i+1)+' sil');
    remove.onclick=()=>{state.links=Builder.removeUrl(state.links,url);$('links').value=state.links;save();preview();};
    row.append(index,meta,remove);$('linkList').append(row);
  });
}
function renderSelection(urls) {
  const kinds=urls.map(Builder.collectionKind).filter(Boolean);
  $('itemSection').hidden=!kinds.length;
  const active=kinds.length && Object.keys(state.selection).some(k=>String(state.selection[k]).trim());
  $('itemSection').classList.toggle('has-selection',Boolean(active));
  $('itemBadge').textContent=active ? t('Etkin') : t('İsteğe bağlı');
  $('itemScope').textContent=kinds.includes('profile') ? t('Profil bağlantısı gönderi listesi içindir; motorun profil desteğine bağlıdır. Story listesi için /stories/hesap/ kullanın. Sıra, yt-dlp’nin döndürdüğü listedeki sıradır.') : t('Story hesap listesi veya post içindeki öğeler seçilir. Sıra, yt-dlp’nin döndürdüğü listedeki sıradır; tarih sırası garanti edilmez.');
}
function preview() {
  try {
    const result=Builder.build({...state,language});
    renderLinks(result.urls);renderSelection(result.urls);
    $('output').textContent=result.command; $('error').textContent=''; $('copy').disabled=copying;
    $('commandCount').textContent=quantity(result.commandCount,' komut','command');$('commandTitle').textContent=t('Komut hazır');
    return result;
  } catch(e) {
    const urls=Builder.parseUrls(state.links,true);
    renderLinks(urls);renderSelection(urls);
    $('error').textContent=t(e.message); $('output').textContent=''; $('copy').disabled=true;
    $('commandCount').textContent='—';$('commandTitle').textContent=t('Komut');
    return null;
  }
}
function hydrate() {
  $('links').value=state.links; $('newLink').value=state.newLink; $('notes').value=state.notes;
  $('frameCustomTime').value=state.settings.frameCustomTime || '';
  for(const [key,id] of [['only','itemOnly'],['after','itemAfter'],['before','itemBefore']]) $(id).value=state.selection[key];
  for (const key of ['folder','cookies','requests','min','max','thumb','overwrite'])
    $(key)[['thumb','overwrite'].includes(key)?'checked':'value']=state.settings[key];
  renderButtons(); renderCuts(); renderNotesCount(); preview();
}
async function copyText(text) {
  if (native) { if (!native.copy(text)) throw Error(t('Pano işlemi başarısız.')); }
  else await navigator.clipboard.writeText(text);
}
function exportText(text,filename) {
  if (native) { native.exportText(text,filename); return; }
  const url=URL.createObjectURL(new Blob([text],{type:filename.endsWith('.json') ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function historyText(records) {
  return records.map(h=>new Date(h.date).toLocaleString(locale())+' | '+linkCount(Array.isArray(h.urls) ? h.urls.length : h.count)+' | '+h.mode+' | '+h.engine+
    t('\nYalnızca komut oluşturuldu ve kopyalandı.\n')+(h.urls || []).join('\n')+'\n'+
    (h.snapshot ? JSON.stringify(h.snapshot.settings,null,2)+t('\nÖğe seçimi: ')+JSON.stringify(h.snapshot.selection || {})+t('\nKesitler: ')+JSON.stringify(h.snapshot.cuts)+'\n' : '')+h.command).join('\n\n');
}
function allHistoryText() {
  const notes=state.notesDailyHistory.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(record=>{
    const [year,month,day]=record.date.split('-').map(Number);
    return new Date(year,month-1,day).toLocaleDateString(locale(),{day:'numeric',month:'long',year:'numeric'})+
      ' | '+linkCount(Builder.countNoteLinks(record.notes||''))+'\n'+(record.notes||'');
  }).join('\n\n');
  return ['COMMAND HISTORY',historyText(state.history),'NOTES LOG',notes,'LINK NOTES',state.notes||''].join('\n\n');
}
function button(label, action) {
  const b=document.createElement('button'); b.textContent=label;
  b.onclick=async()=>{ try { await action(); } catch(e) { $('status').textContent=t(e.message); alert(t(e.message)); } };
  return b;
}
function askConfirm(message,{title=t('Silme işlemi'),accept=t('Sil')}={}) {
  const dialog=$('confirmDialog');
  $('confirmTitle').textContent=title;$('confirmMessage').textContent=message;$('confirmAccept').textContent=accept;
  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;dialog.close();resolve(value);};
    $('confirmCancel').onclick=()=>finish(false);$('confirmAccept').onclick=()=>finish(true);
    dialog.addEventListener('close',()=>{if(!settled){settled=true;resolve(false);}},{once:true});
    dialog.showModal();$('confirmCancel').focus();
  });
}
function showHistory() {
  $('history').textContent=''; const days=new Map();
  if (!state.history.length) $('history').textContent=t('Henüz kayıt yok.');
  state.history.forEach((h,i)=>{
    const d=new Date(h.date), key=d.toLocaleDateString(locale());
    let day=days.get(key);
    if(!day) {
      day=document.createElement('details');day.className='history-day';
      const title=document.createElement('summary');
      title.textContent=d.toLocaleDateString(locale(),{day:'numeric',month:'long',year:'numeric'});
      day.append(title);days.set(key,day);$('history').append(day);
    }
    const item=document.createElement('details'); item.className='history-item';
    const summary=document.createElement('summary');
    summary.textContent=d.toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'})+' | '+linkCount(Array.isArray(h.urls) ? h.urls.length : h.count)+' | '+
      ({av:t('Video + Ses'),video:h.snapshot && h.snapshot.schema===2 ? t('Sessiz Video') : t('Video + Ses'),audio:t('Ses'),still:'StillClip',frame:'Frame'}[h.mode] || h.mode)+' | '+(h.engine==='normal'?t('Normal'):t('Deneysel'));
    item.append(summary);
    let loaded=false;
    item.addEventListener('toggle',()=>{
    if(!item.open || loaded)return;loaded=true;
    const pre=document.createElement('pre'); pre.textContent=historyText([h]); item.append(pre);
    const actions=document.createElement('div'); actions.className='group';
    actions.append(button(t('Kopyala'),()=>{
      if (!h.snapshot) throw Error(t('Bu eski kaydı güncel kurallarla oluşturmak için bağlantılarını yeniden girin.'));
      return copyText(Builder.build({...h.snapshot,language,settings:Builder.normalizeSettings(h.snapshot.settings,h.snapshot.schema)}).command);
    }),button(t('TXT dışa aktar'),()=>exportText(historyText([h]),'yt-dlp-command-'+i+'.txt')),
      button(t('Tekrar düzenle'),()=>{
        if (!h.snapshot) { alert(t('Eski prototip kaydında düzenleme bilgisi bulunmuyor. Komutu kopyalayabilirsiniz.')); return; }
        state.settings=Builder.normalizeSettings(h.snapshot.settings,h.snapshot.schema); state.schema=2; state.links=h.snapshot.links;
        state.cuts=JSON.parse(JSON.stringify(h.snapshot.cuts)); state.selection={only:'',after:'',before:'',...h.snapshot.selection}; save(); hydrate(); closeHistory(); window.scrollTo(0,0);
      }), button(t('Sil'),async()=>{
        if (!await askConfirm(t('Bu işlem geçmişi kaydı silinsin mi?'),{title:t('Kaydı sil')})) return;
        const old=state.history; state.history=old.filter((_,n)=>n!==i);
        try { persist(); } catch(e) { state.history=old; throw e; } showHistory();
      }));
    item.append(actions);
    });
    day.append(item);
  });
}
function showNotesDailyHistory() {
  const root=$('notesDailyHistory');root.textContent='';
  const records=state.notesDailyHistory.slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!records.length) {root.textContent=t('Henüz not günlüğü kaydı yok.');return;}
  for(const record of records) {
    const section=document.createElement('details');section.className='daily-note-item';
    const title=document.createElement('summary');
    const [year,month,day]=record.date.split('-').map(Number);
    title.textContent=new Date(year,month-1,day).toLocaleDateString(locale(),{day:'numeric',month:'long',year:'numeric'})+
      ' · '+linkCount(Builder.countNoteLinks(record.notes||''));
    section.append(title);
    section.addEventListener('toggle',()=>{
      if(!section.open || section.querySelector('pre'))return;
      const body=document.createElement('pre');body.textContent=record.notes;section.append(body);
    });
    root.append(section);
  }
}
function showHistoryPanel(panel) {
  const notes=panel==='notes';
  $('historyView').hidden=notes;$('notesLogView').hidden=!notes;
  $('historyTab').classList.toggle('active',!notes);$('historyTab').setAttribute('aria-selected',String(!notes));
  $('notesLogTab').classList.toggle('active',notes);$('notesLogTab').setAttribute('aria-selected',String(notes));
  if(notes) showNotesDailyHistory(); else showHistory();
}
for (const key of ['folder','cookies','requests','min','max','thumb','overwrite']) {
  $(key).oninput=()=>{ state.settings[key]=['thumb','overwrite'].includes(key)?$(key).checked:$(key).value; save(); preview(); };
}
for (const [id,key] of [['engines','engine'],['modes','mode']]) $(id).onclick=e=>{
  const b=e.target.closest('button[data-value]'); if (!b) return;
  state.settings[key]=b.dataset.value; save(); renderButtons(); preview();
};
$('frameTimes').onclick=e=>{
  const button=e.target.closest('button[data-frame-time]');if(!button)return;
  state.settings.frameTime=button.dataset.frameTime;save();renderButtons();preview();
};
$('frameCustomTime').oninput=()=>{state.settings.frameCustomTime=$('frameCustomTime').value;save();preview();};
function appendLinks(text, fromClipboard) {
  const urls=Builder.parseUrls(text,fromClipboard);
  if(!urls.length) throw Error(fromClipboard ? t('Panoda uygun Instagram bağlantısı yok.') : t('Eklemek için bir Instagram bağlantısı girin.'));
  const existing=Builder.parseUrls(state.links,true);
  const added=urls.filter(url=>!existing.includes(url));
  if(added.length) {
    // Preserve even an unfinished/manual draft; append only new canonical URLs.
    state.links=(state.links+'\n'+added.join('\n')).trim();
    $('links').value=state.links; persist(); preview();
  }
  $('linkStatus').textContent=added.length ? (language==='en' ? linkCount(added.length)+' added.' : added.length+' bağlantı eklendi.') : t('Bu bağlantılar zaten listede.');
}
$('addLink').onclick=()=>{
  try { appendLinks($('newLink').value,false); state.newLink=''; $('newLink').value='';save(); }
  catch(e) {$('linkStatus').textContent=t(e.message);}
};
$('paste').onclick=async()=>{
  try {
    const text=native ? native.readClipboard() : await navigator.clipboard.readText();
    if(!text || !text.trim()) throw Error(t('Pano boş veya metin içermiyor.'));
    appendLinks(text,true);
  } catch(e) {$('linkStatus').textContent=t(e.message) || t('Pano okunamadı.');}
};
$('newLink').oninput=()=>{state.newLink=$('newLink').value;save();};
$('newLink').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('addLink').click();}};
for(const [key,id] of [['only','itemOnly'],['after','itemAfter'],['before','itemBefore']]) $(id).oninput=()=>{state.selection[key]=$(id).value;save();preview();};
$('fullVideo').onclick=()=>{state.cuts=[];renderCuts();save();preview();};
$('links').oninput=e=>{
  let value=$('links').value;
  if(e.inputType==='insertFromPaste') {
    const normalized=Builder.normalizeBareUsernames(value);
    if(normalized!==value) {$('links').value=normalized;value=normalized;}
  }
  state.links=value; save(); preview();
};
$('links').addEventListener('blur',()=>{
  const normalized=Builder.normalizeBareUsernames($('links').value);
  if(normalized!==$('links').value) {$('links').value=normalized;state.links=normalized;save();preview();}
});
$('addCut').onclick=()=>{state.cuts.push({start:'0',end:'1'}); renderCuts(); save(); preview();};
$('copy').onclick=async()=>{
  if(copying) return;
  const result=preview(); if (!result) return;
  const snapshot=JSON.parse(JSON.stringify({schema:2,settings:state.settings,links:state.links,cuts:state.cuts,selection:state.selection}));
  copying=true; $('copy').disabled=true;
  try {
    // Require a saved draft before attempting any destructive post-copy change.
    persist();
    await copyText(result.command);
    const oldHistory=state.history, oldLinks=state.links, oldCuts=state.cuts, oldSelection=state.selection, oldSettings=state.settings;
    if (!state.history[0] || state.history[0].command!==result.command) {
      const record={date:new Date().toISOString(),count:result.urls.length,urls:result.urls,
        engine:result.settings.engine,mode:result.settings.mode,command:result.command,snapshot};
      state.history=[record,...state.history];
    }
    // Do not erase text added while the asynchronous clipboard operation ran.
    if(state.links===snapshot.links) state.links='';
    if(JSON.stringify(state.cuts)===JSON.stringify(snapshot.cuts)) state.cuts=[];
    if(JSON.stringify(state.selection)===JSON.stringify(snapshot.selection)) state.selection={only:'',after:'',before:''};
    if(snapshot.settings.mode==='frame' && state.settings.mode==='frame' &&
      state.settings.frameTime===snapshot.settings.frameTime && state.settings.frameCustomTime===snapshot.settings.frameCustomTime)
      state.settings={...state.settings,frameTime:'0.5',frameCustomTime:''};
    try { persist(); }
    catch(e) {
      state.history=oldHistory; state.links=oldLinks; state.cuts=oldCuts; state.selection=oldSelection;
      state.settings=oldSettings;
      throw Error(t('Komut kopyalandı, kayıt tamamlanamadı; bağlantılar korundu: ')+t(e.message));
    }
    hydrate();
    $('status').textContent=t('Komut kopyalandı · Geçmişte kayıtlı');
  } catch(e) { $('status').textContent=t(e.message); }
  finally {copying=false;preview();}
};
function closeHistory() {
  $('historyPanel').hidden=true;
  $('historyBtn').setAttribute('aria-expanded','false');
}
function closeSettings() {
  $('settingsPanel').hidden=true;
  $('settingsBtn').setAttribute('aria-expanded','false');
}
$('settingsBtn').onclick=()=>{
  const expanded=$('settingsPanel').hidden;
  if(expanded) closeHistory();
  $('settingsPanel').hidden=!expanded;
  $('settingsBtn').setAttribute('aria-expanded',String(expanded));
};
$('historyBtn').onclick=()=>{
  if(!$('historyPanel').hidden) {closeHistory();return;}
  closeSettings();
  showHistoryPanel('commands');
  $('historyPanel').hidden=false;
  $('historyBtn').setAttribute('aria-expanded','true');
};
$('historyTab').onclick=()=>showHistoryPanel('commands');
$('notesLogTab').onclick=()=>showHistoryPanel('notes');
$('clear').onclick=()=>{
  askConfirm(t('Tüm işlem geçmişi kalıcı olarak silinsin mi?'),{title:t('İşlem geçmişini temizle'),accept:t('Tümünü sil')}).then(confirmed=>{
  if (!confirmed) return;
  const old=state.history; state.history=[];
  try { persist(); showHistory(); } catch(e) { state.history=old; alert(t(e.message)); }
  });
};
$('exportSettings').onclick=()=>exportText(JSON.stringify({app:'YT-DLP Command Builder',version:'1.1.6',exportedAt:new Date().toISOString(),state},null,2),'yt-dlp-builder-backup.json');
$('export').onclick=()=>exportText(allHistoryText(),'yt-dlp-history.txt');
function saveNotes() {
  state.notes=$('notes').value;
  state.notesDraftDate=localDateKey(new Date());
  clearTimeout(notesArchiveTimer);notesArchiveTimer=setTimeout(flushNotesDailyLog,700);
  $('notesStatus').textContent=save() ? t('Kaydedildi') : $('status').textContent;
  renderNotesCount();
}
function cleanNoteUrls() {
  const editor=$('notes'), raw=editor.value, cleaned=Builder.spaceNoteGroups(Builder.cleanNotes(raw));
  if(raw===cleaned) {notesView.render();return false;}
  const start=Builder.spaceNoteGroups(Builder.cleanNotes(raw.slice(0,editor.selectionStart))).length;
  const end=Builder.spaceNoteGroups(Builder.cleanNotes(raw.slice(0,editor.selectionEnd))).length;
  editor.value=cleaned;editor.setSelectionRange(start,end);saveNotes();return true;
}
$('notes').addEventListener('beforeinput',e=>{
  if(e.inputType==='deleteByCut' || $('notes').selectionStart!==$('notes').selectionEnd) flushNotesDailyLog();
});
$('notes').oninput=e=>{
  if(e.inputType==='insertFromPaste' && cleanNoteUrls())return;
  saveNotes();
};
$('notes').addEventListener('blur',cleanNoteUrls);
function insertNoteText(text) {
  if(!flushNotesDailyLog()) return;
  const editor=$('notes');
  editor.setRangeText(Builder.cleanNoteUrls(text),editor.selectionStart,editor.selectionEnd,'end');
  if(!cleanNoteUrls()) saveNotes();
}
$('notes').addEventListener('paste',e=>{
  if(!e.clipboardData) return;
  e.preventDefault();insertNoteText(e.clipboardData.getData('text/plain'));
});
// Keep the text selection when pressing the in-editor clipboard button.
$('notesPaste').addEventListener('pointerdown',e=>e.preventDefault());
$('notesPaste').onclick=async()=>{
  try {
    const text=native ? native.readClipboard() : await navigator.clipboard.readText();
    if(!text) throw Error(t('Pano boş veya metin içermiyor.'));
    insertNoteText(text);
  } catch(e) {$('notesStatus').textContent=t(e.message) || t('Pano okunamadı.');}
};
$('notesClear').onclick=async()=>{
  if(!$('notes').value) return;
  if(!await askConfirm(t('Link Notları tamamen silinsin mi? Not Günlüğü ve işlem geçmişi korunur.'),{title:t('Link Notlarını temizle'),accept:t('Notları sil')})) return;
  if(!flushNotesDailyLog()) return;
  const old=state.notes;state.notes='';$('notes').value='';
  if(!save()) {state.notes=old;$('notes').value=old;renderNotesCount();$('notesStatus').textContent=$('status').textContent;return;}
  renderNotesCount();
  $('notesStatus').textContent=t('Notlar silindi · Günlük kayıtlar korundu');
};
let notePointer=null;
$('notes').addEventListener('pointerdown',e=>{
  notePointer={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:$('notes').scrollTop};
});
$('notes').addEventListener('pointercancel',()=>{notePointer=null;});
$('notes').addEventListener('pointerup',e=>{
  const down=notePointer;notePointer=null;
  const editor=$('notes');
  if(!down || down.id!==e.pointerId || Math.hypot(e.clientX-down.x,e.clientY-down.y)>8 ||
      Math.abs(editor.scrollTop-down.scroll)>2 || editor.selectionStart!==editor.selectionEnd) return;
  const style=getComputedStyle(editor), lineHeight=parseFloat(style.lineHeight);
  // A hidden mirror measures wrapped lines using the editor's actual font and width.
  const mirror=document.createElement('div');
  Object.assign(mirror.style,{position:'fixed',left:'-10000px',top:'0',visibility:'hidden',
    boxSizing:'border-box',width:editor.clientWidth+'px',whiteSpace:'pre-wrap',overflowWrap:'break-word',
    font:style.font,letterSpacing:style.letterSpacing,padding:style.padding,border:'0'});
  mirror.textContent=editor.value;
  const end=document.createElement('span');end.textContent='\u200b';mirror.append(end);document.body.append(mirror);
  const padding=parseFloat(style.paddingTop);
  const lastLine=Math.floor((end.getBoundingClientRect().top-mirror.getBoundingClientRect().top-padding)/lineHeight);
  mirror.remove();
  const targetLine=Math.floor((e.clientY-editor.getBoundingClientRect().top-parseFloat(style.borderTopWidth)+editor.scrollTop-padding)/lineHeight);
  if(targetLine>lastLine) {
    editor.setRangeText('\n'.repeat(targetLine-lastLine),editor.value.length,editor.value.length,'end');
    saveNotes();
  }
});
let notesScrollY=0;
function closeNotes() {
  if(!flushNotesDailyLog()) return;
  if(!save()) {$('notesStatus').textContent=$('status').textContent;return;}
  $('notesDialog').close();document.documentElement.classList.remove('notes-open');$('notesBtn').focus();window.scrollTo(0,notesScrollY);
}
$('notesBtn').onclick=()=>{notesScrollY=window.scrollY;document.documentElement.classList.add('notes-open');$('notesDialog').showModal();cleanNoteUrls();};
$('notesClose').onclick=closeNotes;
$('notesDialog').addEventListener('cancel',e=>{e.preventDefault();closeNotes();});
window.handleBack=()=>{
  if($('confirmDialog').open) {$('confirmCancel').click();return true;}
  if($('notesDialog').open) {closeNotes();return true;}
  if(!$('historyPanel').hidden) {closeHistory();return true;}
  if(!$('settingsPanel').hidden) {closeSettings();return true;}
  return false;
};
window.prepareExit=()=>flushNotesDailyLog() && save();
const NOTES_DAILY_CHECK_MS=10*60*1000;
function localDateKey(date) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function checkNotesDailyLog(date=new Date()) {
  notesLogFailed=false;
  if(!state.notes.trim()) return false;
  const key=localDateKey(date), previous=state.notesDailyHistory;
  const index=previous.findIndex(record=>record.date===key);
  const notes=Builder.mergeDailyNotes(index>=0 ? previous[index].notes : '',state.notes);
  if(!notes) return false;
  if(index>=0 && previous[index].notes===notes) return false;
  const next=previous.map(record=>({...record}));
  if(index>=0) next[index]={date:key,notes};
  else next.push({date:key,notes});
  next.sort((a,b)=>b.date.localeCompare(a.date));
  state.notesDailyHistory=next;
  try {persist();return true;}
  catch(e) {notesLogFailed=true;state.notesDailyHistory=previous;$('notesStatus').textContent=t('Günlük not kaydı yapılamadı: ')+t(e.message);return false;}
}
function flushNotesDailyLog() {
  clearTimeout(notesArchiveTimer);
  // Replay the last saved draft under its edit date after a kill/restart across midnight.
  const draft=state.notesDraftDate;
  if(/^\d{4}-\d{2}-\d{2}$/.test(draft || '') && draft!==localDateKey(new Date())) {
    const [year,month,day]=draft.split('-').map(Number);
    checkNotesDailyLog(new Date(year,month-1,day));
    if(notesLogFailed) return false;
  }
  checkNotesDailyLog();
  return !notesLogFailed;
}
window.checkNotesDailyLog=checkNotesDailyLog;
window.setInterval(flushNotesDailyLog,NOTES_DAILY_CHECK_MS);
document.addEventListener('visibilitychange',flushNotesDailyLog);
window.addEventListener('pagehide',flushNotesDailyLog);
// Every mutation saves synchronously; lifecycle handlers must not overwrite newer disk state.
hydrate();
if(storageError) $('status').textContent=t(storageError);
flushNotesDailyLog();

window.setUpdateStatus=(message,busy,available=false)=>{
  const canonical=Object.keys(english).find(key=>english[key]===message);
  if(canonical)message=canonical;
  else if(message.startsWith('Update available: '))message='Güncelleme mevcut: '+message.slice(18);
  else if(message.startsWith('Downloading update: %'))message='Güncelleme indiriliyor: %'+message.slice(21);
  $('updateStatus').dataset.message=message;
  $('updateStatus').textContent=t(message);
  const button=$('checkUpdate');
  button.disabled=Boolean(busy);
  button.classList.toggle('update-available',Boolean(available));
  button.setAttribute('aria-label',message ? t('Güncelle. ')+t(message) : t('Güncelle'));
};
$('checkUpdate').onclick=()=>{
  if(window.Android && typeof Android.checkUpdates==='function') {
    const available=$('checkUpdate').classList.contains('update-available');
    window.setUpdateStatus('Güncelleme kontrol ediliyor…',true,available);
    Android.checkUpdates();
  } else window.setUpdateStatus('Güncelleme kontrolü Android uygulamasında kullanılabilir.',false);
};
