/* Pure command construction. No DOM, network or platform dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Builder = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const defaults = Object.freeze({engine:'experimental', mode:'av',
    folder:'$HOME/storage/shared/Download/Apps/YT-DLPTemp',
    cookies:'$HOME/storage/shared/Download/Apps/YT-DLPTemp/cookies.txt',
    frameTime:'0.5', frameCustomTime:'',
    requests:'2', min:'6', max:'16', thumb:true, overwrite:true});
  function normalizeSettings(settings, schema) {
    const result = {...defaults, ...settings};
    if (schema !== 2 && result.mode === 'video') result.mode = 'av';
    delete result.audioFormat;
    delete result.frameOutput;
    if (!['0.5','custom'].includes(result.frameTime)) result.frameTime='0.5';
    return result;
  }
  // Escape every expansion-sensitive character inside a double-quoted argument.
  const quote = value => '"' + String(value).replace(/[\\"$`]/g, c => '\\' + c) + '"';
  function shellPath(value) {
    const s = String(value).trim();
    if (/[\x00-\x1f\x7f]/.test(s) || !/^(?:\/|\$HOME(?:\/|$))/.test(s))
      throw Error('Yol / veya $HOME/ ile başlamalı; content:// adresi kullanılamaz.');
    // Only the leading HOME is expanded; user-supplied dollars remain literal.
    return s.startsWith('$HOME') ? '"$HOME' + quote(s.slice(5)).slice(1) : quote(s);
  }
  const reservedProfiles = new Set(['accounts','settings','explore','direct','about','legal','developer','developers','web','challenge','oauth','api','emails','directory','reels','reel','stories','p','tv']);
  function collectionKind(url) {
    const path = new URL(url).pathname;
    if (/^\/stories\/[\w.]+$/.test(path)) return 'stories';
    if (/^\/p\/[\w-]+$/.test(path)) return 'post';
    if (/^\/[\w.]+$/.test(path) && !reservedProfiles.has(path.slice(1).toLowerCase())) return 'profile';
    return null;
  }
  function selectionSpec(selection) {
    const values = {};
    for (const key of ['only','after','before']) {
      const raw = (selection || {})[key];
      const value = raw === undefined || raw === null ? '' : String(raw).trim();
      if (value && (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) >= Number.MAX_SAFE_INTEGER))
        throw Error('Öğe sırası 1 veya daha büyük bir tam sayı olmalı.');
      values[key] = value ? Number(value) : null;
    }
    if (values.only !== null) {
      if (values.after !== null || values.before !== null) throw Error('Yalnızca sıra ile sonrası/öncesi birlikte kullanılamaz.');
      return String(values.only);
    }
    if (values.after === null && values.before === null) return null;
    const start = values.after === null ? 1 : values.after + 1;
    const end = values.before === null ? null : values.before - 1;
    if (end !== null && end < start) throw Error('Sonrası/öncesi arasında seçilecek öğe yok.');
    return start + ':' + (end === null ? '' : end);
  }
  // Clean only Instagram URL tokens, preserving all surrounding free-form notes.
  const formatOnlyLine = /^(?:v(?:\+\s*s|\d+(?:s|sec)?|\d+s?)?|s(?:clip)?)(?:\s*[:(].*)?$/i;
  const bareUsernameLine = /^(\s*)@?([a-z0-9._]{1,30})(.*)$/i;
  function normalizeBareUsernames(text) {
    return String(text).replace(/^([^\r\n]*)$/gm, line => {
      const match = line.match(bareUsernameLine);
      if (!match || formatOnlyLine.test(match[2]) || match[2].startsWith('.') || match[2].endsWith('.') || match[2].includes('..')) return line;
      const suffix=match[3];
      if (suffix && !/^\s+(?:v\+\s*s|v\d+(?:s|sec)?|v\d+s|v|sclip|s)(?:\b|(?=\())/i.test(suffix)) return line;
      return match[1] + 'https://www.instagram.com/stories/' + match[2] + suffix;
    });
  }
  function compactInstagramUrls(text) {
    return String(text).replace(/https?:\/\/(?:(?!https?:\/\/)[^\s<>"'])+/gi, (token,offset,source) => {
      if(!/^https?:\/\/(?:www\.)?instagram\.com(?=\/|$)/i.test(token)) return token;
      const clean=token.replace(/[?#].*$/, '').replace(/\/+$/, '');
      let path=clean.replace(/^https?:\/\/(?:www\.)?instagram\.com\/?/i, '').replace(/^\/+/, '');
      // Profile URLs stand for a Story account in this app's command workflow.
      if (path && !/^(?:stories|reel|p|tv)\//i.test(path)) path='stories/'+path;
      return path+(/^https?:\/\//i.test(source.slice(offset+token.length))?'\n':'');
    });
  }
  function separateNoteLinks(text) {
    const route=/(^|\s)((?:stories\/[a-z0-9._]+(?:\/\d+)?|(?:reel|p|tv)\/[a-z0-9_-]+)\/?)/gi;
    return String(text).replace(route,(match,space,link,offset,whole)=>{
      const lineStart=Math.max(whole.lastIndexOf('\n',offset-1),whole.lastIndexOf('\r',offset-1))+1;
      if(offset===0 || !whole.slice(lineStart,offset).trim()) return space+link;
      return '\n'+link;
    });
  }
  function noteFormatTag(line) {
    const match=String(line).match(/^\s*(?:https?:\/\/(?:www\.)?instagram\.com\/)?(?:stories\/[a-z0-9._]+(?:\/[a-z0-9_-]+)?|(?:reel|p|tv)\/[a-z0-9_-]+)\s+([a-z][a-z0-9+_-]*)(?=$|\s|[(:])/i);
    return match ? match[1].toLowerCase() : null;
  }
  function groupTaggedNotes(text) {
    const lines=String(text).split(/\r?\n/), tags=new Map(), slots=[];
    for(let i=0;i<lines.length;i++) {
      const tag=noteFormatTag(lines[i]);
      if(tag===null) continue;
      if(!tags.has(tag)) tags.set(tag,tags.size);
      slots.push({index:i,tag,order:slots.length,line:lines[i]});
    }
    const indexes=slots.map(item=>item.index);
    slots.sort((a,b)=>tags.get(a.tag)-tags.get(b.tag)||a.order-b.order);
    for(let i=0;i<slots.length;i++) lines[indexes[i]]=slots[i].line;
    return lines.join('\n');
  }
  function cleanNoteUrls(text) {
    return groupTaggedNotes(separateNoteLinks(compactInstagramUrls(text)));
  }
  function cleanNotes(text) { return cleanNoteUrls(normalizeBareUsernames(text)); }
  function parseUrls(text, skipInvalid) {
    const urls = [];
    const source = normalizeBareUsernames(String(text))
      .replace(/(^|[\s(])((?:www\.)?instagram\.com\/)/gi, '$1https://$2')
      .replace(/(^|[\s(])((?:stories\/[\w.]+(?:\/\d+)?|(?:reel|p|tv)\/[\w-]+)\/?)(?=$|[\s),;.!?])/gi, '$1https://www.instagram.com/$2');
    // Stop at the next scheme, including when share links have no separator.
    const parts = source.match(/https?:\/\/(?:(?!https?:\/\/)[^\s<>"“”])+/gi) || [];
    for (let part of parts) {
      try {
        part = part.replace(/[),;.!?\]}]+$/, '');
        const u = new URL(part);
        if (!/^(?:www\.)?instagram\.com$/i.test(u.hostname) || u.username || u.password || u.port)
          throw Error('Yalnızca instagram.com içerik bağlantıları kabul edilir.');
        u.hostname = 'www.instagram.com'; u.protocol = 'https:'; u.search = ''; u.hash = '';
        u.pathname = u.pathname.replace(/\/+$/, '');
        if (!/^\/(?:stories\/[\w.]+(?:\/\d+)?|(?:reel|p|tv)\/[\w-]+)$/.test(u.pathname) && collectionKind(u.href) !== 'profile')
          throw Error('Instagram içerik bağlantısı girin (Story, Reels, gönderi veya TV).');
        if (!urls.includes(u.href)) urls.push(u.href);
      } catch (e) {
        if (!skipInvalid) throw Error(e.message || 'Geçersiz bağlantı.');
      }
    }
    return urls;
  }
  function countNoteLinks(text) {
    return cleanNotes(text).split(/\r?\n/).reduce((count,line)=>count+parseUrls(line,true).length,0);
  }
  function numeric(value, label) {
    if (!/^\d+(?:\.\d+)?$/.test(String(value).trim()) || !Number.isFinite(Number(value)))
      throw Error(label + ' sıfır veya pozitif bir sayı olmalı.');
    return Number(value);
  }
  function validateCut(c, i) {
    const start = String(c.start).trim(), raw = String(c.end).trim().toLowerCase();
    const end = raw === 'son' ? 'inf' : raw;
    const signed = /^-?\d+(?:\.\d+)?$/;
    if (!signed.test(start) || !Number.isFinite(Number(start)) ||
        (end !== 'inf' && (!signed.test(end) || !Number.isFinite(Number(end)))))
      throw Error('Kesit ' + (i+1) + ': saniye veya bitiş için inf/Son girin.');
    const a = Number(start), b = end === 'inf' ? Infinity : Number(end);
    if (b !== Infinity && ((a < 0) !== (b < 0)))
      throw Error('Kesit ' + (i+1) + ': süre bilinmeden baştan ve sondan zamanlar karşılaştırılamaz; aynı zaman yönünü veya inf kullanın.');
    if (b <= a) throw Error('Kesit ' + (i+1) + ': bitiş başlangıçtan büyük olmalı.');
    return {start:String(a), end:b === Infinity ? 'inf' : String(b)};
  }
  // Runs once per extracted item, so every Story URL supplies its own account name.
  const storyMetadata = String.raw`webpage_url:https?://(?:www\.)?instagram\.com/stories/(?P<channel>[^/?#]+)(?:/|$)`;
  function template() {
    // One counter increment per downloaded section/item, without IDs or mode suffixes.
    return '%(channel,uploader,creator|unknown)s-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(autonumber)02d.%(ext)s';
  }
  function frameTimestamp(settings) {
    const selected=String(settings.frameTime || '0.5');
    const raw=selected==='custom' ? String(settings.frameCustomTime || '').trim() : '0.5';
    if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw)>1)
      throw Error('Frame zamanı 0 ile 1 saniye arasında olmalı.');
    return String(Number(raw));
  }
  function buildFrameCommand(settings, urls, items, min, max, req, cookies) {
    const target=frameTimestamp(settings);
    // Keep every improving candidate, then take the last one: the global nearest frame.
    // Selection, timestamp normalization and reverse leave source pixels untouched.
    const filter="setpts=PTS-STARTPTS,select='isnan(prev_selected_t)+lt(abs(t-"+target+"),abs(prev_selected_t-"+target+"))',reverse,select='eq(n,0)'";
    const lines=[
      "#!/usr/bin/env bash",
      "set -u",
      'YTDLP=('+shellPath('$HOME/yt-dlp-story-test/bin/yt-dlp')+')',
      "COMMON=(--ignore-config --no-playlist)",
      cookies ? 'COOKIES=(--cookies '+cookies+')' : 'COOKIES=()',
      items ? 'SELECT=(--playlist-items '+quote(items)+')' : 'SELECT=()',
      'SLEEP=(--sleep-requests '+req+' --sleep-interval '+min+' --max-sleep-interval '+max+')',
      'OUT='+shellPath('$HOME/storage/shared/Download/Apps/YT-DLP/Frame'),
      'FILTER='+quote(filter),
      'URLS=('+urls.map(quote).join(' ')+')',
      "command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1 || { printf '%s\\n' 'FFmpeg bulunamadı. Termux: pkg install ffmpeg' >&2; exit 127; }",
      "mkdir -p -- \"$OUT\" || exit 1",
      "PRIVATE_BASE=${PREFIX:-$HOME/.cache}/tmp",
      "if ! mkdir -p -- \"$PRIVATE_BASE\" 2>/dev/null || [[ ! -w \"$PRIVATE_BASE\" ]]; then",
      "  PRIVATE_BASE=\"$HOME/.cache/yt-dlp-frame\"",
      "  mkdir -p -- \"$PRIVATE_BASE\" || exit 1",
      "fi",
      "RUN_TMP=$(mktemp -d \"$PRIVATE_BASE/ytdlp-frame.XXXXXX\") || exit 1",
      "PUBLISH_TMP=\"\"",
      "cleanup() {",
      "  [[ -z \"$PUBLISH_TMP\" ]] || rm -rf -- \"$PUBLISH_TMP\"",
      "  rm -rf -- \"$RUN_TMP\"",
      "}",
      "trap cleanup EXIT",
      "trap 'exit 130' HUP INT TERM",
      "video_dimensions() {",
      "  local SIZE",
      "  SIZE=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of default=noprint_wrappers=1:nokey=1 \"$1\" 2>/dev/null) || return 1",
      "  SIZE=${SIZE//$'\\n'/x}",
      "  [[ \"$SIZE\" =~ ^[1-9][0-9]*x[1-9][0-9]*$ ]] || return 1",
      "  printf '%s\\n' \"$SIZE\"",
      "}",
      "valid_jpg() {",
      "  [[ -s \"$JPG\" ]] || return 1",
      "  ffmpeg -hide_banner -loglevel error -nostdin -y -xerror -i \"$JPG\" -frames:v 1 -f null - >/dev/null 2>&1 || return 1",
      "  DIMENSIONS=$(video_dimensions \"$JPG\") || return 1",
      "  [[ \"$DIMENSIONS\" == \"$SOURCE_DIMENSIONS\" ]]",
      "}",
      "SUCCESS=0",
      "FAILURES=0",
      "ERRORS=()",
      "FIRST_URL=1",
      "for URL in \"${URLS[@]}\"; do",
      '  if [[ $FIRST_URL -eq 0 ]]; then sleep '+min+'; fi',
      "  FIRST_URL=0",
      "  ITEM_TMP=$(mktemp -d \"$RUN_TMP/item.XXXXXX\") || { FAILURES=$((FAILURES+1)); ERRORS+=(\"$URL — geçici klasör oluşturulamadı\"); continue; }",
      "  META_ARGS=()",
      '  if [[ "$URL" =~ ^https://www\\.instagram\\.com/stories/([^/?#]+) ]]; then META_ARGS=(--parse-metadata '+quote(storyMetadata)+'); fi',
      '  "${YTDLP[@]}" "${COMMON[@]}" "${COOKIES[@]}" "${SLEEP[@]}" "${SELECT[@]}" "${META_ARGS[@]}" --no-overwrites -f "bv" --download-sections "*0-1" -P "$ITEM_TMP" -o '+quote(template())+' -- "$URL"',
      "  if [[ $? -ne 0 ]]; then",
      "    FAILURES=$((FAILURES+1)); ERRORS+=(\"$URL — indirme başarısız\")",
      "    rm -rf -- \"$ITEM_TMP\"; continue",
      "  fi",
      "  SAVED=0",
      "  REASON='video bulunamadı'",
      "  for VIDEO in \"$ITEM_TMP\"/*; do",
      "    [[ -f \"$VIDEO\" ]] || continue",
      "    case \"$VIDEO\" in *.part|*.ytdl|*.jpg|*.json) continue;; esac",
      "    REASON='kaynak çözünürlüğü okunamadı'",
      "    SOURCE_DIMENSIONS=$(video_dimensions \"$VIDEO\") || continue",
      "    [[ \"$SOURCE_DIMENSIONS\" =~ ^[1-9][0-9]*x[1-9][0-9]*$ ]] || continue",
      "    JPG=\"$ITEM_TMP/frame.jpg\"",
      "    REASON='JPG oluşturulamadı veya doğrulanamadı'",
      "    if ! ffmpeg -hide_banner -loglevel error -nostdin -y -i \"$VIDEO\" -map 0:v:0 -vf \"$FILTER\" -frames:v 1 -q:v 1 -pix_fmt yuvj444p \"$JPG\" || ! valid_jpg; then",
      "      rm -f -- \"$JPG\"",
      "      ffmpeg -hide_banner -loglevel error -nostdin -y -i \"$VIDEO\" -map 0:v:0 -frames:v 1 -q:v 1 -pix_fmt yuvj444p \"$JPG\" || continue",
      "      valid_jpg || continue",
      "    fi",
      "    BASE=${VIDEO##*/}; BASE=${BASE%.*}; BASE=${BASE%-*}",
      "    REASON='JPG hedef klasöre aktarılamadı'",
      "    PUBLISH_TMP=$(mktemp -d \"$OUT/.frame-publish.XXXXXX\") || continue",
      "    STAGED=\"$PUBLISH_TMP/frame.jpg\"",
      "    if cp -- \"$JPG\" \"$STAGED\" && cmp -s -- \"$JPG\" \"$STAGED\"; then",
      "      SEQUENCE=1",
      "      while :; do",
      "        SUFFIX=$(printf '%02d' \"$SEQUENCE\"); TARGET=\"$OUT/$BASE-$SUFFIX.jpg\"",
      "        if [[ -e \"$TARGET\" || -L \"$TARGET\" ]]; then SEQUENCE=$((SEQUENCE+1)); continue; fi",
      "        mv -nT -- \"$STAGED\" \"$TARGET\" 2>/dev/null || break",
      "        if [[ ! -e \"$STAGED\" ]]; then SAVED=1; SUCCESS=$((SUCCESS+1)); break; fi",
      "        [[ -e \"$TARGET\" || -L \"$TARGET\" ]] || break",
      "        SEQUENCE=$((SEQUENCE+1))",
      "      done",
      "    fi",
      "    rm -rf -- \"$PUBLISH_TMP\"; PUBLISH_TMP=\"\"",
      "    [[ $SAVED -eq 0 ]] || break",
      "  done",
      "  if [[ $SAVED -eq 0 ]]; then FAILURES=$((FAILURES+1)); ERRORS+=(\"$URL — $REASON\"); fi",
      "  rm -rf -- \"$ITEM_TMP\"",
      "done",
      "cleanup",
      "trap - EXIT HUP INT TERM",
      "printf 'Başarılı JPG: %d | Başarısız JPG: %d\\n' \"$SUCCESS\" \"$FAILURES\"",
      "if [[ ${#ERRORS[@]} -gt 0 ]]; then printf '%s\\n' \"${ERRORS[@]}\" >&2; fi",
      "[[ $FAILURES -eq 0 ]]"
    ];
    // A single, isolated Bash invocation also completes cleanup when pasted into Termux.
    return "bash -c '"+lines.join('\n').replace(/'/g,"'\\''")+"'";
  }
  function removeUrl(text, target) {
    return String(text).replace(/(?:https?:\/\/|(?:www\.)?instagram\.com\/)(?:(?!https?:\/\/)[^\s<>"“”])+/gi, part=>{
      try { return parseUrls(part).includes(target) ? '' : part; } catch(e) { return part; }
    }).trim();
  }
  function build(input) {
    const s = {...defaults, ...input.settings};
    delete s.audioFormat;
    if (!['normal','experimental'].includes(s.engine) || !['av','video','audio','still','frame'].includes(s.mode)) throw Error('Geçersiz motor veya biçim.');
    const urls = parseUrls(input.links);
    if (!urls.length) throw Error('En az bir Instagram içerik bağlantısı girin.');
    const items = urls.some(collectionKind) ? selectionSpec(input.selection) : null;
    const min = numeric(s.min, 'Sleep min'), max = numeric(s.max, 'Sleep max'), req = numeric(s.requests, 'Sleep requests');
    if (max < min) throw Error('Sleep max, minimumdan küçük olamaz.');
    shellPath(s.folder);
    const outputSubdir = s.mode === 'audio' ? 'Audio' : s.mode === 'still' ? 'SClip' : 'Video';
    const folder = s.mode==='frame' ? null : shellPath(s.folder.trim().replace(/\/+$/, '') + '/' + outputSubdir);
    const cookies = s.cookies.trim() ? shellPath(s.cookies) : null;
    const cuts = ['av','video'].includes(s.mode) ? (input.cuts || []).map(validateCut) :
      s.mode === 'still' ? [{start:'0',end:'1'}] : [];
    if(s.mode==='frame') return {command:buildFrameCommand(s,urls,items,min,max,req,cookies),urls,settings:s,cuts:[],selection:input.selection||{},commandCount:1};
    const args = [s.engine === 'normal' ? 'yt-dlp' : shellPath('$HOME/yt-dlp-story-test/bin/yt-dlp'), '--ignore-config', '--no-playlist'];
    if (items) args.push('--playlist-items ' + quote(items));
    if (cookies) args.push('--cookies ' + cookies);
    args.push('--sleep-requests ' + req, '--sleep-interval ' + min, '--max-sleep-interval ' + max,
      s.overwrite ? '--no-overwrites' : '--force-overwrites');
    if (s.mode === 'audio') {
      args.push('-f ' + quote('ba/b'), '-x', '--audio-format best');
      if (s.thumb) args.push('--embed-thumbnail', '--convert-thumbnails jpg');
    } else if (s.mode === 'still' || s.mode === 'video') args.push('-f ' + quote('bv'));
    else args.push('-f ' + quote('bv+ba/b'));
    for (const cut of cuts) args.push('--download-sections ' + quote('*' + cut.start + '-' + cut.end));
    if (urls.some(url=>/^https:\/\/www\.instagram\.com\/stories\//.test(url))) args.push('--parse-metadata ' + quote(storyMetadata));
    args.push('-P ' + folder,
      '-o ' + quote(template(s,cuts.length>0)), '--', ...urls.map(quote));
    return {command:args.join(' \\\n  '), urls, settings:s,
      cuts:['av','video'].includes(s.mode) ? cuts : [], selection:input.selection || {}, commandCount:1};
  }
  return {defaults, normalizeSettings, quote, shellPath, collectionKind, selectionSpec, normalizeBareUsernames, cleanNoteUrls, cleanNotes, countNoteLinks, parseUrls, removeUrl, validateCut, template, storyMetadata, build};
});
