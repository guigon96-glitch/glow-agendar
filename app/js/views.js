'use strict';
/* ===== Telas ===== */
const ICONS = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 3-4.5 5.5-4.5s4.9 1.5 5.5 4.5M16 6.2a3 3 0 0 1 0 5.6M18 14.8c1.7.6 2.7 2 3 4.2"/>',
  img: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/>', file: '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4M9 12h6M9 16h6"/>',
  set: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', redo: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5"/>', check: '<path d="M5 12l4 4 10-10"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>', chat: '<path d="M5 19l1.2-3.6A7.5 7.5 0 1 1 9 18.2z"/>', dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  edit: '<path d="M4 20l4-1 11-11-3-3L5 16z"/>', plus: '<path d="M12 5v14M5 12h14"/>', flip: '<path d="M7 7h9a4 4 0 0 1 4 4M17 17H8a4 4 0 0 1-4-4M14 4l3 3-3 3M10 14l-3 3 3 3"/>', arrows: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>', box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>', gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-3-5 0 .6 1.5 3 1 5 0zM12 9c2-4 6-3 5 0-.6 1.5-3 1-5 0z"/>', team: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5M15 14.2c2.8-.4 5 1 5.5 4.3"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
};
const ic = (n, c) => '<svg class="ico ' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>';
const av = (name, sz) => '<span class="av" style="width:' + sz + 'px;height:' + sz + 'px;font-size:' + Math.round(sz * 0.42) + 'px">' + esc(initials(name)) + '</span>';
const UI = { q: '', filter: 'todas', fichaTab: 'hist', agendaDate: todayISO(), cmpMode: 'slide', cmpPos: 50, angle: null, ajTab: 'perfil', draft: null, sel: {} };
const NAV = [['inicio', 'home', 'Início'], ['agenda', 'cal', 'Agenda'], ['clientes', 'users', 'Clientes'], ['fotos', 'img', 'Fotos'], ['financeiro', 'money', 'Financeiro'], ['pacotes', 'gift', 'Pacotes'], ['estoque', 'box', 'Estoque'], ['procedimentos', 'edit', 'Procedimentos'], ['relacionamento', 'chat', 'Relacionamento'], ['equipe', 'team', 'Equipe'], ['relatorios', 'file', 'Relatórios'], ['ajustes', 'set', 'Ajustes']];
const TABKEYS = ['inicio', 'agenda', 'clientes', 'fotos', 'financeiro'];
function shellHtml(active) {
  const items = NAV.map(([k, i, l]) => k === 'ajustes'
    ? '<details class="navgrp"' + (active === k ? ' open' : '') + '><summary class="nav">' + ic(i) + l + '</summary>' + ajTabs().map(([t, tl]) => '<a class="nav sub ' + (active === k && UI.ajTab === t ? 'on' : '') + '" href="#/ajustes/' + t + '" data-aj="' + t + '"' + (active === k && UI.ajTab === t ? ' aria-current="page"' : '') + '>' + tl + '</a>').join('') + '</details>'
    : '<a class="nav ' + (active === k ? 'on' : '') + '" href="#/' + k + '"' + (active === k ? ' aria-current="page"' : '') + '>' + ic(i) + l + '</a>').join('');
  const first = (S.settings.owner || 'LS');
  return {
    side: '<div class="logo"><b>' + esc(S.settings.studio.replace(/\s+Studios?$/i, '')) + '</b><i>STUDIO</i><u></u></div>' + items + '<div class="me">' + av(first, 40) + '<div><div style="font-weight:500;font-size:14px">' + esc(first) + '</div><div class="muted" style="font-size:12px">Beleza e bem-estar</div></div></div>',
    tab: NAV.filter((n) => TABKEYS.includes(n[0])).map(([k, i, l]) => '<a class="nav ' + (active === k ? 'on' : '') + '" href="#/' + k + '">' + ic(i) + l + '</a>').join('')
  };
}
// Onde avisos extras entram no Início: depois do cartão do próximo horário, senão depois do cabeçalho.
const topAt = (h) => { const m = h.indexOf('<!--top-->'); return m >= 0 ? m + 10 : h.indexOf('</header>') + 9; };
const head = (eyebrow, title, acts) => '<header class="head"><div><h1 class="h1">' + title + '</h1><div class="eyebrow">' + eyebrow + '</div></div><div class="acts">' + (acts || '') + '</div></header>';
const back = (href, label) => '<a class="btn ghost sm" href="' + href + '">' + ic('back') + (label || 'Voltar') + '</a>';
const imgTag = (id, alt) => PC.get(id) ? '<img src="' + PC.get(id) + '" alt="' + esc(alt || '') + '">' : '';
const emptyBox = (t, sub, btn) => '<div class="empty"><div style="font:800 20px var(--sans);color:var(--ink)">' + t + '</div><div>' + (sub || '') + '</div>' + (btn || '') + '</div>';
const statusTag = (s) => stTag(s);
function sessPhotoIds(list) { const ids = []; list.forEach((s) => (s.photos || []).forEach((p) => ids.push(p.id))); return ids; }
function thumbPair(s) {
  const a = anglesComplete(s)[0] || anglesWithPhotos(s)[0]; if (!a) return '';
  const t = (st) => { const p = photoOf(s, st, a); return '<div><div class="ph skin" style="width:112px;height:76px">' + (p ? imgTag(p.id) : '') + '</div><div class="sm muted" style="text-align:center;font-size:12px;margin-top:4px">' + st.replace(/^./, (x) => x.toUpperCase()) + '</div></div>'; };
  return '<div style="display:flex;gap:10px">' + t('antes') + t('depois') + '</div>';
}
function returnsList() {
  const t = todayISO(), out = [];
  S.clients.forEach((c) => {
    const last = clientSessions(c.id).find((x) => x.status === 'concluido'); if (!last) return;
    if (S.sessions.some((x) => x.clientId === c.id && isOpenSess(x) && x.date >= t)) return;
    const diff = Math.round((parseISO(nextDate(last)) - parseISO(t)) / 864e5);
    if (diff <= 7 && diff >= -30) out.push({ c, last, diff });
  });
  return out.sort((a, b) => a.diff - b.diff);
}
const diffTxt = (d) => d < 0 ? 'atrasada há ' + (-d) + (d === -1 ? ' dia' : ' dias') : d === 0 ? 'hoje' : 'em ' + d + (d === 1 ? ' dia' : ' dias');

