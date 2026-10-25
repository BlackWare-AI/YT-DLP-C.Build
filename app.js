'use strict';
const $ = id => document.getElementById(id);
const native = window.Android;
let state, storageError = '', copying = false;
function validState(v) {
  return v && typeof v.settings==='object' && v.settings && !Array.isArray(v.settings) &&
    Array.isArray(v.history) && Array.isArray(v.cuts) && typeof v.links==='string' &&
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
function persist() {
  if(storageError) throw Error(storageError);
  if(native) {
    if(!native.saveState(JSON.stringify(state))) throw Error('Veriler kaydedilemedi.');
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
    for (const b of $(id).querySelectorAll('button')) {
      const active = b.dataset.value === state.settings[key];
      b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));
    }
  }
  $('cutSection').hidden = !['av','video'].includes(state.settings.mode);
  $('modeHint').textContent={av:'En iyi görüntü + en iyi ses. Uyumlu kapsayıcıyı yt-dlp seçer.',video:'En iyi sessiz video akışı. Ses eklenmez.',audio:'En iyi ses akışı, kaynak biçimi korunarak çıkarılır.',still:'En iyi sessiz video akışından ilk 1 saniye.'}[state.settings.mode];
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
function renderLinks(urls) {
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
    const urls=Builder.parseUrls(state.links);
    renderLinks(urls);renderSelection(urls);
    const result=Builder.build(state);
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
  for(const [key,id] of [['only','itemOnly'],['after','itemAfter'],['before','itemBefore']]) $(id).value=state.selection[key];
  for (const key of ['folder','cookies','requests','min','max','thumb','overwrite'])
    $(key)[['thumb','overwrite'].includes(key)?'checked':'value']=state.settings[key];
  renderButtons(); renderCuts(); preview();
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
function button(label, action) {
  const b=document.createElement('button'); b.textContent=label;
  b.onclick=async()=>{ try { await action(); } catch(e) { $('status').textContent=e.message; alert(e.message); } };
  return b;
}
function showHistory() {
  $('history').textContent=''; let day='';
  if (!state.history.length) $('history').textContent='Henüz kayıt yok.';
  state.history.forEach((h,i)=>{
    const d=new Date(h.date), key=d.toLocaleDateString('tr-TR');
    if (key!==day) { const title=document.createElement('h3'); title.textContent=d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}); $('history').append(title); day=key; }
    const item=document.createElement('details'); item.className='history-item';
    const summary=document.createElement('summary');
    summary.textContent=d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})+' | '+(Array.isArray(h.urls) ? h.urls.length : h.count)+' bağlantı | '+
      ({av:'Video + Ses',video:h.snapshot && h.snapshot.schema===2 ? 'Sessiz Video' : 'Video + Ses',audio:'Ses',still:'StillClip'}[h.mode] || h.mode)+' | '+(h.engine==='normal'?'Normal':'Deneysel');
    item.append(summary);
    const pre=document.createElement('pre'); pre.textContent=historyText([h]); item.append(pre);
    const actions=document.createElement('div'); actions.className='group';
    actions.append(button('Kopyala',()=>{
      if (!h.snapshot) throw Error('Bu eski kaydı güncel kurallarla oluşturmak için bağlantılarını yeniden girin.');
      return copyText(Builder.build({...h.snapshot,settings:Builder.normalizeSettings(h.snapshot.settings,h.snapshot.schema)}).command);
    }),button('TXT dışa aktar',()=>exportText(historyText([h]),'yt-dlp-command-'+i+'.txt')),
      button('Tekrar düzenle',()=>{
        if (!h.snapshot) { alert('Eski prototip kaydında düzenleme bilgisi bulunmuyor. Komutu kopyalayabilirsiniz.'); return; }
        state.settings=Builder.normalizeSettings(h.snapshot.settings,h.snapshot.schema); state.schema=2; state.links=h.snapshot.links;
        state.cuts=JSON.parse(JSON.stringify(h.snapshot.cuts)); state.selection={only:'',after:'',before:'',...h.snapshot.selection}; save(); hydrate(); $('dialog').close(); window.scrollTo(0,0);
      }), button('Sil',()=>{
        if (!confirm('Bu geçmiş kaydı silinsin mi?')) return;
        const old=state.history; state.history=old.filter((_,n)=>n!==i);
        try { persist(); } catch(e) { state.history=old; throw e; } showHistory();
      }));
    item.append(actions); $('history').append(item);
  });
}
for (const key of ['folder','cookies','requests','min','max','thumb','overwrite']) {
  $(key).oninput=()=>{ state.settings[key]=['thumb','overwrite'].includes(key)?$(key).checked:$(key).value; save(); preview(); };
}
for (const [id,key] of [['engines','engine'],['modes','mode']]) $(id).onclick=e=>{
  const b=e.target.closest('button[data-value]'); if (!b) return;
  state.settings[key]=b.dataset.value; save(); renderButtons(); preview();
};
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
$('links').oninput=()=>{state.links=$('links').value; save(); preview();};
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
    const oldHistory=state.history, oldLinks=state.links, oldCuts=state.cuts, oldSelection=state.selection;
    if (!state.history[0] || state.history[0].command!==result.command) {
      const record={date:new Date().toISOString(),count:result.urls.length,urls:result.urls,
        engine:result.settings.engine,mode:result.settings.mode,command:result.command,snapshot};
      state.history=[record,...state.history];
    }
    // Do not erase text added while the asynchronous clipboard operation ran.
    if(state.links===snapshot.links) state.links='';
    if(JSON.stringify(state.cuts)===JSON.stringify(snapshot.cuts)) state.cuts=[];
    if(JSON.stringify(state.selection)===JSON.stringify(snapshot.selection)) state.selection={only:'',after:'',before:''};
    try { persist(); }
    catch(e) {
      state.history=oldHistory; state.links=oldLinks; state.cuts=oldCuts; state.selection=oldSelection;
      throw Error('Komut kopyalandı, kayıt tamamlanamadı; bağlantılar korundu: '+e.message);
    }
    hydrate();
    $('status').textContent='Komut kopyalandı · Geçmişte kayıtlı';
  } catch(e) { $('status').textContent=e.message; }
  finally {copying=false;preview();}
};
$('historyBtn').onclick=()=>{showHistory(); $('dialog').showModal();};
$('close').onclick=()=>$('dialog').close();
$('clear').onclick=()=>{
  if (!confirm('Tüm işlem geçmişi kalıcı olarak silinsin mi?')) return;
  const old=state.history; state.history=[];
  try { persist(); showHistory(); } catch(e) { state.history=old; alert(e.message); }
};
$('exportSettings').onclick=()=>exportText(JSON.stringify({app:'YT-DLP Command Builder',version:'1.0.5',exportedAt:new Date().toISOString(),state},null,2),'yt-dlp-builder-backup.json');
$('export').onclick=()=>exportText(historyText(state.history),'yt-dlp-command-history.txt');
$('notes').oninput=()=>{
  state.notes=$('notes').value;
  $('notesStatus').textContent=save() ? 'Kaydedildi' : $('status').textContent;
};
function closeNotes() {
  if(!save()) {$('notesStatus').textContent=$('status').textContent;return;}
  $('notesDialog').close();$('notesBtn').focus();
}
$('notesBtn').onclick=()=>{$('notesDialog').showModal();$('notes').focus();};
$('notesClose').onclick=closeNotes;
$('notesDialog').addEventListener('cancel',e=>{e.preventDefault();closeNotes();});
window.handleBack=()=>{
  if($('notesDialog').open) {closeNotes();return true;}
  if($('dialog').open) {$('dialog').close();return true;}
  return false;
};
window.prepareExit=()=>save();
// Every mutation saves synchronously; lifecycle handlers must not overwrite newer disk state.
hydrate();
if(storageError) $('status').textContent=storageError;
