/* Pure command construction. No DOM, network or platform dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Builder = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const defaults = Object.freeze({engine:'experimental', mode:'video',
    folder:'$HOME/storage/shared/Download/Apps/YT-DLPTemp',
    cookies:'$HOME/storage/shared/Download/Apps/YT-DLPTemp/cookies.txt',
    requests:'2', min:'6', max:'16', audioFormat:'m4a', thumb:true, overwrite:true});
  const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
  function shellPath(value) {
    const s = String(value).trim();
    if (/[\x00-\x1f\x7f]/.test(s) || !/^(?:\/|\$HOME(?:\/|$))/.test(s))
      throw Error('Yol / veya $HOME/ ile başlamalı; content:// adresi kullanılamaz.');
    return s.startsWith('$HOME') ? '"$HOME"' + quote(s.slice(5)) : quote(s);
  }
  function parseUrls(text) {
    const urls = [];
    // Stop at the next scheme, including when share links have no separator.
    const parts = String(text).match(/https?:\/\/(?:(?!https?:\/\/)[^\s<>"“”])+/gi) || [];
    for (let part of parts) {
      part = part.replace(/[),;.!?\]}]+$/, '');
      let u;
      try { u = new URL(part); } catch { throw Error('Geçersiz bağlantı: ' + part); }
      if (!u.hostname || u.username || u.password) throw Error('Geçersiz bağlantı: ' + part);
      if (/^(?:www\.|m\.)?instagram\.com$/i.test(u.hostname)) {
        u.hostname = 'www.instagram.com'; u.protocol = 'https:'; u.search = ''; u.hash = '';
        u.pathname = u.pathname.replace(/\/+$/, '');
        if (!/^\/(?:stories\/[\w.]+(?:\/\d+)?|(?:reel|reels|p|tv)\/[\w-]+)$/.test(u.pathname))
          throw Error('Instagram içerik bağlantısı girin (Story, Reels veya gönderi).');
      } else {
        // Other extractors may need query parameters (e.g. YouTube v=).
        for (const k of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|igsh)$/i.test(k)) u.searchParams.delete(k);
      }
      const normalized = u.href;
      if (!urls.includes(normalized)) urls.push(normalized);
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
  function template(url, settings, cut, index) {
    const u = new URL(url);
    const story = /^(?:www\.)?instagram\.com$/.test(u.hostname) && u.pathname.match(/^\/stories\/([\w.]+)/);
    const name = story ? story[1] : '%(channel,uploader,creator|unknown)s';
    const type = settings.mode === 'audio' ? settings.audioFormat : settings.mode;
    const suffix = cut ? '-cut' + (index+1) + '-' + cut.start + '-' + cut.end : '';
    // Stable fallbacks avoid NA and repeat-download names changing with current time.
    return name + '-%(upload_date,timestamp>%Y%m%d|undated)s-%(timestamp>%H%M|0000)s-%(id)s-' + type + suffix + '.%(ext)s';
  }
  function build(input) {
    const s = {...defaults, ...input.settings};
    if (!['normal','experimental'].includes(s.engine) || !['video','audio','still'].includes(s.mode) ||
        !['m4a','mp3'].includes(s.audioFormat)) throw Error('Geçersiz motor veya biçim.');
    const urls = parseUrls(input.links);
    if (!urls.length) throw Error('En az bir http/https içerik bağlantısı girin.');
    const min = numeric(s.min, 'Sleep min'), max = numeric(s.max, 'Sleep max'), req = numeric(s.requests, 'Sleep requests');
    if (max < min) throw Error('Sleep max, minimumdan küçük olamaz.');
    const folder = shellPath(s.folder), cookies = s.cookies.trim() ? shellPath(s.cookies) : null;
    const cuts = s.mode === 'video' ? (input.cuts || []).map(validateCut) :
      s.mode === 'still' ? [{start:'0',end:'1'}] : [];
    const commands = [];
    for (const url of urls) {
      for (const [index, cut] of (cuts.length ? cuts : [null]).entries()) {
        const args = [s.engine === 'normal' ? 'yt-dlp' : '"$HOME"/yt-dlp-story-test/bin/yt-dlp', '--ignore-config', '--no-playlist'];
        if (cookies) args.push('--cookies ' + cookies);
        args.push('--sleep-requests ' + req, '--sleep-interval ' + min, '--max-sleep-interval ' + max,
          s.overwrite ? '--no-overwrites' : '--force-overwrites');
        if (s.mode === 'audio') {
          args.push('-f ' + quote('ba/b'), '-x', '--audio-format ' + s.audioFormat);
          if (s.thumb) args.push('--embed-thumbnail', '--convert-thumbnails jpg');
        } else if (s.mode === 'still') args.push('-f ' + quote('bv'));
        else args.push('-f ' + quote('bv*+ba/b'), '--merge-output-format mp4');
        if (cut) args.push('--download-sections ' + quote('*' + cut.start + '-' + cut.end), '--force-keyframes-at-cuts');
        args.push('-P ' + folder, '-o ' + quote(template(url,s,cut,index)), '--', quote(url));
        commands.push(args.join(' \\\n  '));
      }
    }
    return {command: '(\n' + commands.join(';\n\n') + '\n)', urls, settings:s,
      cuts:s.mode === 'video' ? cuts : [], commandCount:commands.length};
  }
  return {defaults, quote, shellPath, parseUrls, validateCut, template, build};
});
