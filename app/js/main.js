'use strict';
/* ===== Roteador, eventos, câmera e integração com o Android ===== */
const $ = (s, r) => (r || document).querySelector(s);
const view = $('#view');
const hasNative = () => typeof window.Native !== 'undefined' && window.Native;
let camStream = null, sigInk = false, modalResolve = null;
const parts = () => (location.hash || '#/inicio').slice(2).split('?')[0].split('/');
const go = (h) => { location.hash = h; };
const setPath = (o, path, v) => { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) { if (t[k[i]] == null) t[k[i]] = {}; t = t[k[i]]; } t[k[k.length - 1]] = v; };
const curSession = () => sess(parts()[1]);

async function route(opt) {
  opt = opt || {}; stopCam(); applyTheme();
  const p = parts(); let r; const keep = opt.keep ? view.scrollTop : 0;
  const act = document.activeElement; const focusId = opt.keep && act && act.id && view.contains(act) ? act.id : null; const caret = focusId && act.selectionStart != null ? act.selectionStart : null;
  try {
    switch (p[0]) {
      case '': case 'inicio': r = await vInicio(); break;
      case 'agenda': r = await vAgenda(); break;
      case 'clientes': r = p[1] === 'novo' ? await vClienteForm(null) : p[1] && p[2] === 'editar' ? await vClienteForm(p[1]) : p[1] ? await vFicha(p[1]) : await vClientes(); break;
      case 'atendimento': r = await vAtendimento(p[1] || 'novo'); break;
      case 'camera': r = await vCamera(p[1], p[2], p[3]); break;
      case 'fotos': r = await vFotos(p[1]); break;
      case 'relatorios': r = await vRelatorios(); break;
      case 'relatorio': r = await vRelatorio(p[1]); break;
      case 'whatsapp': r = await vWhatsApp(p[1]); break;
      case 'ajustes': if (p[1]) UI.ajTab = p[1]; r = await vAjustes(); break;
      default: r = ROUTEX[p[0]] ? await ROUTEX[p[0]]() : await vInicio();
    }
  } catch (e) { console.error(e); r = { nav: null, html: '<div class="card"><h2 class="h2">Algo deu errado</h2><p class="muted">' + esc(e.message) + '</p><a class="btn" href="#/inicio">Voltar ao início</a></div>' }; }
  if (!/^(clientes)$/.test(p[0]) || p[1] !== 'novo' && p[2] !== 'editar') { if (UI.draft) UI.draft = null; UI.reSign = false; }
  const sh = shellHtml(r.nav); $('#side').innerHTML = sh.side; $('#tabbar').innerHTML = sh.tab;
  view.innerHTML = r.html; view.scrollTop = keep;
  if (focusId) { const f = document.getElementById(focusId); if (f) { f.focus(); if (caret != null && f.setSelectionRange) try { f.setSelectionRange(caret, caret); } catch (e) { /* tipo sem seleção */ } } }
  initSig(); initSlider();
  if (r.after) { try { await r.after(); } catch (e) { console.error(e); } }
  if (r.cam) { camStart(); camGhostApply(); }
}
window.addEventListener('hashchange', () => route());

