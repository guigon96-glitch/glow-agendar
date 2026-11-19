'use strict';
/* ===== Sincronização entre aparelhos (planos Pro e Studio) =====
   Cada registro (cliente, atendimento, produto…) tem um carimbo de data. Ao sincronizar, vale o mais recente;
   exclusões viajam como "lápides". Tudo continua criptografado no aparelho; o servidor só guarda o texto cifrado. */
const SYNC_KEY = 'sync';
let SY = { deviceId: '', rev: 0, shadow: {}, meta: {}, skew: 0, last: 0, lastPhotos: 0, photoDirty: false, err: '' };
const extColl = (n, kind) => ({ k: 'x.' + n, kind: kind || 'arr', get: () => S.ext[n], set: (v) => { S.ext[n] = v; } });
const COLLS = [
  { k: 'clients', kind: 'arr', get: () => S.clients, set: (v) => { S.clients = v; } },
  { k: 'sessions', kind: 'arr', get: () => S.sessions, set: (v) => { S.sessions = v; } },
  ...['pros', 'products', 'packages', 'cpk', 'expenses', 'sales', 'blocks', 'redeemed'].map((n) => extColl(n)),
  { k: 'settings', kind: 'map', get: () => S.settings, set: (v) => { S.settings = Object.assign(SETTINGS_DEFAULT(), v); } },
  extColl('log', 'map'), extColl('svc', 'map'), extColl('recipe', 'map')
];
function h53(str) { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); }
const stamp = () => Date.now() + (SY.skew || 0);
function snapOf(kind, val) {
  const o = {}; if (!val) return o;
  if (kind === 'arr') { if (!Array.isArray(val)) return o; for (const it of val) { const j = JSON.stringify(it), id = it && it.id != null ? String(it.id) : 'h' + h53(j); o[id] = { v: it, h: h53(j) }; } }
  else for (const k of Object.keys(val)) { const j = JSON.stringify(val[k]); o[k] = { v: val[k], h: h53(j == null ? 'u' : j) }; }
  return o;
}
const snap = (c) => snapOf(c.kind, c.get());
const syncEnabled = () => typeof cloudOn === 'function' && cloudOn() && can('sync');

