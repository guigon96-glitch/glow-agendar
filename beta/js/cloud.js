'use strict';
/* ===== Nuvem: backup criptografado, restauração, agendamento online e pedidos ===== */
const CLOUD_API = 'https://jygogsopwktsrcklfzta.supabase.co/functions/v1/glow';
const AJ_CLOUD = [['nuv', 'Nuvem e agendamento online']];
/* ID de cliente OAuth (tipo "Web") do Google Cloud. Preencher para ativar o login Google. */
const GCONF = { clientId: '911318944648-o829kf5brfdq8mfs8n6almeihl1qeav1.apps.googleusercontent.com' };
const CL = () => S.ext.cloud;
const cloudLinked = () => !!(CL() && CL().auth);
const cloudOn = () => cloudLinked() && can('cloud');
let cloudDirty = false, catDirty = false, cloudBusy = false, lastTry = 0, lastCat = 0;

async function cloudApi(action, body) {
  const r = await fetch(CLOUD_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action }, body || {})) });
  return r.json();
}
/* ---------- criptografia (a chave nunca sai do aparelho) ---------- */
const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { const a = new Uint8Array(20); crypto.getRandomValues(a); const s = [...a].map((x) => CODE_ALPHA[x % 32]).join(''); return s.match(/.{4}/g).join('-'); };
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const _kc = {};
async function cKeys(code) {
  const n = normCode(code); if (_kc[n]) return _kc[n];
  if (!window.crypto || !crypto.subtle) throw new Error('Criptografia indisponível neste aparelho');
  const te = new TextEncoder(), auth = hex(await crypto.subtle.digest('SHA-256', te.encode('glow-auth:' + n)));
  const base = await crypto.subtle.importKey('raw', te.encode(n), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: te.encode('glow-enc-v1'), iterations: 120000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return (_kc[n] = { auth, key });
}
async function encStr(key, str) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(str))); const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return bytesToB64(out); }
async function decStr(key, b) { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12))); }