/* ---------- modal / confirmação ---------- */
function saveAreas(a) { S.settings.areas = Object.keys(AREAS).filter((k) => a.includes(k)); S.settings.areasSet = true; if (S.settings.loyalty && !S.settings.loyalty.custom) S.settings.loyalty.rewards = rewardsFor(S.settings.areas); if (!activeServices().includes(UI.ajSvc)) UI.ajSvc = activeServices()[0]; if (UI.filter !== 'todas' && UI.filter !== 'ret' && !S.settings.areas.includes(UI.filter)) UI.filter = 'todas'; save(); }
function areaCards(a, mode) { return Object.keys(AREAS).map((k) => '<button class="cc" style="padding:16px 18px;gap:4px;align-items:flex-start;text-align:left;' + (a.includes(k) ? 'border:2px solid var(--rose);background:var(--blush)' : 'border:2px solid transparent') + '" data-act="area-toggle" data-v="' + k + '" data-mode="' + (mode || '') + '" aria-pressed="' + a.includes(k) + '"><span style="font-weight:500;font-size:17px">' + (a.includes(k) ? '✓ ' : '') + AREAS[k].name + '</span><span class="muted sm">' + AREAS[k].desc + '</span></button>').join(''); }
function openAreasSetup(keep) { const a = UI.areasDraft || (keep ? activeAreas() : Object.keys(AREAS)); UI.areasDraft = a; openModal('<h2 class="h2">Bem-vinda ao ' + esc(S.settings.studio) + '</h2><div class="muted">Quais áreas de beleza você atende? Os procedimentos, as fotos e os relatórios vão seguir a sua escolha. Você pode mudar depois em Ajustes.</div><div class="grid2" style="gap:10px">' + areaCards(a, 'modal') + '</div><div class="acts" style="justify-content:flex-end"><button class="btn" data-act="areas-ok">Continuar</button></div>'); }
function openModal(html) { const m = $('#modal'); m.innerHTML = '<div class="box" role="dialog" aria-modal="true">' + html + '</div>'; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
function confirmBox(title, msg, ok) {
  return new Promise((res) => { modalResolve = res; openModal('<h2 class="h2">' + esc(title) + '</h2><div class="muted">' + esc(msg) + '</div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-no">Cancelar</button><button class="btn" data-act="modal-yes">' + esc(ok || 'Continuar') + '</button></div>'); });
}
function openExternal(url) { if (hasNative()) location.href = url; else window.open(url, '_blank'); }
function downloadB64(name, mime, b64s) {
  const bin = atob(b64s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function saveFileOut(name, mime, b64s) {
  if (hasNative() && window.Native.saveFile) { const r = window.Native.saveFile(name, mime, b64s); toast(r === 'ok' ? 'Salvo na pasta Downloads: ' + name : 'Não foi possível salvar o arquivo'); } else { downloadB64(name, mime, b64s); toast('Arquivo baixado: ' + name); }
}
const careAll = (s) => { const care = careFor(s.service), cur = s.cuidados || care.slice(); return { care, cur, all: care.concat(cur.filter((x) => !care.includes(x))) }; };

/* ---------- câmera ---------- */
function stopCam() { if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; } }
function camMsg(msg) { const h = $('#cam_hint'); if (h) h.textContent = msg; }
async function camStart() {
  const v = $('#cam_v'); if (!v) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { v.hidden = true; camMsg('Câmera indisponível neste aparelho. Use a galeria.'); return; }
  try {
    stopCam();
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: UI.cam.facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
    v.srcObject = camStream; v.hidden = false; await v.play().catch(() => {});
    v.style.transform = UI.cam.facing === 'user' ? 'scaleX(-1)' : '';
  } catch (e) { v.hidden = true; camMsg('Não foi possível abrir a câmera (' + (e.name || 'erro') + '). Permita o acesso ou use a galeria.'); }
}
function camReview(dataUrl) {
  UI.cam.shot = dataUrl; const p = $('#cam_p'); p.src = dataUrl; p.hidden = false; const v = $('#cam_v'); if (v) v.hidden = true;
  $('#ctl_live').hidden = true; $('#ctl_rev').hidden = false; camMsg('');
}
function camLive() { UI.cam.shot = null; $('#cam_p').hidden = true; $('#ctl_live').hidden = false; $('#ctl_rev').hidden = true; camMsg(CAM_HINT[UI.cam.angle] || CAM_HINT.reg); camStart(); camGhostApply(); }

/* ---------- assinatura e comparador ---------- */
function initSig() {
  const cv = $('#sig'); if (!cv) return;
  const r = cv.getBoundingClientRect(); cv.width = Math.max(300, r.width) * 2; cv.height = Math.max(100, r.height) * 2;
  const g = cv.getContext('2d'); g.scale(2, 2); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'var(--ink)'; sigInk = false; let down = false;
  const pos = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  cv.onpointerdown = (e) => { down = true; cv.setPointerCapture(e.pointerId); const q = pos(e); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0] + 0.1, q[1]); g.stroke(); sigInk = true; };
  cv.onpointermove = (e) => { if (!down) return; const q = pos(e); g.lineTo(q[0], q[1]); g.stroke(); };
  cv.onpointerup = cv.onpointercancel = () => { down = false; };
}
function initSlider() {
  const r = $('#cmp_rng'); if (!r) return;
  r.addEventListener('input', () => { const p = +r.value; UI.cmpPos = p; $('#cmp_clip').style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)'; $('#cmp_bar').style.left = p + '%'; $('#cmp_grip').style.left = p + '%'; });
}

/* ---------- envio ---------- */
async function buildFiles(s) {
  const c = client(s.clientId) || { name: 'cliente' }; const files = [];
  await Photo.preload(sessPhotoIds([s]));
  if (s.wa.pdf) { const pages = await renderReport(s, s.rep); files.push({ name: pdfName(s), mime: 'application/pdf', b64: bytesToB64(buildPdf(pages)) }); }
  if (s.wa.collage) for (const a of anglesComplete(s)) { const cv = await renderCollage(s, a); files.push({ name: 'AntesDepois-' + slug(c.name) + '-' + a + '.jpg', mime: 'image/jpeg', b64: b64(cv, 0.9) }); }
  if (s.wa.fotos) (s.photos || []).forEach((p) => files.push({ name: 'Foto-' + p.stage + '-' + p.angle + '-' + slug(c.name) + '.jpg', mime: 'image/jpeg', b64: PC.get(p.id).split(',')[1] }));
  return files;
}
async function waSend(id) {
  const s = sess(id), c = client(s.clientId); const phone = waNumber(c.phone);
  if (!phone) { toast('Informe o WhatsApp da cliente'); const f = $('#w_p'); if (f) f.focus(); return; }
  const text = s.msg != null ? s.msg : messageText(s);
  toast('Preparando anexos…'); const files = await buildFiles(s);
  if (hasNative() && window.Native.shareWhatsApp) {
    const r = String(window.Native.shareWhatsApp(phone, text, JSON.stringify(files)));
    if (r.indexOf('error') === 0) { toast('Não foi possível abrir o WhatsApp'); return; }
  } else { files.forEach((f) => downloadB64(f.name, f.mime, f.b64)); openExternal('https://wa.me/' + phone + '?text=' + encodeURIComponent(text)); }
  s.sent = true; save(); toast(files.length ? 'Pronto! Confira os anexos e toque em enviar no WhatsApp' : 'Abrindo o WhatsApp…');
}

/* ---------- ações ---------- */
const ACT = {
  async sample() {
    if (S.clients.length || S.sessions.length) {
      if (!(await confirmBox('Carregar exemplo de apresentação?', 'Os clientes, atendimentos e fotos atuais deste aparelho serão substituídos por 5 clientes de exemplo, com fotos ilustrativas de antes e depois. Faça um backup antes se precisar dos dados.', 'Substituir'))) return;
      S.clients = []; S.sessions = []; S.ext = null; ensureExt(); for (const [k] of await DB.all('photos')) await DB.del('photos', k); PC.clear();
    }
    toast('Carregando exemplo…'); await loadSample(); await flush(); toast('Exemplo carregado: 5 clientes com fotos'); go('#/inicio'); route();
  },
  'modal-no'() { closeModal(); if (modalResolve) modalResolve(false); modalResolve = null; },
  'modal-yes'() { closeModal(); if (modalResolve) modalResolve(true); modalResolve = null; },
  'modal-close'() { closeModal(); },
  'open-session'(el) {
    const s = sess(el.dataset.id); if (!s) return;
    if (s.status === 'concluido') go('#/clientes/' + s.clientId); else { if (s.date === todayISO() && s.status === 'agendado') { s.status = 'andamento'; save(); } go('#/atendimento/' + s.id); }
  },
  'open-menu'() { const h = $('#drawerHandle'); if (h) h.click(); },
  'agenda-day'(el) { UI.agendaDate = el.dataset.v; route(); },
  'agenda-shift'(el) { UI.agendaDate = addDays(UI.agendaDate, +el.dataset.v); route(); },
  'new-appt'() {
    if (!S.clients.length) { toast('Cadastre uma cliente primeiro'); go('#/clientes/novo'); return; }
    openModal('<h2 class="h2">Novo agendamento</h2><div><label class="lb" for="ap_c">Cliente</label><select class="in" id="ap_c">' + S.clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select></div><div><label class="lb" for="ap_s">Procedimento</label><select class="in" id="ap_s">' + activeServices().map((k) => '<option value="' + k + '">' + SERVICES[k].name + '</option>').join('') + '</select></div><div class="grid2"><div><label class="lb" for="ap_d">Data</label><input class="in" id="ap_d" type="date" value="' + UI.agendaDate + '"></div><div><label class="lb" for="ap_t">Hora</label><input class="in" id="ap_t" type="time" value="09:00"></div></div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Cancelar</button><button class="btn" data-act="appt-save">Agendar</button></div>');
  },
  'appt-save'() {
    const svc = $('#ap_s').value; const s = newSession($('#ap_c').value, { service: svc, date: $('#ap_d').value || todayISO(), time: $('#ap_t').value || '09:00' });
    S.sessions.push(s); save(); closeModal(); UI.agendaDate = s.date; toast('Agendamento criado'); route();
  },
  filter(el) { UI.filter = el.dataset.v; route(); },
  'open-client'(el) { go('#/clientes/' + el.dataset.id); },
  async 'save-client'() {
    const d = UI.draft; if (!d) return;
    if (!d.name.trim()) { toast('Informe o nome da cliente'); const f = $('#f_name'); if (f) f.focus(); return; }
    d.name = d.name.trim(); const sg = $('#sig');
    if (sg && sigInk) { if (d.signId) await Photo.del(d.signId); d.signId = await Photo.add(sg.toDataURL('image/png')); }
    delete d.__for; const i = S.clients.findIndex((c) => c.id === d.id);
    if (i >= 0) S.clients[i] = d; else S.clients.push(d);
    save(); UI.draft = null; UI.reSign = false; toast('Cadastro salvo'); go('#/clientes/' + d.id);
  },
  resign() { UI.reSign = true; route({ keep: true }); },
  'sig-clear'() { sigInk = false; initSig(); },
  'ficha-tab'(el) { UI.fichaTab = el.dataset.v; route({ keep: true }); },
  'wa-chat'(el) { const c = client(el.dataset.id); if (c && c.phone) openExternal('https://wa.me/' + waNumber(c.phone)); },
  'new-session-for'(el) { const s = newSession(el.dataset.id, { status: 'andamento', time: hhmm(Math.round((new Date().getHours() * 60 + new Date().getMinutes()) / 15) * 15 % 1440) }); S.sessions.push(s); save(); go('#/atendimento/' + s.id); },
  'pick-svc'(el) { const c = $('#n_c'); UI.sel.client = c ? c.value : ''; UI.sel.svc = el.dataset.v; route({ keep: true }); },
  'start-session'() {
    if (!$('#n_c').value) { toast('Selecione a cliente'); return; } const cid = quickClientId($('#n_c').value); if (!cid) return;
    const s = newSession(cid, { service: UI.sel.svc || activeServices()[0], status: 'andamento' }); S.sessions.push(s); save(); UI.sel = {}; go('#/atendimento/' + s.id);
  },
  svc(el) {
    const s = curSession(); if (!s) return; const old = SERVICES[s.service];
    if (s.dur === old.dur) s.dur = SERVICES[el.dataset.v].dur; s.service = el.dataset.v; s.cuidados = null; s.angles = null; save(); route({ keep: true });
  },
  chip(el) { const s = curSession(); if (!s) return; const f = el.dataset.f; s[f] = s[f] === el.dataset.v ? '' : el.dataset.v; save(); route({ keep: true }); },
  care(el) { const s = curSession(); if (!s) return; const { cur, all } = careAll(s); const t = all[+el.dataset.i]; s.cuidados = el.checked ? cur.concat(cur.includes(t) ? [] : [t]) : cur.filter((x) => x !== t); save(); },
  'care-add'() { const s = curSession(); const i = $('#care_new'); if (!s || !i || !i.value.trim()) return; const { cur } = careAll(s); s.cuidados = cur.concat([i.value.trim()]); save(); route({ keep: true }); },
  'add-angle'() {
    const s = curSession(); const rest = Object.keys(ANGLES).filter((a) => !anglesOf(s).includes(a));
    openModal('<h2 class="h2">Adicionar ângulo</h2><div class="chips">' + rest.map((a) => '<button class="chip" data-act="angle-add" data-v="' + a + '">' + ANGLES[a] + '</button>').join('') + '</div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Cancelar</button></div>');
  },
  'angle-add'(el) { const s = curSession(); s.angles = anglesOf(s).concat([el.dataset.v]); save(); closeModal(); route({ keep: true }); },
  'save-draft'() { const s = curSession(); toast('Atendimento salvo'); go('#/clientes/' + s.clientId); },
  async finish() { const s = curSession(); if (!s) return; const first = s.status !== 'concluido'; s.status = 'concluido'; applyStock(s); syncPkg(s); save(); if (first) { toast('Atendimento concluído'); await askPayment(s); await askShared(s); } go('#/relatorio/' + s.id); },
  async 'finish-here'(el) { const s = sess(el.dataset.id); const first = s.status !== 'concluido'; s.status = 'concluido'; applyStock(s); syncPkg(s); save(); await askPayment(s); if (first) await askShared(s); route({ keep: true }); },
  async 'del-session'(el) {
    if (!(await confirmBox('Excluir atendimento?', 'O atendimento e as fotos dele serão apagados.', 'Excluir'))) return;
    const s = sess(el.dataset.id); releaseSession(s); for (const p of s.photos || []) await Photo.del(p.id);
    S.sessions = S.sessions.filter((x) => x.id !== s.id); save(); toast('Atendimento excluído'); go('#/clientes/' + s.clientId);
  },
  async cam(el) {
    const s = curSession(); if (!s) return; const c = client(s.clientId);
    if (S.settings.askConsent && c && c.termo && c.termo.fotos === false && !(await confirmBox('Fotos não autorizadas', c.name + ' não autorizou fotos de antes e depois no termo. Continuar mesmo assim?', 'Continuar'))) return;
    go('#/camera/' + s.id + '/' + el.dataset.st + '/' + el.dataset.an);
  },
  'cam-close'() { const c = UI.cam; if (history.length > 1) history.back(); else go('#/atendimento/' + c.sid); },
  'cam-stage'(el) { const c = UI.cam; location.replace('#/camera/' + c.sid + '/' + el.dataset.v + '/' + c.angle); },
  'cam-shot'() {
    const v = $('#cam_v'); if (!v || v.hidden || !v.videoWidth) { toast('Câmera não está pronta. Use a galeria.'); return; }
    compressImage(v, 1600).then((d) => { camReview(d); stopCam(); });
  },
  'cam-flip'() { UI.cam.facing = UI.cam.facing === 'environment' ? 'user' : 'environment'; camStart(); },
  'cam-redo'() { camLive(); },
  'cam-ghost'() { UI.camGhost = !UI.camGhost; camGhostApply(); },
  async 'cam-use'() { const c = UI.cam; const s = sess(c.sid); await setPhoto(s, c.stage, c.angle, c.shot); toast('Foto do ' + c.stage + ' salva'); if (history.length > 1) history.back(); else go('#/atendimento/' + c.sid); },
  angle(el) { UI.angle = el.dataset.v; route({ keep: true }); },
  'cmp-mode'(el) { UI.cmpMode = el.dataset.v; route({ keep: true }); },
  async 'pdf-dl'(el) { const s = sess(el.dataset.id); toast('Gerando PDF…'); const pages = await renderReport(s, s.rep); saveFileOut(pdfName(s), 'application/pdf', bytesToB64(buildPdf(pages))); },
  'wa-send'(el) { waSend(el.dataset.id); },
  'msg-reset'(el) { const s = sess(el.dataset.id); delete s.msg; save(); route({ keep: true }); },
  'area-toggle'(el) { const k = el.dataset.v, a = (UI.areasDraft || activeAreas()).slice(); const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); UI.areasDraft = a; if (el.dataset.mode === 'modal') openAreasSetup(true); else { saveAreas(a); route({ keep: true }); } },
  'areas-ok'() { const a = UI.areasDraft || activeAreas(); if (!a.length) { toast('Escolha ao menos uma área'); return; } saveAreas(a); if (UI.demoTrim) { UI.demoTrim = false; trimSampleToAreas(activeAreas()); } UI.areasDraft = null; closeModal(); route(); },
  'aj-svc'(el) { UI.ajSvc = el.dataset.v; route({ keep: true }); },
  'aj-msg-reset'() { S.settings.msg = MSG_DEFAULT; save(); route({ keep: true }); },
  'logo-del'() { S.settings.logo = null; save(); route({ keep: true }); },
  async 'app-update'() {
    toast('Verificando...');
    let r; try { r = await (await fetch('https://api.github.com/repos/guigon96-glitch/glow-agendar/releases/latest')).json(); } catch (e) { toast('Sem conexão'); return; }
    const v = String(r.tag_name || '').replace(/^v/, ''), apk = (r.assets || []).find((a) => /\.apk$/.test(a.name));
    const num = (x) => x.split('.').map(Number), cur = num(Native.appVersion()), nv = num(v);
    let newer = false; for (let i = 0; i < Math.max(cur.length, nv.length); i++) { const d = (nv[i] || 0) - (cur[i] || 0); if (d) { newer = d > 0; break; } }
    if (!apk || !newer) { toast('Você já tem a versão mais nova'); return; }
    if (!(await confirmBox('Atualização ' + v + ' disponível', 'O aplicativo será baixado e o Android pedirá para instalar. Seus dados continuam no aparelho.', 'Atualizar'))) return;
    Native.installUpdate(apk.browser_download_url); toast('Baixando atualização...');
  },
  async export() { saveFileOut('backup-glow-studio-' + todayISO() + '.json', 'application/json', btoa(unescape(encodeURIComponent(await exportBackup())))); },
  async wipe() {
    if (!(await confirmBox('Apagar todos os dados?', 'Clientes, atendimentos e fotos serão removidos deste aparelho. Esta ação não pode ser desfeita.', 'Apagar tudo'))) return;
    S.clients = []; S.sessions = []; S.settings = SETTINGS_DEFAULT(); S.ext = null; ensureExt(); for (const [k] of await DB.all('photos')) await DB.del('photos', k); PC.clear(); await flush(); await DB.put('kv', 'seeded', 1); toast('Dados apagados'); go('#/inicio');
  }
};
document.addEventListener('click', (e) => {
  if (e.target === $('#modal')) { ACT['modal-no'](); return; }
  const el = e.target.closest('[data-act]'); if (!el || el.tagName === 'INPUT' && el.type !== 'checkbox') return;
  const f = ACTX[el.dataset.act] || ACT[el.dataset.act]; if (f) f(el, e);
});
function applyField(t) {
  const o = t.dataset.o; if (!o) return;
  const obj = o === 'd' ? UI.draft : o === 's' ? sess(t.dataset.id) : o === 'c' ? client(t.dataset.id) : S.settings; if (!obj) return;
  const v = t.type === 'checkbox' ? t.checked : t.dataset.num ? (Number(t.value) || 0) : t.value;
  setPath(obj, t.dataset.f, v); if (o !== 'd') save();
  if (t.dataset.live) { const l = document.getElementById(t.dataset.live); if (l) l.textContent = t.value; }
  if (t.dataset.rr && window.__rr) window.__rr();
}
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'q') { UI.q = t.value; route({ keep: true }); return; }
  if (t.id === 'care_text') { S.settings.cuidados[t.dataset.svc] = t.value.split('\n').map((x) => x.trim()).filter(Boolean); save(); return; }
  applyField(t);
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.matches('[data-o]') && (t.type === 'checkbox' || t.tagName === 'SELECT')) applyField(t);
  if (t.matches('input[data-act="care"]')) ACT.care(t);
  if (t.id === 'n_c') UI.sel.client = t.value;
  const file = t.files && t.files[0]; if (!file) return;
  try {
    if (t.id === 'logo_file') { const im = await loadImg(URL.createObjectURL(file)); S.settings.logo = await compressImage(im, 256); save(); route({ keep: true }); }
    else if (t.id === 'imp_file') { await importBackup(await file.text()); toast('Backup importado'); route(); }
    else if (t.id === 'cam_file') { const im = await loadImg(URL.createObjectURL(file)); camReview(await compressImage(im, 1600)); stopCam(); }
  } catch (err) { toast('Não foi possível ler o arquivo'); }
  t.value = '';
});
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
window.addEventListener('pagehide', () => flush());
window.__lss = { S, UI, route, go };