async function syncInit() {
  const s = await DB.get('kv', SYNC_KEY); SY = Object.assign(SY, s || {});
  if (!SY.deviceId) { SY.deviceId = 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); await DB.put('kv', SYNC_KEY, SY); }
}
const syncSave = () => DB.put('kv', SYNC_KEY, SY);
/* compara o estado atual com a última foto e carimba o que mudou */
function syncDetect() {
  const now = stamp(); let changed = false;
  for (const c of COLLS) {
    let cur; try { cur = snap(c); } catch (e) { continue; }
    const old = SY.shadow[c.k], meta = SY.meta[c.k] || (SY.meta[c.k] = {}), nh = {};
    for (const id in cur) { nh[id] = cur[id].h; if (!old || old[id] !== cur[id].h) { meta[id] = { u: now }; changed = true; } }
    if (old) for (const id in old) if (!(id in cur)) { meta[id] = { u: now, d: 1 }; changed = true; }
    SY.shadow[c.k] = nh;
  }
  return changed;
}
/* alinha a foto do estado atual (depois de restaurar ou aplicar dados remotos) sem carimbar nada */
function syncAlign() { for (const c of COLLS) { const cur = snap(c), nh = {}; for (const id in cur) nh[id] = cur[id].h; SY.shadow[c.k] = nh; } }
function syncAdopt(meta, rev) { SY.meta = meta || {}; SY.rev = rev || 0; syncAlign(); syncSave(); }
function remoteVal(d, k) { const x = d.ext || {}; return k === 'clients' ? d.clients : k === 'sessions' ? d.sessions : k === 'settings' ? d.settings : x[k.slice(2)]; }
/* mistura os dados remotos nos locais. Devolve { changed, needPush } */
function applyRemote(d) {
  const rm = d.meta || {}; let changed = false, needPush = false;
  for (const c of COLLS) {
    const remote = snapOf(c.kind, remoteVal(d, c.k)), local = snap(c), lm = SY.meta[c.k] || (SY.meta[c.k] = {}), rmm = rm[c.k] || {};
    const out = new Map(Object.keys(local).map((id) => [id, local[id].v])), sh = SY.shadow[c.k] || (SY.shadow[c.k] = {});
    const ids = new Set([...Object.keys(remote), ...Object.keys(rmm)]);
    for (const id of ids) {
      const R = remote[id], rmeta = rmm[id], hasL = id in local, lmeta = lm[id];
      const ru = rmeta ? rmeta.u : 0, remoteDead = !!(rmeta && rmeta.d);
      if (!hasL && !lmeta) { // só o remoto conhece
        if (!remoteDead && R) { out.set(id, R.v); lm[id] = rmeta || { u: 0 }; sh[id] = R.h; changed = true; } else if (rmeta) lm[id] = rmeta;
        continue;
      }
      const lu = lmeta ? lmeta.u : 0;
      if (ru > lu) {
        if (remoteDead) { if (hasL) { out.delete(id); changed = true; } lm[id] = { u: ru, d: 1 }; delete sh[id]; }
        else if (R) { out.set(id, R.v); lm[id] = { u: ru }; sh[id] = R.h; changed = true; }
      } else if (lu > ru) needPush = true;
    }
    for (const id in local) if (!ids.has(id)) needPush = true; // local conhecido só aqui
    for (const id in lm) if (!ids.has(id) && !(id in local) && lm[id].d) needPush = true; // exclusão local ainda não enviada
    if (changed) c.set(c.kind === 'arr' ? [...out.values()] : Object.fromEntries(out));
  }
  if (changed) { ensureExt(); }
  return { changed, needPush };
}
function syncBlob() {
  const cut = stamp() - 60 * 864e5;
  for (const k in SY.meta) for (const id in SY.meta[k]) { const m = SY.meta[k][id]; if (m.d && m.u < cut) delete SY.meta[k][id]; }
  const ext = Object.assign({}, S.ext); delete ext.bookings;
  return { app: 'lss', v: 3, at: new Date().toISOString(), clients: S.clients, sessions: S.sessions, settings: S.settings, ext, meta: SY.meta };
}
const syncApi = (action, body) => cloudApi(action, Object.assign({ auth: CL().auth, deviceId: SY.deviceId, deviceName: 'Aparelho ' + SY.deviceId.slice(-4) }, body || {}));
function photoRefs() { const s = new Set(); S.sessions.forEach((x) => (x.photos || []).forEach((p) => s.add(p.id))); S.clients.forEach((c) => { if (c.signId) s.add(c.signId); }); (S.ext.cpk || []); return s; }
async function syncPhotos(key, prune) {
  const have = new Set((await cloudApi('list_photos', { auth: CL().auth })).ids || []), local = new Set((await DB.all('photos')).map((x) => x[0])), refs = photoRefs();
  for (const id of local) if (!have.has(id)) { const v = await DB.get('photos', id); if (v) { const r = await cloudApi('put_photo', { auth: CL().auth, id, data: await encStr(key, v) }); if (!r.ok) throw new Error('Falha ao enviar fotos'); have.add(id); } }
  let got = 0; for (const id of refs) if (!local.has(id) && have.has(id)) { const p = await cloudApi('get_photo', { auth: CL().auth, id }); if (p.ok && p.data) { await DB.put('photos', id, await decStr(key, p.data)); got++; } }
  if (prune) { const keep = [...new Set([...refs, ...local])]; await cloudApi('prune_photos', { auth: CL().auth, keep }); }
  SY.lastPhotos = Date.now(); SY.photoDirty = false; return got;
}
const missingPhotos = async () => { const local = new Set((await DB.all('photos')).map((x) => x[0])); return [...photoRefs()].filter((id) => !local.has(id)).length; };
let syncBusy = false, syncT = null, viewDirty = false;
function userBusy() { const a = document.activeElement; return !$('#modal').hidden || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && view.contains(a)) || ['atendimento', 'camera'].includes(parts()[0]); }
function refreshView() { if (!viewDirty) return; if (userBusy()) return; viewDirty = false; route({ keep: true }); }
async function syncCycle(opts) {
  opts = opts || {}; if (syncBusy || !syncEnabled() || !navigator.onLine) return false; syncBusy = true;
  try {
    syncDetect(); await syncSave();
    const { key } = await cKeys(CL().code); let remoteChanged = false;
    if (SY.photoDirty || opts.manual) await syncPhotos(key, false);
    for (let attempt = 0; attempt < 4; attempt++) {
      const g = await syncApi('sync_get'); if (!g.ok) { const e = new Error(g.error || 'Falha ao sincronizar'); e.code = g.code; throw e; }
      SY.skew = g.now - Date.now(); let need = !g.data;
      if (g.data) { let d; try { d = JSON.parse(await decStr(key, g.data)); } catch (e) { throw new Error('Não foi possível ler os dados da nuvem'); } const r = applyRemote(d); remoteChanged = remoteChanged || r.changed; need = r.needPush; if (r.changed) { syncAlign(); await flushRaw(); } }
      if (!need) { SY.rev = g.rev; break; }
      const p = await syncApi('sync_put', { baseRev: g.rev, data: await encStr(key, JSON.stringify(syncBlob())) });
      if (p.ok) { SY.rev = p.rev; break; }
      if (!p.conflict) { const e = new Error(p.error || 'Falha ao enviar'); e.code = p.code; throw e; }
      if (attempt === 3) throw new Error('Outro aparelho está salvando agora. Tente de novo.');
    }
    const got = await syncPhotos(key, !!opts.prune); if (got) remoteChanged = true;
    SY.last = Date.now(); SY.err = ''; CL().lastBackup = new Date().toISOString(); await syncSave(); await flushRaw();
    if (remoteChanged) { viewDirty = true; refreshView(); }
    if (opts.manual) toast(remoteChanged ? 'Sincronizado: dados novos de outro aparelho' : 'Sincronizado');
    if (parts()[0] === 'ajustes' && !userBusy()) route({ keep: true });
    return true;
  } catch (e) {
    console.warn(e); SY.err = e.message || 'sem conexão'; syncSave();
    if (e.code === 'plan') planRefresh();
    if (opts.manual || e.code === 'devices') toast(e.message || 'Não foi possível sincronizar');
    return false;
  } finally { syncBusy = false; }
}
let flushRaw = async () => { await DB.put('kv', 'clients', S.clients); await DB.put('kv', 'sessions', S.sessions); await DB.put('kv', 'settings', S.settings); await DB.put('kv', 'ext', S.ext); };
function syncSoon(ms) { if (!syncEnabled()) return; clearTimeout(syncT); syncT = setTimeout(() => syncCycle(), ms || 4000); }
async function syncPoll() {
  if (!syncEnabled() || document.hidden || !navigator.onLine || syncBusy) return;
  try {
    refreshView();
    const r = await syncApi('sync_rev'); if (!r.ok) { if (r.code === 'plan') planRefresh(); return; }
    if (r.rev !== SY.rev) await syncCycle();
    else if (SY.photoDirty || Date.now() - SY.lastPhotos > 60000 && (await missingPhotos())) { const { key } = await cKeys(CL().code); if (!syncBusy) { syncBusy = true; try { if (await syncPhotos(key, false)) { viewDirty = true; refreshView(); } } finally { syncBusy = false; } } }
  } catch (e) { /* tenta no próximo ciclo */ }
}
(function () {
  const _flush = flush;
  flush = async function () { await _flush(); if (syncEnabled()) { syncDetect(); await syncSave(); syncSoon(); } }; // eslint-disable-line no-func-assign
  const _add = Photo.add; Photo.add = async function (d) { SY.photoDirty = true; return _add.call(Photo, d); };
  setInterval(syncPoll, 20000); setTimeout(() => syncCycle(), 7000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => syncCycle(), 600); });
  window.addEventListener('online', () => setTimeout(() => syncCycle(), 800));
  /* apagar tudo neste aparelho não apaga nos outros: zera o controle e os dados voltam na próxima sincronização */
})();
ACTX.wipe = async function () { await ACT.wipe(); if (!S.clients.length && !S.sessions.length) { SY.shadow = {}; SY.meta = {}; SY.rev = 0; await syncSave(); } };
Object.assign(ACTX, {
  'sync-now'() { toast('Sincronizando…'); syncCycle({ manual: true }); },
  async 'dev-list'() {
    const r = await syncApi('devices_list'); if (!r.ok) { toast(r.error || 'Sem conexão'); return; }
    openModal('<h2 class="h2">Aparelhos conectados</h2><div class="muted sm">Seu plano permite ' + r.limit + (r.limit === 1 ? ' aparelho' : ' aparelhos') + '. Remova um aparelho que você não usa mais para liberar vaga.</div>' + r.devices.map((d) => '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #F1E7E1"><div style="flex:1"><div style="font-weight:500">' + esc(d.name || 'Aparelho') + (d.device_id === SY.deviceId ? ' <span class="tag">este aparelho</span>' : '') + '</div><div class="muted sm">Último acesso: ' + new Date(d.last_seen).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + '</div></div>' + (d.device_id === SY.deviceId ? '' : '<button class="btn danger sm" data-act="dev-del" data-id="' + esc(d.device_id) + '">Remover</button>') + '</div>').join('') + '<div class="acts" style="justify-content:flex-end"><button class="btn" data-act="modal-close">Fechar</button></div>');
  },
  async 'dev-del'(el) { await syncApi('device_remove', { deviceId: el.dataset.id }); closeModal(); toast('Aparelho removido'); ACTX['dev-list'](); }
});
function syncLine() {
  if (!cloudOn()) return '';
  if (!can('sync')) return '<div class="muted sm">Sincronização entre aparelhos: faz parte do plano Pro (2 aparelhos) e Studio (5 aparelhos).</div>';
  return '<div class="muted sm">Sincronização entre aparelhos: <b>ativa</b>' + (SY.last ? ' · última às ' + new Date(SY.last).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '') + (SY.err ? ' · <span style="color:#9A3A36">' + esc(SY.err) + '</span>' : '') + '. Para usar em outro aparelho, entre com a mesma conta Google ou restaure com o código.</div><div class="acts"><button class="btn ghost sm" data-act="sync-now">Sincronizar agora</button><button class="btn ghost sm" data-act="dev-list">Aparelhos conectados</button></div>';
}