/* ---------- login Google (ponte nativa do Android) ---------- */
function googleSignIn() {
  return new Promise((res, rej) => {
    if (!GCONF.clientId) return rej(new Error('Login Google ainda não configurado neste aplicativo'));
    if (window.Native && Native.googleSignIn) { // aplicativo Android: ponte nativa
      const t = setTimeout(() => rej(new Error('Tempo esgotado')), 120000);
      window.onGoogleResult = (tok, err) => { clearTimeout(t); tok ? res(tok) : rej(new Error(err || 'Login cancelado')); };
      Native.googleSignIn(GCONF.clientId); return;
    }
    googleWeb(res, rej); // navegador (desktop, iPhone, iPad): botão oficial do Google
  });
}
function googleWeb(res, rej) {
  const done = (fn, v) => { closeModal(); fn(v); };
  openModal('<h2 class="h2">Entrar com o Google</h2><div class="muted">Use a conta Google que você quer ligar ao seu estúdio. Seus dados ficam guardados com criptografia na nuvem.</div><div id="gbtn" style="display:flex;justify-content:center;min-height:48px;margin:10px 0"></div><div class="muted sm" id="gmsg">Carregando o Google…</div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="g-cancel">Cancelar</button></div>');
  window.__gCancel = () => done(rej, new Error('Login cancelado'));
  const start = () => {
    try {
      google.accounts.id.initialize({ client_id: GCONF.clientId, callback: (r) => (r && r.credential ? done(res, r.credential) : done(rej, new Error('Login cancelado'))), use_fedcm_for_prompt: true });
      const b = document.getElementById('gbtn'); if (!b) return; google.accounts.id.renderButton(b, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'pt-BR', width: 280 });
      const m = document.getElementById('gmsg'); if (m) m.textContent = '';
    } catch (e) { done(rej, new Error('Não foi possível abrir o login do Google')); }
  };
  if (window.google && google.accounts && google.accounts.id) return start();
  const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = start;
  sc.onerror = () => done(rej, new Error('Sem conexão com o Google. Verifique a internet.')); document.head.appendChild(sc);
}
ACTX['g-cancel'] = () => { if (window.__gCancel) window.__gCancel(); };
const fmtCode = (c) => normCode(c).match(/.{4}/g).join('-');
async function googleFlow() {
  toast('Abrindo o Google…'); const idToken = await googleSignIn();
  if (cloudOn()) {
    const r = await cloudApi('google_link', { auth: CL().auth, idToken, code: CL().code }); if (!r.ok) throw new Error(r.error || 'Falha ao vincular');
    CL().google = r.email; await flush(); toast('Conta Google vinculada: ' + r.email); route({ keep: true }); return;
  }
  const r = await cloudApi('google_login', { idToken, name: S.settings.studio }); if (!r.ok) throw new Error(r.error || 'Falha no login');
  if (r.created) {
    const { auth } = await cKeys(r.code);
    S.ext.cloud = { auth, code: fmtCode(r.code), slug: r.slug, on: true, since: todayISO(), lastBackup: '', google: r.email }; S.settings.booking.slug = r.slug; save();
    toast('Conta criada: ' + r.email); await cloudBackup(true); route({ keep: true }); return;
  }
  if (!(await confirmBox('Conta encontrada', 'Encontramos os dados de ' + r.email + '. Restaurar neste aparelho? Os dados atuais daqui serão substituídos.', 'Restaurar'))) return;
  toast('Restaurando…'); const x = await cloudRestore(r.code);
  CL().google = r.email; CL().slug = r.slug; S.settings.booking.slug = r.slug; await flush();
  toast('Restaurado: ' + x.clients + ' clientes e ' + x.photos + ' fotos'); go('#/inicio'); route();
}
/* ---------- ativar, backup e restauração ---------- */
async function cloudActivate() {
  const code = newCode(), { auth } = await cKeys(code);
  for (let i = 0; i < 4; i++) {
    const slug = (slug_(S.settings.studio) || 'studio') + '-' + Math.random().toString(36).slice(2, 6);
    const r = await cloudApi('register', { auth, slug });
    if (r.ok) { S.ext.cloud = { auth, code, slug, on: true, since: todayISO(), lastBackup: '' }; S.settings.booking.slug = slug; save(); return code; }
    if (r.error !== 'já existe') throw new Error(r.error || 'Falha ao ativar');
  }
  throw new Error('Não foi possível criar o endereço do estúdio');
}
const slug_ = (t) => slug(t).toLowerCase().slice(0, 28);
async function cloudBackup(manual) {
  if (typeof syncEnabled === 'function' && syncEnabled()) return syncCycle({ manual: !!manual, prune: !!manual });
  if (!cloudOn() || cloudBusy) return; cloudBusy = true;
  try {
    const { key } = await cKeys(CL().code); await flush();
    const d = { app: 'lss', v: 2, at: new Date().toISOString(), clients: S.clients, sessions: S.sessions, settings: S.settings, ext: S.ext };
    const r = await cloudApi('put_backup', { auth: CL().auth, data: await encStr(key, JSON.stringify(d)) }); if (!r.ok) throw new Error(r.error || 'Falha no backup');
    const local = (await DB.all('photos')).map((x) => x[0]); const have = new Set((await cloudApi('list_photos', { auth: CL().auth })).ids || []);
    const todo = local.filter((id) => !have.has(id)); let n = 0;
    for (const id of todo) { const v = await DB.get('photos', id); if (!v) continue; const pr = await cloudApi('put_photo', { auth: CL().auth, id, data: await encStr(key, v) }); if (!pr.ok) throw new Error('Falha ao enviar fotos'); n++; if (manual && n % 3 === 0) toast('Enviando fotos… ' + n + '/' + todo.length); }
    if (have.size) await cloudApi('prune_photos', { auth: CL().auth, keep: local });
    CL().lastBackup = new Date().toISOString(); cloudDirty = false; await flush(); if (manual) toast('Backup na nuvem concluído'); if (parts()[0] === 'ajustes') route({ keep: true });
  } catch (e) { console.warn(e); if (manual) toast('Não foi possível fazer o backup: ' + (e.message || 'sem conexão')); } finally { cloudBusy = false; }
}
async function cloudRestore(code) {
  const { auth, key } = await cKeys(code);
  const r = await cloudApi('get_backup', { auth }); if (!r.ok || !r.data) throw new Error('Código não encontrado ou sem backup');
  let d; try { d = JSON.parse(await decStr(key, r.data)); } catch (e) { throw new Error('Código incorreto'); }
  for (const [k] of await DB.all('photos')) await DB.del('photos', k); PC.clear();
  S.clients = d.clients || []; S.sessions = d.sessions || []; S.settings = Object.assign(SETTINGS_DEFAULT(), d.settings || {}); S.ext = d.ext || null; ensureExt();
  S.ext.cloud = Object.assign({}, S.ext.cloud || {}, { auth, code: normCode(code).match(/.{4}/g).join('-'), on: true }); await flush();
  if (typeof syncAdopt === 'function') syncAdopt(d.meta, r.rev);
  const ids = (await cloudApi('list_photos', { auth })).ids || []; let n = 0;
  for (const id of ids) { const p = await cloudApi('get_photo', { auth, id }); if (p.ok && p.data) await DB.put('photos', id, await decStr(key, p.data)); n++; if (n % 4 === 0) toast('Baixando fotos… ' + n + '/' + ids.length); }
  return { clients: S.clients.length, photos: ids.length };
}
async function cloudDelete() { if (!cloudOn()) return; await cloudApi('delete_cloud', { auth: CL().auth }); S.ext.cloud = {}; S.settings.booking.on = false; save(); }

