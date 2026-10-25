'use strict';
const $ = id => document.getElementById(id);
const native = window.Android;
let state, storageError = '';
function readState() {
  try {
    const raw = native ? native.getState() : localStorage.getItem('builder.state');
    if (raw) {
      const v = JSON.parse(raw);
      if (!v || !Array.isArray(v.history) || !Array.isArray(v.cuts) || !v.settings) throw Error('Kayıt yapısı geçersiz');
      return v;
    }
    // Preserve the browser prototype's existing preferences and history.
    return {settings:JSON.parse(localStorage.getItem('builder.settings') || '{}'),
      links:'', cuts:[{start:'0',end:'1'}], history:JSON.parse(localStorage.getItem('builder.history') || '[]')};
  } catch (e) {
    storageError = 'Kayıtlı veriler okunamadı; mevcut kayıtların üzerine yazılmayacak. ' + e.message;
    return {settings:{},links:'',cuts:[{start:'0',end:'1'}],history:[]};
  }
}
state = readState();
state.settings = {...Builder.defaults, ...state.settings};
function persist() {
  if (storageError) throw Error(storageError);
  const raw = JSON.stringify(state);
  if (native) { if (!native.saveState(raw)) throw Error('Veriler kaydedilemedi.'); }
  else localStorage.setItem('builder.state', raw);
}
function save() { try { persist(); } catch (e) { $('status').textContent = e.message; } }
function renderButtons() {
  for (const [id,key] of [['engines','engine'],['modes','mode']]) {
    for (const b of $(id).querySelectorAll('button')) {
      const active = b.dataset.value === state.settings[key];
      b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));
    }
  }
  $('cutSection').hidden = state.settings.mode !== 'video';
}
function renderCuts() {
  $('cuts').textContent='';
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
function preview() {
  try {
    $('count').textContent=Builder.parseUrls(state.links).length+' bağlantı';
    const result=Builder.build(state);
    $('output').textContent=result.command; $('error').textContent=''; $('copy').disabled=false;
    return result;
  } catch(e) {
    $('error').textContent=e.message; $('output').textContent=''; $('copy').disabled=true;
    return null;
  }
}
function hydrate() {
  $('links').value=state.links;
  for (const key of ['folder','cookies','requests','min','max','audioFormat','thumb','overwrite'])
    $(key)[['thumb','overwrite'].includes(key)?'checked':'value']=state.settings[key];
  renderButtons(); renderCuts(); preview();
}
async function copyText(text) {
  if (native) { if (!native.copy(text)) throw Error('Pano işlemi başarısız.'); }
  else await navigator.clipboard.writeText(text);
}
function exportText(text,filename) {
  if (native) { native.exportText(text,filename); return; }
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function historyText(records) {
  return records.map(h=>new Date(h.date).toLocaleString('tr-TR')+' | '+(Array.isArray(h.urls) ? h.urls.length : h.count)+' bağlantı | '+h.mode+' | '+h.engine+
    '\nYalnızca komut oluşturuldu ve kopyalandı.\n'+(h.urls || []).join('\n')+'\n'+
    (h.snapshot ? JSON.stringify(h.snapshot.settings,null,2)+'\nKesitler: '+JSON.stringify(h.snapshot.cuts)+'\n' : '')+h.command).join('\n\n');
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
      ({video:'Video',audio:'Ses',still:'StillClip'}[h.mode] || h.mode)+' | '+(h.engine==='normal'?'Normal':'Deneysel');
    item.append(summary);
    const pre=document.createElement('pre'); pre.textContent=historyText([h]); item.append(pre);
    const actions=document.createElement('div'); actions.className='group';
    actions.append(button('Kopyala',()=>copyText(h.command)),button('TXT dışa aktar',()=>exportText(historyText([h]),'yt-dlp-command-'+i+'.txt')),
      button('Tekrar düzenle',()=>{
        if (!h.snapshot) { alert('Eski prototip kaydında düzenleme bilgisi bulunmuyor. Komutu kopyalayabilirsiniz.'); return; }
        state.settings={...Builder.defaults,...h.snapshot.settings}; state.links=h.snapshot.links;
        state.cuts=JSON.parse(JSON.stringify(h.snapshot.cuts)); save(); hydrate(); $('dialog').close(); window.scrollTo(0,0);
      }), button('Sil',()=>{
        if (!confirm('Bu geçmiş kaydı silinsin mi?')) return;
        const old=state.history; state.history=old.filter((_,n)=>n!==i);
        try { persist(); } catch(e) { state.history=old; throw e; } showHistory();
      }));
    item.append(actions); $('history').append(item);
  });
}
for (const key of ['folder','cookies','requests','min','max','audioFormat','thumb','overwrite']) {
  $(key).oninput=()=>{ state.settings[key]=['thumb','overwrite'].includes(key)?$(key).checked:$(key).value; save(); preview(); };
}
for (const [id,key] of [['engines','engine'],['modes','mode']]) $(id).onclick=e=>{
  const b=e.target.closest('button[data-value]'); if (!b) return;
  state.settings[key]=b.dataset.value; save(); renderButtons(); preview();
};
$('links').oninput=()=>{state.links=$('links').value; save(); preview();};
$('addCut').onclick=()=>{state.cuts.push({start:'0',end:'1'}); renderCuts(); save(); preview();};
$('copy').onclick=async()=>{
  const result=preview(); if (!result) return;
  try {
    await copyText(result.command);
    // Keep old entries; deduplicate only identical consecutive operations.
    if ((!state.history[0] || state.history[0].command!==result.command)) {
      const record={date:new Date().toISOString(),count:result.urls.length,urls:result.urls,
        engine:state.settings.engine,mode:state.settings.mode,command:result.command,
        snapshot:JSON.parse(JSON.stringify({settings:state.settings,links:state.links,cuts:state.cuts}))};
      state.history.unshift(record);
      try { persist(); } catch(e) { state.history.shift(); throw Error('Komut kopyalandı, geçmiş kaydedilemedi: '+e.message); }
    }
    $('status').textContent='Komut kopyalandı · Geçmişte kayıtlı';
  } catch(e) { $('status').textContent=e.message; }
};
$('historyBtn').onclick=()=>{showHistory(); $('dialog').showModal();};
$('close').onclick=()=>$('dialog').close();
$('clear').onclick=()=>{
  if (!confirm('Tüm işlem geçmişi kalıcı olarak silinsin mi?')) return;
  const old=state.history; state.history=[];
  try { persist(); showHistory(); } catch(e) { state.history=old; alert(e.message); }
};
$('export').onclick=()=>exportText(historyText(state.history),'yt-dlp-command-history.txt');
window.handleBack=()=>{if ($('dialog').open) { $('dialog').close(); return true; } return false;};
hydrate();
if(storageError) $('status').textContent=storageError;