(async function boot() {
  await loadAll(); await planInit(); await syncInit();
  const firstRun = !S.clients.length && !S.sessions.length && !(await DB.get('kv', 'seeded'));
  if (firstRun) await DB.put('kv', 'seeded', 1);
  if (!location.hash) location.hash = '#/inicio';
  await route();
  if (firstRun && !S.settings.areasSet) openWelcome(); else if (!S.settings.areasSet) openAreasSetup();
  planRefresh();
})();

/* ---------- celular: menu lateral em gaveta (alça na borda, arrastar para abrir/fechar) ---------- */
(function () {
  const side = $('#side'), bg = $('#drawerBg'), handle = $('#drawerHandle'), mq = matchMedia('(max-width:960px)');
  if (!side || !handle) return;
  const W = () => side.offsetWidth || 300;
  function set(open, focus) {
    side.classList.remove('drag'); side.style.transform = ''; bg.style.opacity = '';
    side.classList.toggle('open', open); document.body.classList.toggle('drawer-open', open);
    handle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { bg.hidden = false; requestAnimationFrame(() => bg.classList.add('on')); if (focus) { const a = side.querySelector('a.nav'); if (a) a.focus(); } }
    else { bg.classList.remove('on'); setTimeout(() => { if (!side.classList.contains('open')) bg.hidden = true; }, 300); if (focus) handle.focus(); }
  }
  const isOpen = () => side.classList.contains('open');
  handle.addEventListener('click', () => set(!isOpen(), true));
  bg.addEventListener('click', () => set(false));
  window.addEventListener('hashchange', () => { if (isOpen()) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) set(false, true); });
  mq.addEventListener('change', () => { if (!mq.matches && isOpen()) set(false); });
  // arrastar: começa na borda esquerda (ou na alça) com a gaveta fechada, ou em qualquer ponto com ela aberta
  let t = null;
  document.addEventListener('touchstart', (e) => {
    if (!mq.matches || $('#modal') && !$('#modal').hidden) return; const x = e.touches[0].clientX, y = e.touches[0].clientY;
    if (isOpen() || x <= 24 || e.target === handle || handle.contains(e.target)) t = { x, y, open: isOpen(), dx: 0, go: false };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!t) return; const dx = e.touches[0].clientX - t.x, dy = e.touches[0].clientY - t.y;
    if (!t.go) { if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { t = null; return; } if (Math.abs(dx) < 8) return; t.go = true; side.classList.add('drag'); bg.hidden = false; }
    t.dx = dx; const w = W(), pos = Math.max(-w, Math.min(0, (t.open ? 0 : -w) + dx));
    side.style.transform = 'translateX(' + pos + 'px)'; bg.style.opacity = String(1 + pos / w); bg.classList.add('on');
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!t) return; const d = t; t = null; if (!d.go) return;
    set(d.open ? d.dx > -W() / 3 : d.dx > W() / 3);
  });
})();