/* ---------- agendamento online: catálogo público e pedidos ---------- */
function buildCatalog() {
  const bk = S.settings.booking, adv = Number(bk.advance) || 60, t = todayISO(), busy = {};
  for (let i = 0; i <= adv; i++) { const d = addDays(t, i); if (!dayOpen(d)) continue; busy[d] = {}; activePros().forEach((p) => { const b = busyOf(d, p.id).map((x) => [x[0], x[1]]); if (b.length) busy[d][p.id] = b; }); }
  return { on: !!bk.on, studio: { name: S.settings.studio, owner: S.settings.owner, whats: S.settings.whats, theme: themeVars(S.settings.theme) }, hours: S.settings.hours, advance: adv, minHours: Number(bk.minHours) || 0, pros: activePros().map((p) => ({ id: p.id, name: p.name })), pix: pixCatalog(), services: activeServices().map((k) => ({ k, name: SERVICES[k].name, dur: SERVICES[k].dur, price: priceOf(k) })), busy };
}
async function cloudPublish(manual) {
  if (!cloudOn()) return; lastCat = Date.now();
  try { const r = await cloudApi('set_catalog', { auth: CL().auth, catalog: buildCatalog() }); if (r.ok) catDirty = false; if (manual) toast(r.ok ? 'Horários publicados' : 'Falha ao publicar'); } catch (e) { if (manual) toast('Sem conexão'); }
}
async function cloudPull(manual) {
  if (!cloudOn() || !S.settings.booking.on) return;
  try {
    const r = await cloudApi('pull_bookings', { auth: CL().auth }); if (!r.ok) return;
    const ids = new Set(r.bookings.map((b) => b.id)); let added = 0;
    S.ext.bookings = S.ext.bookings.filter((b) => b.demo || ids.has(b.id));
    let upd = false; for (const b of r.bookings) { const x = S.ext.bookings.find((y) => y.id === b.id); if (x && b.pix_amount && b.pix_claimed && x.pix && !x.pix.claimed) { x.pix.claimed = true; upd = true; } }
    if (upd) { save(); toast('Uma cliente avisou que pagou o sinal'); if (['agenda', 'inicio', ''].includes(parts()[0])) route({ keep: true }); }
    for (const b of r.bookings) { if (S.ext.bookings.some((x) => x.id === b.id)) continue; S.ext.bookings.push({ id: b.id, status: 'pendente', name: b.name, phone: b.phone, service: b.service, proId: b.pro_id, date: b.date, time: b.time, dur: b.dur, note: b.note, created: String(b.created_at).slice(0, 10), pix: b.pix_amount ? { amount: Number(b.pix_amount), claimed: !!b.pix_claimed, disc: Number(b.pix_disc) || 0 } : null }); added++; }
    if (added) { save(); toast(added + (added === 1 ? ' novo pedido de agendamento' : ' novos pedidos de agendamento')); if (S.settings.booking.auto) for (const b of S.ext.bookings.filter((x) => x.status === 'pendente' && !x.demo)) await acceptBooking(b.id, true); if (['agenda', 'inicio', ''].includes(parts()[0])) route({ keep: true }); }
    else if (manual && !(r.cancels || []).length) toast('Nenhum pedido novo');
    pullExtras(r);
  } catch (e) { if (manual) toast('Sem conexão'); }
}
async function acceptBooking(id, auto) {
  const b = S.ext.bookings.find((x) => x.id === id); if (!b || !SERVICES[b.service]) return;
  const ph = digits(b.phone).slice(-9); let c = S.clients.find((x) => ph && digits(x.phone).slice(-9) === ph);
  if (!c) { c = Object.assign(blankClient(), { id: 'bc' + (ph || uid()), name: b.name, phone: b.phone, origin: 'Outro', notes: 'Agendou pelo link online.' }); c.termo.aceite = false; S.clients.push(c); }
  const dur = b.dur || SERVICES[b.service].dur;
  if (!auto && b.pix && b.pix.amount && !b.depositOk && !(await confirmBox('Sinal ainda não confirmado', 'Você ainda não marcou o recebimento do sinal de ' + fmtBRL(b.pix.amount) + '. Aceitar mesmo assim?', 'Aceitar'))) return;
  if (!auto && hasConflict(b.date, b.time, dur, b.proId || defaultProId()) && !(await confirmBox('Conflito de horário', 'Este horário já está ocupado na agenda. Aceitar mesmo assim?', 'Aceitar'))) return;
  const s = newSession(c.id, { id: 'bs' + String(b.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 20), service: b.service, date: b.date, time: b.time, dur, proId: b.proId || defaultProId(), confirmed: true, notes: b.note || '', bookingId: b.demo ? '' : b.id }); if (b.pix && b.pix.amount) s.deposit = { value: b.pix.amount, ok: !!b.depositOk, method: 'Pix' }; if (b.pix && b.pix.disc && b.depositOk) s.discount = round2((Number(s.discount) || 0) + b.pix.disc);
  if (S.sessions.some((x) => x.id === s.id)) { S.ext.bookings = S.ext.bookings.filter((x) => x.id !== id); save(); route({ keep: true }); return; } S.sessions.push(s);
  S.ext.bookings = S.ext.bookings.filter((x) => x.id !== id); save();
  if (cloudOn() && !b.demo) cloudApi('resolve_booking', { auth: CL().auth, id, status: 'confirmado' }).catch(() => {}); catDirty = true;
  UI.agendaDate = s.date; toast('Agendamento confirmado');
  if (!auto && c.phone && (await confirmBox('Avisar a cliente?', 'Enviar a confirmação pelo WhatsApp para ' + c.name.split(' ')[0] + '.', 'Enviar'))) sendTo(c.phone, fillTpl('confirmacao', sessVars(s)), 'conf:' + s.id);
  route({ keep: true });
}
/* cancelamentos feitos pela cliente na página e avaliações esperando aprovação */
let pendingReviews = [];
function pullExtras(r) {
  pendingReviews = r.reviews || [];
  const cx = r.cancels || []; if (!cx.length) return;
  const names = [];
  for (const b of cx) {
    const s = S.sessions.find((x) => x.id === 'bs' + String(b.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 20));
    if (s && s.status === 'agendado') { releaseSession(s); names.push(b.name.split(' ')[0] + ' (' + fmtDate(b.date).slice(0, 5) + ' ' + b.time + ')'); }
  }
  cloudApi('ack_cancel', { auth: CL().auth, ids: cx.map((b) => b.id) }).catch(() => {});
  if (names.length) { save(); catDirty = true; toast('Cancelado pela cliente: ' + names.join(', ')); if (['agenda', 'inicio', ''].includes(parts()[0])) route({ keep: true }); }
}
// atendimento vindo do link cancelado aqui no app: a cliente vê "Cancelado" em Meus horários
function bookingCanceled(s) { if (s && s.bookingId && cloudOn()) cloudApi('resolve_booking', { auth: CL().auth, id: s.bookingId, status: 'cancelado' }).catch(() => {}); }
{ const _rel = releaseSession; releaseSession = function (s) { _rel(s); bookingCanceled(s); }; } // eslint-disable-line no-func-assign
function reviewCards() {
  if (!pendingReviews.length) return '';
  return '<div class="card stack" style="gap:6px"><h2 class="h3">Avaliações para aprovar</h2><div class="muted sm">Só aparecem na sua página de agendamento depois que você aprovar.</div>' + pendingReviews.map((v) => '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:200px"><div><span style="color:var(--gold)">' + '★'.repeat(v.stars) + '</span><span style="color:var(--line2)">' + '★'.repeat(5 - v.stars) + '</span> <b>' + esc(v.name) + '</b>' + (v.service ? ' <span class="muted sm">· ' + esc(v.service) + '</span>' : '') + '</div>' + (v.text ? '<div class="sm">“' + esc(v.text) + '”</div>' : '') + '</div><button class="btn ghost sm" data-act="rv-hide" data-id="' + v.id + '">Não mostrar</button><button class="btn sm" data-act="rv-ok" data-id="' + v.id + '">Aprovar</button></div>').join('') + '</div>';
}
async function resolveReview(id, status) {
  try { const r = await cloudApi('resolve_review', { auth: CL().auth, id, status }); if (!r.ok) throw 0; pendingReviews = pendingReviews.filter((v) => v.id !== id); toast(status === 'aprovada' ? 'Avaliação publicada na sua página' : 'Avaliação ocultada'); route({ keep: true }); } catch (e) { toast('Sem conexão'); }
}
function bookingCards() {
  const l = S.ext.bookings.filter((b) => b.status === 'pendente' && SERVICES[b.service]); if (!l.length) return reviewCards();
  return '<div class="card stack" style="gap:6px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 class="h3">Pedidos de agendamento online</h2>' + (cloudOn() ? '<button class="btn ghost sm" data-act="bk-refresh">Atualizar</button>' : '') + '</div>' + l.map((b) => { const p = pro(b.proId); return '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:200px"><div style="font-weight:500">' + esc(b.name) + '</div><div class="muted sm">' + esc(SERVICES[b.service].name) + ' · ' + DIAS[parseISO(b.date).getDay()].charAt(0) + DIAS[parseISO(b.date).getDay()].slice(1).toLowerCase() + ' ' + fmtDate(b.date).slice(0, 6) + ' às ' + b.time + (multiPro() && p ? ' · ' + esc(p.name.split(' ')[0]) : '') + '</div>' + (b.note ? '<div class="muted sm">“' + esc(b.note) + '”</div>' : '') + (b.pix && b.pix.amount ? '<div class="sm" style="margin-top:4px;color:' + (b.depositOk ? 'var(--sage-t)' : 'var(--rose-d)') + '">' + (b.depositOk ? '✓ Sinal de ' + fmtBRL(b.pix.amount) + ' recebido' : 'Pix de ' + fmtBRL(b.pix.amount) + (b.pix.claimed ? ' · a cliente avisou que pagou' : ' · aguardando pagamento')) + '</div>' : '') + '</div>' + (b.pix && b.pix.amount && !b.depositOk ? '<button class="btn ghost sm" data-act="bk-dep" data-id="' + b.id + '">Recebi o sinal</button>' : '') + '<button class="btn sm" data-act="bk-accept" data-id="' + b.id + '">Aceitar</button><button class="btn danger sm" data-act="bk-decline" data-id="' + b.id + '">Recusar</button></div>'; }).join('') + '</div>' + reviewCards();
}
Object.assign(ACTX, {
  'rv-ok'(el) { resolveReview(el.dataset.id, 'aprovada'); },
  'rv-hide'(el) { resolveReview(el.dataset.id, 'oculta'); },
  'bk-accept'(el) { acceptBooking(el.dataset.id); },
  async 'bk-decline'(el) {
    const b = S.ext.bookings.find((x) => x.id === el.dataset.id); if (!b || !(await confirmBox('Recusar pedido?', b.name + ' · ' + fmtDate(b.date) + ' ' + b.time + '. O horário volta a ficar livre no link.', 'Recusar'))) return;
    S.ext.bookings = S.ext.bookings.filter((x) => x.id !== b.id); save(); if (cloudOn() && !b.demo) cloudApi('resolve_booking', { auth: CL().auth, id: b.id, status: 'recusado' }).catch(() => {});
    if (b.phone && (await confirmBox('Avisar a cliente?', 'Abrir o WhatsApp para combinar outro horário com ' + b.name.split(' ')[0] + '.', 'Abrir WhatsApp'))) sendTo(b.phone, 'Oi, ' + b.name.split(' ')[0] + '! Recebi seu pedido de horário, mas não consigo nesse dia. Posso te sugerir outro horário? 💗', null);
    route({ keep: true });
  },
  'bk-refresh'() { cloudPull(true); },
  'bk-dep'(el) { const b = S.ext.bookings.find((x) => x.id === el.dataset.id); if (b) { b.depositOk = true; save(); toast('Sinal marcado como recebido'); route({ keep: true }); } },
  async 'cl-on'() {
    if (!gate('cloud')) return;
    try { toast('Ativando…'); const code = await cloudActivate(); showCode(code, true); await cloudBackup(true); } catch (e) { toast('Não foi possível ativar: ' + (e.message || 'sem conexão')); }
  },
  async 'cl-google'() { if (!gate('cloud')) return; try { await googleFlow(); } catch (e) { toast(e.message || 'Falha no login Google'); } },
  'cl-code'() { showCode(CL().code, false); },
  'cl-copy'(el) { const t = el.dataset.v; try { navigator.clipboard.writeText(t).then(() => toast('Copiado')); } catch (e) { toast('Copie manualmente'); } },
  'cl-now'() { toast('Fazendo backup…'); cloudBackup(true); },
  'cl-restore'() {
    openModal('<h2 class="h2">Restaurar da nuvem</h2><div class="muted">Digite o código de recuperação do estúdio. Os dados deste aparelho serão <b>substituídos</b> pelo backup.</div><input class="in" id="rs_code" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off" style="letter-spacing:.08em"><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Cancelar</button><button class="btn" data-act="cl-restore-ok">Restaurar</button></div>');
  },
  async 'cl-restore-ok'() {
    const code = $('#rs_code').value; if (normCode(code).length !== 20) { toast('O código tem 20 letras e números'); return; }
    closeModal(); toast('Restaurando…');
    try { const r = await cloudRestore(code); toast('Restaurado: ' + r.clients + ' clientes e ' + r.photos + ' fotos'); go('#/inicio'); route(); } catch (e) { toast(e.message || 'Falha ao restaurar'); }
  },
  async 'cl-del'() { if (!(await confirmBox('Apagar dados da nuvem?', 'O backup, as fotos e o link de agendamento serão removidos do servidor. Os dados deste aparelho continuam. Não dá para desfazer.', 'Apagar da nuvem'))) return; try { await cloudDelete(); toast('Dados da nuvem apagados'); route({ keep: true }); } catch (e) { toast('Sem conexão'); } },
  async 'bk-toggle'(el) {
    if (!can('booking')) { el.checked = false; upsell('booking'); return; }
    if (!cloudOn()) { toast('Ative a nuvem primeiro'); el.checked = false; return; }
    S.settings.booking.on = el.checked; save(); await cloudPublish(true); route({ keep: true });
  },
  'bk-publish'() { cloudPublish(true); },
  'bk-page'() { saveFileOut('index.html', 'text/html', btoa(unescape(encodeURIComponent(BOOK_PAGE_HTML)))); },
  'bk-share'() { const u = bookingUrl(); if (!u) { toast('Informe o endereço da página'); return; } openExternal('https://wa.me/?text=' + encodeURIComponent('Agende seu horário no ' + S.settings.studio + ': ' + u)); }
});
function showCode(code, first) {
  openModal('<h2 class="h2">' + (first ? 'Backup ativado' : 'Código de recuperação') + '</h2><div class="muted">' + (first ? 'Este é o seu código de recuperação. ' : '') + '<b>Anote e guarde em lugar seguro.</b> Ele é a única forma de recuperar seus dados em outro aparelho. Os dados são criptografados aqui no aparelho: nem a gente consegue ler, e <b>sem o código não há como recuperar</b>.</div><div style="font:600 24px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-align:center;background:var(--blush2);border-radius:14px;padding:18px 10px;word-break:break-all">' + esc(code) + '</div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="cl-copy" data-v="' + esc(code) + '">Copiar</button><button class="btn" data-act="modal-close">Anotei</button></div>');
}
function ajCloud(tab) {
  if (tab !== 'nuv') return '';
  if (!can('cloud')) return lockedCard('cloud', 'Nuvem e agendamento online') + (cloudLinked() ? '<div class="muted sm">Seus dados na nuvem continuam guardados. Ao voltar para um plano com nuvem, tudo volta a funcionar.</div>' : '');
  const c = CL() || {}, bk = S.settings.booking, on = cloudOn(), url = bookingUrl();
  const bkTxt = c.lastBackup ? 'Último backup: ' + new Date(c.lastBackup).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Ainda sem backup.';
  return '<div class="card stack"><h2 class="h2">Backup na nuvem</h2>' + (on ? '<div class="muted">Ativo. ' + bkTxt + ' Backup automático quando há internet.</div>' + syncLine() + (c.google ? '<div class="muted sm">Conta Google: <b>' + esc(c.google) + '</b>. Para recuperar em outro aparelho, entre com esta conta.</div>' : '<div class="muted sm">Vincule sua conta Google para recuperar os dados em qualquer aparelho sem precisar do código.</div>') + '<div class="acts"><button class="btn" data-act="cl-now">' + ic('dl') + 'Fazer backup agora</button>' + (c.google ? '' : '<button class="btn ghost" data-act="cl-google">Vincular conta Google</button>') + '<button class="btn ghost" data-act="cl-code">Ver código de recuperação</button></div>' : '<div class="muted">Guarde clientes, atendimentos e fotos com segurança. Entre com sua conta Google: se o aparelho quebrar ou for perdido, basta entrar de novo para recuperar tudo.</div><div class="acts"><button class="btn" data-act="cl-google">Entrar com Google</button><button class="btn ghost" data-act="cl-on">Ativar sem Google (código)</button></div>') +
    '<div class="acts"><button class="btn ghost sm" data-act="cl-restore">Restaurar com código</button>' + (on ? '<button class="btn danger sm" data-act="cl-del">Apagar dados da nuvem</button>' : '') + '</div></div>' +
    '<div class="card stack"><h2 class="h2">Agendamento online</h2><div class="muted sm">As clientes escolhem procedimento, dia e horário livre num link. O pedido chega na sua agenda para você aceitar ou recusar.</div><label class="ck"><input type="checkbox" data-act="bk-toggle"' + (bk.on ? ' checked' : '') + '>Link de agendamento ativo</label>' +
    '<div><label class="lb" for="bk_url">Endereço onde a página foi publicada</label><input class="in" id="bk_url" data-o="st" data-f="booking.url" placeholder="https://seusite.com.br/agendar" value="' + esc(bk.url) + '"><div class="muted sm" style="margin-top:6px">Já vem preenchido com a página hospedada. Só altere se usar domínio próprio.</div></div>' +
    (url ? '<div style="background:var(--blush2);border-radius:14px;padding:12px 14px;word-break:break-all;font-size:14px">' + esc(url) + '</div><div class="acts"><button class="btn ghost sm" data-act="cl-copy" data-v="' + esc(url) + '">Copiar link</button><button class="btn wa sm" data-act="bk-share">' + ic('chat') + 'Enviar por WhatsApp</button></div>' : '') +
    (url ? bkLinkTools(url) : '') +
    '<div class="grid2"><div><label class="lb" for="bk_adv">Aceitar pedidos até (dias)</label><input class="in" id="bk_adv" type="number" min="7" max="180" data-o="st" data-f="booking.advance" data-num="1" value="' + (bk.advance || 60) + '"></div><div><label class="lb" for="bk_min">Antecedência mínima (horas)</label><input class="in" id="bk_min" type="number" min="0" max="72" data-o="st" data-f="booking.minHours" data-num="1" value="' + (bk.minHours || 0) + '"></div></div><label class="ck"><input type="checkbox" data-o="st" data-f="booking.auto"' + (bk.auto ? ' checked' : '') + '>Aceitar automaticamente (sem eu precisar confirmar)</label><div><label class="lb" for="bk_rev">Link para avaliações (opcional)</label><input class="in" id="bk_rev" data-o="st" data-f="booking.review" placeholder="Link do Google ou Instagram" value="' + esc(bk.review) + '"></div>' +
    '<div class="acts"><button class="btn ghost sm" data-act="bk-page">' + ic('dl') + 'Baixar página de agendamento</button>' + (on ? '<button class="btn ghost sm" data-act="bk-publish">Publicar horários agora</button><button class="btn ghost sm" data-act="bk-refresh">Buscar pedidos</button>' : '') + '</div></div>';
}

