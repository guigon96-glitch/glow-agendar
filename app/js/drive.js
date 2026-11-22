'use strict';
/* ===== Cópia das fotos no Google Drive da profissional (pasta "Glow Studio - Fotos") =====
   Escopo drive.file: o app só enxerga o que ele mesmo criou no Drive. As fotos vão como JPEG comum para ela abrir no Drive;
   o backup criptografado da nuvem continua igual. Estado por aparelho em S.ext.drive. */
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file', DRIVE_FOLDER = 'Glow Studio - Fotos';
let driveTok = '', driveTokAt = 0, driveBusy = false;
const DV = () => S.ext.drive || (S.ext.drive = { on: false, done: {}, folder: '', last: '', err: '' });

function gisLoad(cb) {
  if (window.google && google.accounts && google.accounts.oauth2) { if (cb) cb(); return; }
  let sc = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
  if (!sc) { sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; document.head.appendChild(sc); }
  if (cb) sc.addEventListener('load', cb);
}
function driveToken(interactive) {
  if (driveTok && Date.now() - driveTokAt < 50 * 60000) return Promise.resolve(driveTok);
  return new Promise((res, rej) => {
    const ok = (t) => { driveTok = t; driveTokAt = Date.now(); res(t); };
    if (window.Native && Native.driveToken) { // Android: conta do aparelho, renova sozinho
      window.onDriveToken = (t, err) => (t ? ok(t) : rej(new Error(err || 'Sem acesso ao Google Drive')));
      Native.driveToken(!!interactive); return;
    }
    // shortcut: no navegador o token vale 1 h e só renova com um toque (janela do Google); a cópia automática no web dura enquanto ele vale
    if (!interactive) return rej(new Error('Toque em "Copiar agora" para reconectar o Google Drive'));
    gisLoad(() => google.accounts.oauth2.initTokenClient({
      client_id: GCONF.clientId, scope: DRIVE_SCOPE,
      callback: (r) => (r && r.access_token ? ok(r.access_token) : rej(new Error('Acesso ao Google Drive negado'))),
      error_callback: () => rej(new Error('Acesso ao Google Drive cancelado'))
    }).requestAccessToken());
  });
}
async function dapi(path, opt) {
  opt = opt || {};
  const r = await fetch('https://www.googleapis.com/' + path, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + driveTok }, opt.headers || {}) }));
  if (r.status === 401) { driveTok = ''; throw new Error('Reconecte o Google Drive'); }
  if (!r.ok) throw new Error(r.status === 403 ? 'Google Drive cheio ou sem permissão' : 'Google Drive respondeu ' + r.status);
  return r.json();
}
async function driveFolder() {
  const d = DV(); if (d.folder) return d.folder;
  const q = encodeURIComponent("name='" + DRIVE_FOLDER + "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const l = await dapi('drive/v3/files?fields=files(id)&q=' + q);
  d.folder = l.files && l.files[0] ? l.files[0].id : (await dapi('drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: DRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' }) })).id;
  return d.folder;
}
function drivePending() {
  const done = DV().done || {}, out = [];
  for (const s of S.sessions) for (const p of s.photos || []) if (!done[p.id]) out.push({ s, p });
  return out;
}
function drivePhotoName(s, p) {
  const c = client(s.clientId) || {}, sv = SERVICES[s.service];
  return [s.date, c.name || 'Cliente', sv && sv.name, p.stage, ANGLES[p.angle] || p.angle].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, '') + '.jpg';
}
async function driveUpload(name, folder, blob) {
  const b = 'glow' + uid(), meta = JSON.stringify({ name, parents: [folder] });
  const body = new Blob(['--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + b + '\r\nContent-Type: ' + (blob.type || 'image/jpeg') + '\r\n\r\n', blob, '\r\n--' + b + '--']);
  return (await dapi('upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body })).id;
}
async function driveSync(manual) {
  if (!S.ext) return; const d = DV(); if (!d.on || driveBusy || !navigator.onLine) return; driveBusy = true;
  try {
    const todo = drivePending(); if (!todo.length) { if (manual) toast('As fotos já estão no Google Drive'); return; }
    await driveToken(manual); const folder = await driveFolder(); d.done = d.done || {}; let n = 0;
    for (const { s, p } of todo) {
      const v = await DB.get('photos', p.id); if (!v) continue; // foto ainda não baixada neste aparelho: tenta depois
      d.done[p.id] = await driveUpload(drivePhotoName(s, p), folder, await (await fetch(v)).blob()); n++;
      if (n % 5 === 0) save(); // grava o progresso: se cair no meio, não reenvia o que já foi
      if (manual && n % 3 === 0) toast('Copiando fotos… ' + n + '/' + todo.length);
    }
    d.last = new Date().toISOString(); d.err = ''; save(); if (manual) toast(n + (n === 1 ? ' foto copiada' : ' fotos copiadas') + ' para o Google Drive');
  } catch (e) {
    if (/ 404$/.test(e.message)) d.folder = ''; // pasta apagada no Drive: recria na próxima
    if (d.err !== e.message) { d.err = e.message; save(); }
    if (manual) toast(e.message || 'Falha ao copiar para o Google Drive');
  } finally { driveBusy = false; if (manual && parts()[0] === 'ajustes') route({ keep: true }); }
}
function driveCard() {
  const d = DV(), pend = drivePending().length;
  if (typeof IS_WEB !== 'undefined' && IS_WEB) gisLoad(); // carrega antes do toque para a janela do Google não ser bloqueada
  return '<div class="card stack"><h2 class="h2">Fotos no Google Drive</h2><div class="muted sm">Uma cópia de cada foto de antes e depois vai para a pasta <b>' + DRIVE_FOLDER + '</b> no seu Google Drive, com a data, o nome da cliente e o procedimento. Usa o seu espaço do Google e você abre de qualquer lugar.</div>' +
    (d.on ? '<div class="muted sm">Ativo, copia sozinho as fotos novas. ' + (d.last ? 'Última cópia: ' + new Date(d.last).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + '. ' : '') + (pend ? pend + (pend === 1 ? ' foto na fila.' : ' fotos na fila.') : 'Tudo copiado.') + '</div>' +
      (d.err ? '<div class="sm" style="color:#B4533F">' + esc(d.err) + '</div>' : '') +
      '<div class="acts"><button class="btn" data-act="dv-now">' + ic('dl') + 'Copiar agora</button><button class="btn ghost sm" data-act="dv-off">Desativar</button></div>'
      : '<div class="acts"><button class="btn" data-act="dv-on">Conectar Google Drive</button></div>') + '</div>';
}
{ const _a = ajCloud; ajCloud = function (tab) { const h = _a(tab); return tab === 'nuv' && can('cloud') ? h + driveCard() : h; }; } // eslint-disable-line no-func-assign
Object.assign(ACTX, {
  async 'dv-on'() {
    if (!gate('cloud')) return;
    try { await driveToken(true); const d = DV(); d.on = true; d.err = ''; save(); route({ keep: true }); driveSync(true); } catch (e) { toast(e.message || 'Não foi possível conectar o Google Drive'); }
  },
  'dv-now'() { driveSync(true); },
  'dv-off'() { DV().on = false; save(); route({ keep: true }); }
});
setTimeout(() => driveSync(false), 9000);
setInterval(() => { if (!document.hidden) driveSync(false); }, 120000);
