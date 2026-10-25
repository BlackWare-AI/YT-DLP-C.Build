/* Pure command construction. No DOM, network or platform dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Builder = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const defaults = Object.freeze({engine:'experimental', mode:'av',
    folder:'$HOME/storage/shared/Download/Apps/YT-DLPTemp',
    cookies:'$HOME/storage/shared/Download/Apps/YT-DLPTemp/cookies.txt',
    requests:'2', min:'6', max:'16', thumb:true, overwrite:true});
  function normalizeSettings(settings, schema) {
    const result = {...defaults, ...settings};
    if (schema !== 2 && result.mode === 'video') result.mode = 'av';
    delete result.audioFormat;
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
  function parseUrls(text, skipInvalid) {
    const urls = [];
    const source = String(text).replace(/(^|[\s(])((?:www\.)?instagram\.com\/)/gi, '$1https://$2');
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
        if (!/^\/(?:stories\/[\w.]+(?:\/\d+)?|(?:reel|p|tv)\/[\w-]+)$/.test(u.pathname))
          throw Error('Instagram içerik bağlantısı girin (Story, Reels, gönderi veya TV).');
        if (!urls.includes(u.href)) urls.push(u.href);
      } catch (e) {
        if (!skipInvalid) throw Error(e.message || 'Geçersiz bağlantı.');
      }
    }
    return urls;
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
  function template(settings, hasCuts) {
    const type = settings.mode === 'audio' ? 'audio-best' : settings.mode;
    // yt-dlp supplies actual section bounds per file. Never use one literal range
    // or autonumber alone for several sections of the same video.
    const suffix = hasCuts ? '-cut%(section_start)s-%(section_end|end)s' : '';
    return '%(channel,uploader,creator|unknown)s-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(id)s-' + type + suffix + '.%(ext)s';
  }
  function build(input) {
    const s = {...defaults, ...input.settings};
    delete s.audioFormat;
    if (!['normal','experimental'].includes(s.engine) || !['av','video','audio','still'].includes(s.mode)) throw Error('Geçersiz motor veya biçim.');
    const urls = parseUrls(input.links);
    if (!urls.length) throw Error('En az bir Instagram içerik bağlantısı girin.');
    const min = numeric(s.min, 'Sleep min'), max = numeric(s.max, 'Sleep max'), req = numeric(s.requests, 'Sleep requests');
    if (max < min) throw Error('Sleep max, minimumdan küçük olamaz.');
    shellPath(s.folder); // Validate the base before adding the mode's output subdirectory.
    const outputSubdir = s.mode === 'audio' ? 'Audio' : s.mode === 'still' ? 'SClip' : 'Video';
    const folder = shellPath(s.folder.trim().replace(/\/+$/, '') + '/' + outputSubdir);
    const cookies = s.cookies.trim() ? shellPath(s.cookies) : null;
    const cuts = ['av','video'].includes(s.mode) ? (input.cuts || []).map(validateCut) :
      s.mode === 'still' ? [{start:'0',end:'1'}] : [];
    const args = [s.engine === 'normal' ? 'yt-dlp' : shellPath('$HOME/yt-dlp-story-test/bin/yt-dlp'), '--ignore-config', '--no-playlist'];
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
      cuts:['av','video'].includes(s.mode) ? cuts : [], commandCount:1};
  }
  return {defaults, normalizeSettings, quote, shellPath, parseUrls, validateCut, template, storyMetadata, build};
});