/* painel do link: horários que a cliente vê, atalhos e QR */
function bkHoursTxt() {
  const h = S.settings.hours || {}, ds = (h.days || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DIAS[d].charAt(0) + DIAS[d].slice(1).toLowerCase()).join(', ');
  return (ds || 'nenhum dia') + ' · ' + (h.open || '?') + ' às ' + (h.close || '?') + (h.lunchFrom && h.lunchTo ? ' (almoço ' + h.lunchFrom + '–' + h.lunchTo + ')' : '');
}
function bkLinkTools(url) {
  const nb = S.ext.blocks.filter((b) => b.date >= todayISO()).length;
  return '<div class="card" style="background:var(--blush2);box-shadow:none"><div class="stack" style="gap:8px"><b>Horários que a cliente vê no link</b><div class="muted sm">' + esc(bkHoursTxt()) + '<br>' + (nb ? nb + ' bloqueio(s) futuro(s) já escondidos do link.' : 'Nenhum bloqueio futuro.') + ' Horários já agendados somem sozinhos.</div>' +
    '<div class="acts"><button class="btn ghost sm" data-act="bk-hours">Ajustar dias e horários</button><button class="btn ghost sm" data-act="blk-new">Bloquear um horário ou dia</button></div>' +
    '<div class="acts"><button class="btn ghost sm" data-act="bk-qr">Ver QR code</button><button class="btn ghost sm" data-act="bk-insta">Texto para o Instagram</button></div></div></div>';
}
Object.assign(ACTX, {
  'bk-hours'() { UI.ajTab = 'hor'; location.hash = '#/ajustes'; route(); },
  'bk-qr'() { const u = bookingUrl(); if (!u) return; openModal('<h2 class="h2">QR code do seu link</h2><div class="muted sm">Imprima ou mostre na tela: a cliente aponta a câmera e já escolhe o horário.</div><div style="display:flex;justify-content:center;padding:12px;background:#fff;border-radius:14px">' + PixCore.qrSvg(u, 240) + '</div><div class="acts"><button class="btn ghost" data-act="modal-close">Fechar</button></div>'); },
  'bk-insta'() { const u = bookingUrl(); if (!u) return; const t = '✨ ' + S.settings.studio + '\nAgende seu horário online, 24h por dia:\n' + u; openModal('<h2 class="h2">Texto para o Instagram</h2><div class="muted sm">Cole na bio (só o link) ou numa legenda/story (texto todo).</div><div style="background:var(--blush2);border-radius:14px;padding:12px 14px;white-space:pre-wrap;word-break:break-all;font-size:14px">' + esc(t) + '</div><div class="acts"><button class="btn" data-act="cl-copy" data-v="' + esc(t) + '">Copiar texto</button><button class="btn ghost" data-act="cl-copy" data-v="' + esc(u) + '">Copiar só o link</button><button class="btn ghost" data-act="modal-close">Fechar</button></div>'); },
});
/* ---------- rotina em segundo plano ---------- */
(function () {
  const _flush = flush;
  flush = async function () { await _flush(); if (!cloudBusy) cloudDirty = true; catDirty = true; }; // eslint-disable-line no-func-assign
  async function tick() {
    if (!cloudOn() || document.hidden || !navigator.onLine) return;
    try {
      if (S.settings.booking.on) { if (catDirty && Date.now() - lastCat > 20000) await cloudPublish(false); await cloudPull(false); }
      if (cloudDirty && Date.now() - lastTry > 180000) { lastTry = Date.now(); await cloudBackup(false); }
    } catch (e) { /* tenta de novo no próximo ciclo */ }
  }
  setTimeout(tick, 6000); setInterval(tick, 90000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(tick, 800); });
})();