/* ---------- Início ---------- */
async function vInicio() {
  const t = todayISO(), d = new Date();
  const all = S.sessions.filter((s) => s.date === t).sort(sortSessions), today = all.filter((s) => !isOff(s));
  const done = today.filter((s) => s.status === 'concluido').length;
  const pend = S.sessions.filter((s) => s.status === 'concluido' && !s.sent && s.date >= addDays(t, -14)).sort(sortSessions).reverse();
  const rets = returnsList();
  const first = (S.settings.owner || '').split(' ')[0] || 'Bia';
  const hr = d.getHours(), hi = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  const dateTxt = DIAL[d.getDay()].replace(/^./, (c) => c.toUpperCase()) + ', ' + d.getDate() + ' de ' + MESL[d.getMonth()];
  const hero = '<header class="hero"><div class="hero-top"><span class="brand">' + esc(S.settings.studio || 'Glow Studio') + '</span><a class="btn sm" href="#/atendimento/novo">' + ic('plus') + 'Novo atendimento</a></div><h1 class="h1">' + hi + ', ' + esc(first) + '</h1><div class="hero-sub">' + dateTxt + '</div></header>';
  let body;
  if (!S.clients.length) {
    body = '<div class="card stack tk-solo" style="align-items:flex-start"><h2 class="h2">Bem-vinda ao seu app</h2><div class="muted">Comece cadastrando sua primeira cliente. Depois é só registrar o atendimento, tirar as fotos de antes e depois e enviar o relatório pelo WhatsApp.</div><div class="acts"><a class="btn" href="#/clientes/novo">+ Cadastrar cliente</a><button class="btn ghost" data-act="sample">Carregar exemplo</button></div></div>';
  } else {
    const now = pad(hr) + ':' + pad(d.getMinutes());
    const nx = today.find((s) => s.status === 'andamento') || today.find((s) => s.status === 'agendado' && s.time >= now) || today.find((s) => s.status === 'agendado');
    let tk;
    if (nx) {
      const c = client(nx.clientId) || { name: '?' }, k = activePkgs(nx.clientId, nx.service)[0], go = nx.status === 'andamento';
      const holes = k ? '<div class="holes" aria-label="Pacote: ' + k.used + ' de ' + k.total + ' sessões usadas">' + Array.from({ length: Math.min(k.total, 10) }, (_, i) => '<i class="' + (i < k.used ? 'p' : '') + '"></i>').join('') + '<span>Pacote ' + k.used + ' de ' + k.total + '</span></div>' : '';
      const has = (st) => (nx.photos || []).some((p) => p.stage === st);
      const bulbs = '<div class="bulbs" aria-label="Passos do atendimento">' + [['Antes', has('antes')], ['Depois', has('depois')], ['Relatório', nx.status === 'concluido']].map(([l, on]) => '<span class="' + (on ? 'on' : '') + '"><i></i>' + l + '</span>').join('') + '</div>';
      tk = '<section class="mir"><div class="mir-in"><div class="stampx' + (go ? ' go' : nx.confirmed ? '' : ' pend') + '"><b>' + nx.time + '</b><small>' + (go ? 'Em atendimento' : nx.confirmed ? 'Confirmado' : 'A confirmar') + '</small></div><h2 class="h2">' + esc(c.name) + '</h2><div class="muted">' + esc(procTitle(nx)) + '</div>' + holes + bulbs + '</div></section>' +
        '<div class="tk-acts"><button class="btn cta" data-act="open-session" data-id="' + nx.id + '">' + (go ? 'Continuar atendimento' : 'Iniciar atendimento') + '</button><a class="btn ghost" href="#/clientes/' + c.id + '">Ver ficha</a></div>';
    } else tk = '<section class="mir"><div class="mir-in"><div class="stampx pend"><b>' + now + '</b><small>Livre</small></div><h2 class="h2">Agenda livre</h2><div class="muted">' + (today.length ? 'Todos os horários de hoje já foram atendidos.' : 'Nenhum horário marcado para hoje.') + '</div></div></section><div class="tk-acts"><a class="btn" href="#/agenda">Abrir agenda</a></div>';
    const alerts = (function () { const al = homeAlerts(); return al.length ? '<div class="card" style="padding:16px 20px 6px"><h2 class="h2" style="margin-bottom:6px">Atenção</h2>' + al.map((a) => '<a href="' + a[0] + '" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line);text-decoration:none"><span class="tag sand">' + a[2] + '</span><span style="flex:1">' + a[1] + '</span>' + ic('next') + '</a>').join('') + '</div>' : ''; })();
    body = tk +
      '<section class="cols"><div class="card grow" style="padding:18px 12px 8px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:0 8px 10px"><h2 class="h2">Hoje</h2><span class="muted sm">' + today.length + (today.length === 1 ? ' horário' : ' horários') + ' · ' + done + (done === 1 ? ' concluído' : ' concluídos') + '</span></div>' +
      (all.length ? all.map((s) => { const c = client(s.clientId) || { name: '?' }, p = proOf(s); return '<button class="row' + (isOff(s) ? ' off' : '') + '" data-act="open-session" data-id="' + s.id + '"><span class="time">' + s.time + '</span>' + av(c.name, 44) + '<span style="flex:1;min-width:0"><span style="display:block;font-weight:600;font-size:16px">' + esc(c.name) + '</span><span class="muted sm">' + (multiPro() && p ? '<i class="dot" style="background:' + p.color + '"></i>' + esc(p.name.split(' ')[0]) + ' · ' : '') + esc(procTitle(s)) + '</span></span>' + statusTag(s) + '</button>'; }).join('') : '<div style="padding:12px 8px 18px" class="muted">Nenhum atendimento hoje.</div>') +
      '<a href="#/agenda" class="more">Ver agenda completa</a></div>' +
      '<div class="stack side2">' + alerts + '<div class="card"><h2 class="h2" style="margin-bottom:10px">Para enviar' + (pend.length ? ' <span class="cnt">' + pend.length + '</span>' : '') + '</h2>' +
      (pend.length ? pend.slice(0, 4).map((s) => { const c = client(s.clientId) || { name: '?' }; return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:0"><div style="font-weight:600">' + esc(c.name.split(' ')[0]) + '</div><div class="muted sm">' + esc(SERVICES[s.service].name) + ' · ' + s.time + '</div></div><a class="btn sm" href="#/whatsapp/' + s.id + '">Enviar</a></div>'; }).join('') : '<div class="muted sm">Nenhum relatório pendente.</div>') + '</div>' +
      '<div class="card"><h2 class="h2" style="margin-bottom:10px">Retornos próximos' + (rets.length ? ' <span class="cnt">' + rets.length + '</span>' : '') + '</h2>' + (rets.length ? rets.slice(0, 4).map((r) => '<a href="#/clientes/' + r.c.id + '" style="display:block;padding:10px 0;border-top:1px solid var(--line);text-decoration:none"><div style="font-weight:600">' + esc(r.c.name) + '</div><div class="muted sm">Manutenção · ' + diffTxt(r.diff) + '</div></a>').join('') : '<div class="muted sm">Nenhum retorno nos próximos dias.</div>') + '</div></div></section><!--top-->';
  }
  return { nav: 'inicio', html: hero + body };
}

/* ---------- Agenda ---------- */
function weekOf(dateISO) { const d = parseISO(dateISO); const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return Array.from({ length: 7 }, (_, i) => { const x = new Date(s); x.setDate(s.getDate() + i); return iso(x); }); }

/* ---------- Clientes ---------- */
async function vClientes() {
  const q = UI.q.toLowerCase(), f = UI.filter;
  const rets = returnsList().map((r) => r.c.id);
  let list = S.clients.filter((c) => (c.name + ' ' + (c.phone || '')).toLowerCase().includes(q));
  const last = (c) => clientSessions(c.id).find((s) => s.status === 'concluido');
  if (AREAS[f]) list = list.filter((c) => clientSessions(c.id).some((s) => SERVICES[s.service].area === f));
  if (f === 'ret') list = list.filter((c) => rets.includes(c.id));
  list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const cards = list.map((c) => { const l = last(c); return '<button class="row cl" data-act="open-client" data-id="' + c.id + '"><span style="flex:1;min-width:0"><b>' + esc(c.name) + '</b><span class="muted sm">' + (l ? esc(SERVICES[l.service].name) + ' · ' + fmtDate(l.date) : 'Sem atendimentos') + (c.phone ? ' · ' + esc(c.phone) : '') + '</span></span>' + (rets.includes(c.id) ? '<span class="tag next">Retorno próximo</span>' : '') + '</button>'; }).join('');
  const chip = (k, l) => '<button class="chip ' + (f === k ? 'on' : '') + '" data-act="filter" data-v="' + k + '" aria-pressed="' + (f === k) + '">' + l + '</button>';
  return { nav: 'clientes', html: head('Seu cadastro', 'Clientes', '<input class="in" id="q" aria-label="Buscar cliente" placeholder="Buscar por nome ou telefone" style="width:260px" value="' + esc(UI.q) + '"><a class="btn cta" href="#/clientes/novo">+ Nova cliente</a>') +
    '<div class="chips scroll">' + chip('todas', 'Todas') + activeAreas().map((k) => chip(k, AREAS[k].name.replace(' e depilação', ''))).join('') + chip('ret', 'Retorno próximo') + '</div>' +
    '<div id="clist" class="list">' + (cards || '') + '</div>' + (cards ? '' : emptyBox(S.clients.length ? 'Nenhuma cliente encontrada' : 'Ainda sem clientes', S.clients.length ? 'Tente outro nome ou filtro.' : 'Cadastre sua primeira cliente para começar.', S.clients.length ? '' : '<a class="btn" href="#/clientes/novo">+ Nova cliente</a>')) };
}
function listOnly() { /* usado pela busca: re-renderiza só a lista */ return vClientes(); }

/* ---------- Cadastro / edição ---------- */
const ANAM = [['alergia', 'Alergia a adesivos, esmaltes ou cosméticos'], ['infeccao', 'Conjuntivite, blefarite ou infecção ocular'], ['lentes', 'Usa lentes de contato'], ['gestante', 'Gestante ou lactante'], ['derma', 'Tratamento dermatológico na região dos olhos'], ['jafez', 'Já fez extensão de cílios antes']];
function blankClient() { return { id: uid(), name: '', birth: '', phone: '', email: '', insta: '', city: '', origin: 'Indicação de cliente', notes: '', anam: {}, termo: { aceite: false, fotos: true, divulgacao: false }, sign: null, created: todayISO() }; }
async function vClienteForm(id) {
  const isNew = !id;
  if (!isNew && !client(id)) return { nav: 'clientes', html: emptyBox('Cliente não encontrada', '', '<a class="btn" href="#/clientes">Voltar</a>') };
  if (!UI.draft || UI.draft.__for !== (id || 'novo')) { UI.draft = isNew ? blankClient() : JSON.parse(JSON.stringify(client(id))); UI.draft.__for = id || 'novo'; if (!isNew && UI.draft.signId) await Photo.preload([UI.draft.signId]); }
  const d = UI.draft; if (!isNew && !client(id)) return { nav: 'clientes', html: emptyBox('Cliente não encontrada', '', '<a class="btn" href="#/clientes">Voltar</a>') };
  const inp = (f, l, ph, type) => '<div><label class="lb" for="f_' + f + '">' + l + '</label><input class="in" id="f_' + f + '" type="' + (type || 'text') + '" data-o="d" data-f="' + f + '" placeholder="' + (ph || '') + '" value="' + esc(d[f]) + '"></div>';
  const ck = (path, l, checked) => '<label class="ck"><input type="checkbox" data-o="d" data-f="' + path + '"' + (checked ? ' checked' : '') + '>' + l + '</label>';
  return { nav: 'clientes', html: head('Clientes · ' + (isNew ? 'Nova cliente' : 'Editar'), isNew ? 'Novo cadastro' : 'Editar cadastro', '<a class="btn ghost" href="' + (isNew ? '#/clientes' : '#/clientes/' + id) + '">Cancelar</a><button class="btn" data-act="save-client">Salvar cadastro</button>') +
    '<section class="cols"><div class="card grow stack"><h2 class="h2">Dados pessoais</h2>' + inp('name', 'Nome completo', 'Ex.: Ana Beatriz Lima') + '<div class="grid2">' + inp('birth', 'Data de nascimento', '', 'date') + inp('phone', 'WhatsApp', '(00) 0 0000-0000', 'tel') + inp('email', 'E-mail', 'nome@email.com', 'email') + inp('insta', 'Instagram', '@usuario') + inp('city', 'Cidade', 'Cidade') +
    '<div><label class="lb" for="f_origin">Como conheceu o estúdio</label><select class="in" id="f_origin" data-o="d" data-f="origin">' + ['Indicação de cliente', 'Instagram', 'Google', 'Outro'].map((o) => '<option' + (d.origin === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div></div>' +
    '<div><label class="lb" for="f_notes">Observações</label><textarea class="in" id="f_notes" data-o="d" data-f="notes" placeholder="Preferências de estilo, rotina, sensibilidades…">' + esc(d.notes) + '</textarea></div></div>' +
    '<div class="stack" style="width:420px;flex:none"><div class="card" style="padding:22px 24px 10px"><h2 class="h2" style="margin-bottom:12px">Anamnese</h2>' + ANAM.map(([k, l]) => ck('anam.' + k, l, d.anam && d.anam[k])).join('') + '</div>' +
    '<div class="card" style="padding:22px 24px 20px"><h2 class="h2" style="margin-bottom:12px">Termo de consentimento</h2>' + ck('termo.aceite', 'Li e aceito o termo do procedimento', d.termo.aceite) + ck('termo.fotos', 'Autorizo fotos de antes e depois para acompanhamento', d.termo.fotos) + ck('termo.divulgacao', 'Autorizo usar minhas fotos em divulgação (opcional)', d.termo.divulgacao) +
    '<div style="margin-top:12px"><div class="lb">Assinatura da cliente</div>' + (d.signId && PC.get(d.signId) && !UI.reSign ? '<div class="paper" style="padding:8px"><img src="' + PC.get(d.signId) + '" alt="Assinatura" style="max-height:120px;width:auto;margin:auto"></div><button class="btn ghost sm" style="margin-top:8px" data-act="resign">Refazer assinatura</button>' : '<canvas class="sig" id="sig" aria-label="Área de assinatura"></canvas><button class="btn ghost sm" style="margin-top:8px" data-act="sig-clear">Limpar</button>') + '</div></div></div></section>' };
}
