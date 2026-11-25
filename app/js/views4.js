'use strict';
/* ===== Agenda completa (profissionais, conflitos, bloqueios, remarcação) e equipe ===== */
const stTag = (s) => s.status === 'concluido' ? '<span class="tag done">Concluído</span>' : s.status === 'andamento' ? '<span class="tag now">Em atendimento</span>' : s.status === 'cancelado' ? '<span class="tag off">Cancelado</span>' : s.status === 'faltou' ? '<span class="tag off">Faltou</span>' : '<span class="tag next' + (s.confirmed ? '">Confirmado' : ' pend">A confirmar') + '</span>';
UI.agPro = 'todas';

function lanePlace(list) {
  const cols = []; const placed = list.map((s) => { const st = mins(s.time), en = st + (s.dur || 30); let ci = cols.findIndex((e) => e <= st); if (ci < 0) { ci = cols.length; cols.push(0); } cols[ci] = en; return { s, st, en, ci }; });
  return { placed, nc: Math.max(1, cols.length) };
}
async function vAgenda() {
  const day = UI.agendaDate, wk = weekOf(day), d = parseISO(day);
  const all = S.sessions.filter((s) => s.date === day && !isOff(s)).sort(sortSessions);
  const offs = S.sessions.filter((s) => s.date === day && isOff(s)).sort(sortSessions);
  const blocks = S.ext.blocks.filter((b) => b.date === day);
  const multi = multiPro(), sel = multi && pro(UI.agPro) ? pro(UI.agPro) : null;
  const lanes = multi && !sel ? activePros() : [sel];
  const hh = HRS(); let h0 = Math.floor(mins(hh.open) / 60), h1 = Math.ceil(mins(hh.close) / 60);
  all.forEach((s) => { h0 = Math.min(h0, Math.floor(mins(s.time) / 60)); h1 = Math.max(h1, Math.ceil((mins(s.time) + s.dur) / 60)); });
  const RH = 56, H = (h1 - h0) * RH, N = lanes.length;
  let lines = ''; for (let h = h0; h < h1; h++) lines += '<div class="ln" style="top:' + (h - h0) * RH + 'px"><span class="hr">' + pad(h) + ':00</span></div>';
  let lunch = ''; if (hh.lunchFrom && hh.lunchTo) lunch = '<div class="bk blk" style="top:' + (mins(hh.lunchFrom) - h0 * 60) / 60 * RH + 'px;height:' + (mins(hh.lunchTo) - mins(hh.lunchFrom)) / 60 * RH + 'px;left:64px;right:0;pointer-events:none"><span class="t"><small>Almoço</small></span></div>';
  const laneHtml = lanes.map((p, i) => {
    const list = all.filter((s) => !p || proOf(s).id === p.id); const { placed, nc } = lanePlace(list);
    const bl = placed.map(({ s, st, en, ci }) => { const c = client(s.clientId) || { name: '?' }; const top = (st - h0 * 60) / 60 * RH + 2, ht = Math.max(40, (en - st) / 60 * RH - 4);
      return '<button class="bk ' + (s.status === 'concluido' ? 'done' : s.status === 'andamento' ? 'now' : 'next' + (s.confirmed ? '' : ' pend')) + '" style="top:' + top + 'px;height:' + ht + 'px;left:calc(100% / ' + nc + ' * ' + ci + ');width:calc(100% / ' + nc + ');right:auto" data-act="open-session" data-id="' + s.id + '" aria-label="' + esc(c.name) + ', ' + (s.status === 'agendado' ? (s.confirmed ? 'confirmado' : 'a confirmar') : s.status) + '"><span class="t"><b>' + esc(N > 1 ? c.name.split(' ')[0] : c.name) + '</b><small>' + hhmm(st) + ' – ' + hhmm(en) + ' · ' + esc(SERVICES[s.service].name) + '</small></span></button>'; }).join('');
    const bk = blocks.filter((b) => !p || !b.proId || b.proId === p.id).map((b) => '<button class="bk blk" style="top:' + (mins(b.from) - h0 * 60) / 60 * RH + 'px;height:' + Math.max(32, (mins(b.to) - mins(b.from)) / 60 * RH) + 'px;left:0;right:0" data-act="blk-del" data-id="' + b.id + '" aria-label="Remover bloqueio"><span class="t"><small>' + esc(b.note || 'Bloqueado') + ' · ' + b.from + '–' + b.to + '</small></span></button>').join('');
    return '<div style="position:absolute;top:0;bottom:0;left:calc(64px + (100% - 64px) / ' + N + ' * ' + i + ');width:calc((100% - 64px) / ' + N + ');padding:0 3px">' + '<div style="position:relative;height:100%">' + bl + bk + '</div></div>';
  }).join('');
  const strip = wk.map((x) => { const dd = parseISO(x); const has = S.sessions.some((s) => s.date === x && !isOff(s)); return '<button class="day ' + (x === day ? 'on' : '') + '" data-act="agenda-day" data-v="' + x + '" aria-pressed="' + (x === day) + '"><span>' + DIAS[dd.getDay()] + '</span><b>' + dd.getDate() + '</b>' + (has ? '<i></i>' : '') + '</button>'; }).join('');
  const proChips = multi ? '<div class="chips scroll">' + ['todas'].concat(activePros().map((p) => p.id)).map((k) => '<button class="chip ' + (UI.agPro === k || (!pro(UI.agPro) && k === 'todas') ? 'on' : '') + '" data-act="ag-pro" data-v="' + k + '">' + (k === 'todas' ? 'Todas as profissionais' : '<span style="width:10px;height:10px;border-radius:50%;background:' + pro(k).color + ';margin-right:8px"></span>' + esc(pro(k).name.split(' ')[0])) + '</button>').join('') + '</div>' : '';
  const laneHead = multi && !sel ? '<div style="display:flex;margin:0 0 8px 64px">' + lanes.map((p) => '<div style="flex:1;text-align:center;font-weight:500;font-size:14px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + p.color + ';margin-right:6px"></span>' + esc(p.name.split(' ')[0]) + '</div>').join('') + '</div>' : '';
  const bkReq = typeof bookingCards === 'function' ? bookingCards() : '';
  const offHtml = offs.length ? '<div class="card stack" style="gap:6px"><h2 class="h3">Cancelados e faltas</h2>' + offs.map((s) => { const c = client(s.clientId) || { name: '?' }; return '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--line)"><div style="flex:1"><b style="font-weight:500">' + esc(c.name) + '</b><div class="muted sm">' + s.time + ' · ' + esc(SERVICES[s.service].name) + '</div></div>' + stTag(s) + '<button class="btn ghost sm" data-act="ap-redo" data-id="' + s.id + '">Reagendar</button></div>'; }).join('') + '</div>' : '';
  return { nav: 'agenda', html: head(MESL[d.getMonth()].replace(/^./, (c) => c.toUpperCase()) + ' de ' + d.getFullYear(), 'Agenda', '<button class="btn ghost sm" data-act="agenda-shift" data-v="-7" aria-label="Semana anterior">' + ic('back') + '</button><button class="btn ghost sm" data-act="agenda-day" data-v="' + todayISO() + '">Hoje</button><button class="btn ghost sm" data-act="agenda-shift" data-v="7" aria-label="Próxima semana">' + ic('next') + '</button><button class="btn ghost sm" data-act="blk-new">Bloquear</button><button class="btn cta" data-act="new-appt">+ Novo agendamento</button>') +
    proChips + '<div class="week">' + strip + '</div><div class="card" style="padding:20px 20px 16px 16px"><div class="muted sm" style="margin:0 0 12px 8px">' + DIAL[d.getDay()] + ', ' + fmtLong(day) + ' · ' + all.length + (all.length === 1 ? ' atendimento' : ' atendimentos') + (dayOpen(day) ? '' : ' · <b>estúdio fechado neste dia</b>') + '</div>' + laneHead + '<div class="tl" style="height:' + H + 'px">' + lines + lunch + laneHtml + '</div></div>' + bkReq + offHtml };
}

/* ---------- formulário de agendamento ---------- */
const defaultProId = () => (activePros()[0] || pros()[0]).id;
function apptForm(id, pre) {
  const s = id ? sess(id) : null;
  if (!S.clients.length) { toast('Cadastre uma cliente primeiro'); go('#/clientes/novo'); return; }
  const svc0 = (pre && pre.service) || (s && s.service) || activeServices()[0];
  const v = Object.assign({ clientId: '', service: svc0, date: UI.agendaDate, time: '09:00', dur: SERVICES[svc0].dur, proId: UI.agPro !== 'todas' && pro(UI.agPro) ? UI.agPro : defaultProId() }, s ? { clientId: s.clientId, service: s.service, date: s.date, time: s.time, dur: s.dur, proId: proOf(s).id } : {}, pre || {});
  UI.apId = id || null;
  const svcs = activeServices(); if (!svcs.includes(v.service)) svcs.push(v.service);
  openModal('<h2 class="h2">' + (id ? 'Editar agendamento' : 'Novo agendamento') + '</h2><div><label class="lb" for="ap_c">Cliente</label><select class="in" id="ap_c" data-ap>' + S.clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((c) => '<option value="' + c.id + '"' + (c.id === v.clientId ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></div>' +
    '<div><label class="lb" for="ap_s">Procedimento</label><select class="in" id="ap_s" data-ap>' + svcs.map((k) => '<option value="' + k + '"' + (k === v.service ? ' selected' : '') + '>' + SERVICES[k].name + ' · ' + fmtBRL0(priceOf(k)) + '</option>').join('') + '</select></div>' +
    (multiPro() ? '<div><label class="lb" for="ap_p">Profissional</label><select class="in" id="ap_p" data-ap>' + activePros().map((p) => '<option value="' + p.id + '"' + (p.id === v.proId ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></div>' : '<input type="hidden" id="ap_p" value="' + v.proId + '">') +
    '<div class="grid3 keep" style="gap:10px"><div><label class="lb" for="ap_d">Data</label><input class="in" id="ap_d" type="date" value="' + v.date + '" data-ap></div><div><label class="lb" for="ap_t">Hora</label><input class="in" id="ap_t" type="time" value="' + v.time + '" data-ap></div><div><label class="lb" for="ap_u">Duração (min)</label><input class="in" id="ap_u" type="number" min="15" step="15" value="' + v.dur + '" data-ap></div></div>' +
    '<div><div class="lb">Horários livres</div><div class="chips" id="ap_slots"></div><div id="ap_hint" class="sm" style="margin-top:8px"></div></div>' +
    (id ? '' : '<div class="grid2" style="gap:10px"><div><label class="lb" for="ap_r">Repetir</label><select class="in" id="ap_r"><option value="0">Não repetir</option><option value="7">Toda semana</option><option value="14">A cada 15 dias</option><option value="28">A cada 4 semanas</option></select></div><div><label class="lb" for="ap_n">Quantas vezes</label><input class="in" id="ap_n" type="number" min="2" max="12" value="4"></div></div>') +
    '<div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Cancelar</button><button class="btn" data-act="ap-save">' + (id ? 'Salvar' : 'Agendar') + '</button></div>');
  refreshSlots();
}
function apVals() { return { clientId: $('#ap_c').value, service: $('#ap_s').value, proId: $('#ap_p').value, date: $('#ap_d').value || todayISO(), time: $('#ap_t').value || '09:00', dur: Math.max(15, Number($('#ap_u').value) || 60) }; }
function refreshSlots() {
  const box = $('#ap_slots'); if (!box) return; const v = apVals(); const sl = freeSlots(v.date, v.dur, v.proId, UI.apId);
  box.innerHTML = sl.length ? sl.slice(0, 16).map((t) => '<button class="chip' + (t === v.time ? ' on' : '') + '" style="height:38px;padding:0 12px" data-act="ap-slot" data-v="' + t + '">' + t + '</button>').join('') : '<span class="muted sm">' + (dayOpen(v.date) ? 'Sem horários livres neste dia.' : 'O estúdio não abre neste dia da semana.') + '</span>';
  const cf = hasConflict(v.date, v.time, v.dur, v.proId, UI.apId); const h = $('#ap_hint');
  if (h) h.innerHTML = cf ? '<span style="color:#B42318;font-weight:500">⚠ Este horário conflita com outro atendimento ou bloqueio.</span>' : '<span class="muted">Horário disponível.</span>';
}
document.addEventListener('change', (e) => {
  const t = e.target; if (!t.closest || !t.closest('#modal') || !t.matches('[data-ap]')) return;
  if (t.id === 'ap_s') { const u = $('#ap_u'); if (u) u.value = SERVICES[t.value].dur; }
  refreshSlots();
});
document.addEventListener('input', (e) => { const t = e.target; if (t.closest && t.closest('#modal') && t.matches('[data-ap]') && t.type !== 'date') refreshSlots(); });

function apptModal(id) {
  const s = sess(id); if (!s) return; const c = client(s.clientId) || { name: '?' }; const p = proOf(s);
  const pk = activePkgs(s.clientId, s.service).length;
  openModal('<h2 class="h2">' + esc(c.name) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap">' + stTag(s) + '<span class="pill">' + esc(SERVICES[s.service].name) + '</span><span class="pill">' + fmtBRL0(sessNet(s)) + '</span>' + (pk ? '<span class="pill">Tem pacote ativo</span>' : '') + '</div><div class="muted">' + DIAL[parseISO(s.date).getDay()] + ', ' + fmtLong(s.date) + '<br>' + s.time + ' – ' + hhmm(mins(s.time) + s.dur) + (multiPro() ? ' · ' + esc(p.name) : '') + '</div>' + (s.notes ? '<div class="sm">' + esc(s.notes) + '</div>' : '') +
    '<div class="stack" style="gap:8px"><button class="btn" data-act="ap-start" data-id="' + id + '">Iniciar atendimento</button><div class="grid2" style="gap:8px"><button class="btn ghost sm" data-act="ap-confirm" data-id="' + id + '">' + (s.confirmed ? 'Desmarcar confirmação' : 'Cliente confirmou') + '</button><button class="btn ghost sm" data-act="ap-remind" data-id="' + id + '">' + ic('chat') + 'Lembrete</button><button class="btn ghost sm" data-act="ap-edit" data-id="' + id + '">' + ic('edit') + 'Remarcar / editar</button><button class="btn ghost sm" data-act="ap-open" data-id="' + id + '">Abrir ficha</button><button class="btn danger sm" data-act="ap-cancel" data-id="' + id + '" data-v="cancelado">Cancelar</button><button class="btn danger sm" data-act="ap-cancel" data-id="' + id + '" data-v="faltou">Marcar falta</button></div></div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Fechar</button></div>');
}
Object.assign(ACTX, {
  'open-session'(el) {
    const s = sess(el.dataset.id); if (!s) return;
    if (s.status === 'concluido') go('#/clientes/' + s.clientId); else if (s.status === 'agendado' && s.date >= addDays(todayISO(), -30)) apptModal(s.id); else if (isOff(s)) apptModal(s.id); else go('#/atendimento/' + s.id);
  },
  'new-appt'() { apptForm(null); },
  'ap-slot'(el) { $('#ap_t').value = el.dataset.v; refreshSlots(); },
  'ap-redo'(el) { const s = sess(el.dataset.id); apptForm(null, { clientId: s.clientId, service: s.service, dur: s.dur, proId: proOf(s).id }); },
  'ap-edit'(el) { closeModal(); apptForm(el.dataset.id); },
  'ap-start'(el) { const s = sess(el.dataset.id); s.status = 'andamento'; save(); closeModal(); go('#/atendimento/' + s.id); },
  'ap-open'(el) { const s = sess(el.dataset.id); closeModal(); go('#/clientes/' + s.clientId); },
  'ap-confirm'(el) { const s = sess(el.dataset.id); s.confirmed = !s.confirmed; save(); closeModal(); route({ keep: true }); toast(s.confirmed ? 'Presença confirmada' : 'Confirmação removida'); },
  'ap-remind'(el) { const s = sess(el.dataset.id), c = client(s.clientId); if (sendTo(c.phone, fillTpl('lembrete', sessVars(s)), 'lem:' + s.id + ':' + s.date + s.time)) closeModal(); },
  async 'ap-cancel'(el) {
    const s = sess(el.dataset.id), nome = el.dataset.v === 'faltou' ? 'Marcar falta' : 'Cancelar agendamento';
    if (!(await confirmBox(nome + '?', (client(s.clientId) || {}).name + ' · ' + fmtDate(s.date) + ' ' + s.time + '. O horário volta a ficar livre.', 'Confirmar'))) return;
    s.status = el.dataset.v; if (el.dataset.v === 'cancelado' && typeof bookingCanceled === 'function') bookingCanceled(s); save(); closeModal(); route({ keep: true }); toast(el.dataset.v === 'faltou' ? 'Falta registrada' : 'Agendamento cancelado');
  },
  async 'ap-save'() {
    const v = apVals(); let list = []; const rep = Number(($('#ap_r') || {}).value) || 0, n = rep ? Math.min(12, Math.max(2, Number($('#ap_n').value) || 2)) : 1;
    for (let i = 0; i < n; i++) list.push(addDays(v.date, rep * i));
    const bad = list.filter((d) => hasConflict(d, v.time, v.dur, v.proId, UI.apId));
    if (bad.length && !(await confirmBox('Conflito de horário', bad.length === 1 ? fmtDate(bad[0]) + ' às ' + v.time + ' já está ocupado (atendimento ou bloqueio). Agendar mesmo assim?' : bad.length + ' das datas têm conflito. Agendar mesmo assim?', 'Agendar mesmo assim'))) return;
    if (UI.apId) { const s = sess(UI.apId); const chg = s.service !== v.service; Object.assign(s, { clientId: v.clientId, service: v.service, proId: v.proId, date: v.date, time: v.time, dur: v.dur }); if (chg) { s.cuidados = null; s.angles = null; } if (s.status !== 'agendado' && isOff(s)) s.status = 'agendado'; toast('Agendamento atualizado'); }
    else { list.forEach((d) => S.sessions.push(newSession(v.clientId, { service: v.service, proId: v.proId, date: d, time: v.time, dur: v.dur }))); toast(n > 1 ? n + ' agendamentos criados' : 'Agendamento criado'); }
    UI.agendaDate = v.date; save(); closeModal(); route();
  },
  'ag-pro'(el) { UI.agPro = el.dataset.v; route(); },
  'blk-new'() {
    openModal('<h2 class="h2">Bloquear horário</h2><div class="muted sm">Use para folga, almoço, curso ou qualquer horário em que você não atende. Ele some dos horários livres e do link de agendamento.</div><div class="grid3 keep" style="gap:10px"><div><label class="lb" for="bk_d">Data</label><input class="in" id="bk_d" type="date" value="' + UI.agendaDate + '"></div><div><label class="lb" for="bk_f">De</label><input class="in" id="bk_f" type="time" value="12:00"></div><div><label class="lb" for="bk_t">Até</label><input class="in" id="bk_t" type="time" value="13:00"></div></div>' +
      (multiPro() ? '<div><label class="lb" for="bk_p">Quem</label><select class="in" id="bk_p"><option value="">Todas as profissionais</option>' + activePros().map((p) => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('') + '</select></div>' : '<input type="hidden" id="bk_p" value="">') + '<div><label class="lb" for="bk_n">Motivo (opcional)</label><input class="in" id="bk_n" placeholder="Ex.: folga, curso, consulta"></div><div><label class="lb" for="bk_r">Repetir</label><select class="in" id="bk_r"><option value="0">Só neste dia</option><option value="7">Toda semana (8 vezes)</option></select></div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Cancelar</button><button class="btn" data-act="blk-save">Bloquear</button></div>');
  },
  'blk-save'() {
    const d = $('#bk_d').value, f = $('#bk_f').value, t = $('#bk_t').value; if (!d || !f || !t || mins(t) <= mins(f)) { toast('Confira a data e o horário'); return; }
    const n = Number($('#bk_r').value) ? 8 : 1; for (let i = 0; i < n; i++) S.ext.blocks.push({ id: uid(), date: addDays(d, 7 * i), from: f, to: t, proId: $('#bk_p').value, note: $('#bk_n').value.trim() });
    UI.agendaDate = d; save(); closeModal(); route(); toast('Horário bloqueado');
  },
  async 'blk-del'(el) { if (!(await confirmBox('Remover bloqueio?', 'O horário volta a ficar livre para agendamentos.', 'Remover'))) return; S.ext.blocks = S.ext.blocks.filter((b) => b.id !== el.dataset.id); save(); route({ keep: true }); }
});

/* ---------- Equipe ---------- */
async function vEquipe() {
  const [a, b] = monthRange(todayISO().slice(0, 7)); const f = finPeriod(a, b);
  const cards = pros().map((p) => { const st = f.pr[p.id] || { n: 0, v: 0, com: 0 }; return '<button class="cc" data-act="pro-edit" data-id="' + p.id + '"><span style="display:flex;gap:14px;align-items:center"><span class="av" style="width:52px;height:52px;font-size:22px;background:' + p.color + '33;color:var(--muted)">' + esc(initials(p.name)) + '</span><span style="min-width:0"><span style="display:block;font-weight:500;font-size:17px">' + esc(p.name) + '</span><span class="muted sm">' + (Number(p.commission) ? 'Comissão de ' + p.commission + '%' : 'Sem comissão') + (p.active === false ? ' · inativa' : '') + '</span></span></span><span style="border-top:1px solid var(--line);padding-top:12px;display:flex;justify-content:space-between;width:100%"><span><span class="muted sm" style="display:block">Neste mês</span><span>' + st.n + (st.n === 1 ? ' atendimento' : ' atendimentos') + '</span></span><span style="text-align:right"><span class="muted sm" style="display:block">Produção · comissão</span><span>' + fmtBRL0(st.v) + ' · ' + fmtBRL0(st.com) + '</span></span></span></button>'; }).join('');
  return { nav: 'equipe', html: head('Gestão', 'Equipe', '<button class="btn" data-act="pro-edit" data-id="">+ Nova profissional</button>') + '<div class="muted" style="max-width:640px">Cadastre quem atende no estúdio. A agenda passa a mostrar uma coluna por profissional, e o financeiro calcula a comissão de cada uma.</div><div class="grid3">' + cards + '</div>' };
}
ROUTEX.equipe = vEquipe;
Object.assign(ACTX, {
  'pro-edit'(el) {
    const p = el.dataset.id ? pro(el.dataset.id) : { id: '', name: '', color: PRO_COLORS[pros().length % PRO_COLORS.length], commission: 40, active: true }; UI.proColor = p.color;
    openModal('<h2 class="h2">' + (p.id ? 'Editar profissional' : 'Nova profissional') + '</h2><input type="hidden" id="pr_id" value="' + p.id + '"><div><label class="lb" for="pr_n">Nome</label><input class="in" id="pr_n" value="' + esc(p.name) + '" placeholder="Nome da profissional"></div><div><label class="lb" for="pr_c">Comissão sobre os atendimentos (%)</label><input class="in" id="pr_c" type="number" min="0" max="100" value="' + (p.commission || 0) + '"></div><div><div class="lb">Cor na agenda</div><div class="chips" id="pr_colors">' + PRO_COLORS.map((c) => '<button class="chip" style="width:44px;padding:0;background:' + c + ';' + (c === p.color ? 'outline:3px solid var(--ink);outline-offset:2px' : '') + '" data-act="pro-color" data-v="' + c + '" aria-label="Cor"></button>').join('') + '</div></div><label class="ck"><input type="checkbox" id="pr_a"' + (p.active !== false ? ' checked' : '') + '>Atende no estúdio (aparece na agenda)</label><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Cancelar</button><button class="btn" data-act="pro-save">Salvar</button></div>');
  },
  'pro-color'(el) { UI.proColor = el.dataset.v; [...document.querySelectorAll('#pr_colors .chip')].forEach((b) => { b.style.outline = b.dataset.v === UI.proColor ? '3px solid var(--ink)' : ''; b.style.outlineOffset = '2px'; }); },
  'pro-save'() {
    const n = $('#pr_n').value.trim(); if (!n) { toast('Informe o nome'); return; } const id = $('#pr_id').value;
    const o = { name: n, commission: Math.min(100, Math.max(0, Number($('#pr_c').value) || 0)), color: UI.proColor, active: $('#pr_a').checked };
    if (id) Object.assign(pro(id), o); else pros().push(Object.assign({ id: uid() }, o));
    if (!activePros().length) { pro(id || pros()[pros().length - 1].id).active = true; }
    save(); closeModal(); route(); toast('Equipe atualizada');
  }
});
