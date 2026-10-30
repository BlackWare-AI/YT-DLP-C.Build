'use strict';
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
    if(raw.some(Boolean)) throw Error('Geçerli ana kayıt veya yedek bulunamadı.');
    const legacy={settings:JSON.parse(localStorage.getItem('builder.settings') || '{}'),
      links:'', cuts:[], history:JSON.parse(localStorage.getItem('builder.history') || '[]')};
    if(!validState(legacy)) throw Error('Eski kayıt yapısı geçersiz.');
    return legacy;
  } catch(e) {
    storageError='Kayıtlı veriler okunamadı; mevcut kayıtların üzerine yazılmayacak. '+e.message;
    return {settings:{},links:'',cuts:[],history:[]};
  }
}
state=readState();
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
    if(!saved) throw Error('Veriler kaydedilemedi.');
    savedHistory=state.history;savedDailyHistory=state.notesDailyHistory;
  } else {
    state.storageRevision=Math.max(Date.now(),(state.storageRevision || 0)+1);
    const raw=JSON.stringify(state);let saved=false;
    for(const key of ['builder.state','builder.state.backup']) {
      try {localStorage.setItem(key,raw);saved=true;} catch(e) { /* The other slot can still save. */ }
    }
    if(!saved) throw Error('Veriler kaydedilemedi.');
  }
}
function save() {try {persist();return true;} catch(e) {$('status').textContent=e.message;return false;}}
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
  $('modeHint').textContent={av:'En iyi görüntü + en iyi ses. Uyumlu kapsayıcıyı yt-dlp seçer.',video:'En iyi sessiz video akışı. Ses eklenmez.',audio:'En iyi ses akışı, kaynak biçimi korunarak çıkarılır.',still:'En iyi sessiz video akışından ilk 1 saniye.',frame:'İlk saniyeden tek JPG; geçici video silinir.'}[state.settings.mode];
}
function renderCuts() {
  $('cuts').textContent='';
  $('cutLabels').hidden=!state.cuts.length;
  $('cutCount').textContent=state.cuts.length ? state.cuts.length+' kesit' : 'Tam video';
  $('fullVideo').disabled=!state.cuts.length;
  $('cutHint').textContent=state.cuts.length ? 'Saniye gir; sondan saymak için -3 / inf kullan. Tüm linkler ve kesitler tek komutta, çıktılar ayrı dosyalarda. Yeniden kodlama zorlanmaz; başlangıç anahtar kareye kayabilir.' : 'Tam video seçili. İstersen birden fazla kesit ekleyebilirsin.';
  state.cuts.forEach((c,i) => {
    const row = document.createElement('div'); row.className='cut';
    for (const [key,label] of [['start','Başlangıç'],['end','Bitiş']]) {
      const inp = document.createElement('input'); inp.value=c[key]; inp.placeholder=label;
      inp.setAttribute('aria-label',label+' kesit '+(i+1));
      inp.oninput=()=>{ c[key]=inp.value; save(); preview(); }; row.append(inp);
    }
    const del=document.createElement('button'); del.textContent='×';
    del.setAttribute('aria-label','Kesit '+(i+1)+' sil');
    del.onclick=()=>{ state.cuts.splice(i,1); renderCuts(); save(); preview(); };
    row.append(del); $('cuts').append(row);
  });
}
function renderNotesCount() {
  notesView.render();
  $('notesCount').textContent=Builder.countNoteLinks(state.notes)+' bağlantı';
}
let renderedLinksKey=null;
function renderLinks(urls) {
  const key=JSON.stringify(urls);if(key===renderedLinksKey)return;renderedLinksKey=key;
  $('count').textContent=urls.length+' bağlantı';
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
    const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Bağlantı '+(i+1)+' sil');
    remove.onclick=()=>{state.links=Builder.removeUrl(state.links,url);$('links').value=state.links;save();preview();};
    row.append(index,meta,remove);$('linkList').append(row);
  });
}
function renderSelection(urls) {
  const kinds=urls.map(Builder.collectionKind).filter(Boolean);
  $('itemSection').hidden=!kinds.length;
  const active=kinds.length && Object.keys(state.selection).some(k=>String(state.selection[k]).trim());
  $('itemSection').classList.toggle('has-selection',Boolean(active));
  $('itemBadge').textContent=active ? 'Etkin' : 'İsteğe bağlı';
  $('itemScope').textContent=kinds.includes('profile') ? 'Profil bağlantısı gönderi listesi içindir; motorun profil desteğine bağlıdır. Story listesi için /stories/hesap/ kullanın. Sıra, yt-dlp’nin döndürdüğü listedeki sıradır.' : 'Story hesap listesi veya post içindeki öğeler seçilir. Sıra, yt-dlp’nin döndürdüğü listedeki sıradır; tarih sırası garanti edilmez.';
}
function preview() {
  try {
    const result=Builder.build(state);
    renderLinks(result.urls);renderSelection(result.urls);
    $('output').textContent=result.command; $('error').textContent=''; $('copy').disabled=copying;
    $('commandCount').textContent=result.commandCount+' komut';$('commandTitle').textContent='Komut hazır';
    return result;
  } catch(e) {
    const urls=Builder.parseUrls(state.links,true);
    renderLinks(urls);renderSelection(urls);
    $('error').textContent=e.message; $('output').textContent=''; $('copy').disabled=true;
    $('commandCount').textContent='—';$('commandTitle').textContent='Komut';
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
  if (native) { if (!native.copy(text)) throw Error('Pano işlemi başarısız.'); }
  else await navigator.clipboard.writeText(text);
}
function exportText(text,filename) {
  if (native) { native.exportText(text,filename); return; }
  const url=URL.createObjectURL(new Blob([text],{type:filename.endsWith('.json') ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function historyText(records) {
  return records.map(h=>new Date(h.date).toLocaleString('tr-TR')+' | '+(Array.isArray(h.urls) ? h.urls.length : h.count)+' bağlantı | '+h.mode+' | '+h.engine+
    '\nYalnızca komut oluşturuldu ve kopyalandı.\n'+(h.urls || []).join('\n')+'\n'+
    (h.snapshot ? JSON.stringify(h.snapshot.settings,null,2)+'\nÖğe seçimi: '+JSON.stringify(h.snapshot.selection || {})+'\nKesitler: '+JSON.stringify(h.snapshot.cuts)+'\n' : '')+h.command).join('\n\n');
}
function button(label, action, plain=false) {
  const b=document.createElement('button'); b.textContent=label;
  if(plain) b.className='plain-action';
  b.onclick=async()=>{ try { await action(); } catch(e) { $('status').textContent=e.message; alert(e.message); } };
  return b;
}
function askConfirm(message,{title='Silme işlemi',accept='Sil'}={}) {
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
  if (!state.history.length) $('history').textContent='Henüz kayıt yok.';
  state.history.forEach((h,i)=>{
    const d=new Date(h.date), key=d.toLocaleDateString('tr-TR');
    let day=days.get(key);
    if(!day) {
      day=document.createElement('details');day.className='history-day';
      const title=document.createElement('summary');
      title.textContent=d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
      day.append(title);days.set(key,day);$('history').append(day);
    }
    const item=document.createElement('details'); item.className='history-item';
    const summary=document.createElement('summary');
    summary.textContent=d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})+' | '+(Array.isArray(h.urls) ? h.urls.length : h.count)+' bağlantı | '+
      ({av:'Video + Ses',video:h.snapshot && h.snapshot.schema===2 ? 'Sessiz Video' : 'Video + Ses',audio:'Ses',still:'StillClip',frame:'Frame'}[h.mode] || h.mode)+' | '+(h.engine==='normal'?'Normal':'Deneysel');
    item.append(summary);
    let loaded=false;
    item.addEventListener('toggle',()=>{
    if(!item.open || loaded)return;loaded=true;
    const pre=document.createElement('pre'); pre.textContent=historyText([h]); item.append(pre);
    const actions=document.createElement('div'); actions.className='group';
    actions.append(button('Kopyala',()=>{
      if (!h.snapshot) throw Error('Bu eski kaydı güncel kurallarla oluşturmak için bağlantılarını yeniden girin.');
      return copyText(Builder.build({...h.snapshot,settings:Builder.normalizeSettings(h.snapshot.settings,h.snapshot.schema)}).command);
    },true),button('TXT dışa aktar',()=>exportText(historyText([h]),'yt-dlp-command-'+i+'.txt')),
      button('Tekrar düzenle',()=>{
        if (!h.snapshot) { alert('Eski prototip kaydında düzenleme bilgisi bulunmuyor. Komutu kopyalayabilirsiniz.'); return; }
        state.settings=Builder.normalizeSettings(h.snapshot.settings,h.snapshot.schema); state.schema=2; state.links=h.snapshot.links;
        state.cuts=JSON.parse(JSON.stringify(h.snapshot.cuts)); state.selection={only:'',after:'',before:'',...h.snapshot.selection}; save(); hydrate(); closeHistory(); window.scrollTo(0,0);
      }), button('Sil',async()=>{
        if (!await askConfirm('Bu işlem geçmişi kaydı silinsin mi?',{title:'Kaydı sil'})) return;
        const old=state.history; state.history=old.filter((_,n)=>n!==i);
        try { persist(); } catch(e) { state.history=old; throw e; } showHistory();
      },true));
    item.append(actions);
    });
    day.append(item);
  });
}
function showNotesDailyHistory() {
  const root=$('notesDailyHistory');root.textContent='';
  const records=state.notesDailyHistory.slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!records.length) {root.textContent='Henüz not günlüğü kaydı yok.';return;}
  for(const record of records) {
    const section=document.createElement('details');section.className='daily-note-item';
    const title=document.createElement('summary');
    const [year,month,day]=record.date.split('-').map(Number);
    title.textContent=new Date(year,month-1,day).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})+
      ' · '+Builder.countNoteLinks(record.notes||'')+' bağlantı';
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
  if(!urls.length) throw Error(fromClipboard ? 'Panoda uygun Instagram bağlantısı yok.' : 'Eklemek için bir Instagram bağlantısı girin.');
  const existing=Builder.parseUrls(state.links,true);
  const added=urls.filter(url=>!existing.includes(url));
  if(added.length) {
    // Preserve even an unfinished/manual draft; append only new canonical URLs.
    state.links=(state.links+'\n'+added.join('\n')).trim();
    $('links').value=state.links; persist(); preview();
  }
  $('linkStatus').textContent=added.length ? added.length+' bağlantı eklendi.' : 'Bu bağlantılar zaten listede.';
}
$('addLink').onclick=()=>{
  try { appendLinks($('newLink').value,false); state.newLink=''; $('newLink').value='';save(); }
  catch(e) {$('linkStatus').textContent=e.message;}
};
$('paste').onclick=async()=>{
  try {
    const text=native ? native.readClipboard() : await navigator.clipboard.readText();
    if(!text || !text.trim()) throw Error('Pano boş veya metin içermiyor.');
    appendLinks(text,true);
  } catch(e) {$('linkStatus').textContent=e.message || 'Pano okunamadı.';}
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
      throw Error('Komut kopyalandı, kayıt tamamlanamadı; bağlantılar korundu: '+e.message);
    }
    hydrate();
    $('status').textContent='Komut kopyalandı · Geçmişte kayıtlı';
  } catch(e) { $('status').textContent=e.message; }
  finally {copying=false;preview();}
};
function closeHistory() {
  $('historyPanel').hidden=true;
  $('historyBtn').setAttribute('aria-expanded','false');
}
$('settingsBtn').onclick=()=>{
  const expanded=$('settingsPanel').hidden;
  $('settingsPanel').hidden=!expanded;
  $('settingsBtn').setAttribute('aria-expanded',String(expanded));
};
$('historyBtn').onclick=()=>{
  if(!$('historyPanel').hidden) {closeHistory();return;}
  showHistoryPanel('commands');
  $('historyPanel').hidden=false;
  $('historyBtn').setAttribute('aria-expanded','true');
};
$('historyTab').onclick=()=>showHistoryPanel('commands');
$('notesLogTab').onclick=()=>showHistoryPanel('notes');
$('close').onclick=closeHistory;
$('clear').onclick=()=>{
  askConfirm('Tüm işlem geçmişi kalıcı olarak silinsin mi?',{title:'İşlem geçmişini temizle',accept:'Tümünü sil'}).then(confirmed=>{
  if (!confirmed) return;
  const old=state.history; state.history=[];
  try { persist(); showHistory(); } catch(e) { state.history=old; alert(e.message); }
  });
};
$('exportSettings').onclick=()=>exportText(JSON.stringify({app:'YT-DLP Command Builder',version:'1.1.6',exportedAt:new Date().toISOString(),state},null,2),'yt-dlp-builder-backup.json');
$('export').onclick=()=>exportText(historyText(state.history),'yt-dlp-command-history.txt');
function saveNotes() {
  state.notes=$('notes').value;
  state.notesDraftDate=localDateKey(new Date());
  clearTimeout(notesArchiveTimer);notesArchiveTimer=setTimeout(flushNotesDailyLog,700);
  $('notesStatus').textContent=save() ? 'Kaydedildi' : $('status').textContent;
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
    if(!text) throw Error('Pano boş veya metin içermiyor.');
    insertNoteText(text);
  } catch(e) {$('notesStatus').textContent=e.message || 'Pano okunamadı.';}
};
$('notesClear').onclick=async()=>{
  if(!$('notes').value) return;
  if(!await askConfirm('Link Notları tamamen silinsin mi? Not Günlüğü ve işlem geçmişi korunur.',{title:'Link Notlarını temizle',accept:'Notları sil'})) return;
  if(!flushNotesDailyLog()) return;
  const old=state.notes;state.notes='';$('notes').value='';
  if(!save()) {state.notes=old;$('notes').value=old;renderNotesCount();$('notesStatus').textContent=$('status').textContent;return;}
  renderNotesCount();
  $('notesStatus').textContent='Notlar silindi · Günlük kayıtlar korundu';
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
  catch(e) {notesLogFailed=true;state.notesDailyHistory=previous;$('notesStatus').textContent='Günlük not kaydı yapılamadı: '+e.message;return false;}
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
if(storageError) $('status').textContent=storageError;
flushNotesDailyLog();

window.setUpdateStatus=(message,busy,available=false)=>{
  $('updateStatus').textContent=message;
  const button=$('checkUpdate');
  button.disabled=Boolean(busy);
  button.classList.toggle('update-available',Boolean(available));
  button.setAttribute('aria-label',message ? 'Güncelle. '+message : 'Güncelle');
};
$('checkUpdate').onclick=()=>{
  if(window.Android && typeof Android.checkUpdates==='function') {
    const available=$('checkUpdate').classList.contains('update-available');
    window.setUpdateStatus('Güncelleme kontrol ediliyor…',true,available);
    Android.checkUpdates();
  } else window.setUpdateStatus('Güncelleme kontrolü Android uygulamasında kullanılabilir.',false);
};
