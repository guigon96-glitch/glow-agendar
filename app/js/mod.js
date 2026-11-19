'use strict';
/* ===== Módulos de gestão: equipe, preços, caixa, estoque, pacotes, fidelização, mensagens, horários ===== */
const ACTX = {}, ROUTEX = {}; // ações e rotas extras (usadas por main.js)
const PAYM = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência'];
const EXP_CATS = ['Produtos', 'Aluguel', 'Equipamentos', 'Marketing', 'Impostos e taxas', 'Outros'];
const PRO_COLORS = ['#C98A83', '#8FA98F', '#C9AE86', '#9AA7C7', '#B79BC4', '#D6A27E'];
const DEFAULT_PRICE = { cilios: 180, lifting: 160, design: 55, henna: 75, gel: 220, esmalt: 70, blind: 110, corte: 120, color: 280, mechas: 650, tratam: 130, social: 150, noiva: 450, festa: 190, depil: 60, limpeza: 160, peeling: 190 };
const HOURS_DEFAULT = () => ({ open: '09:00', close: '19:00', days: [1, 2, 3, 4, 5, 6], step: 30, lunchFrom: '', lunchTo: '' });
const AREA_EX = { // exemplos de preenchimento conforme a primeira área escolhida
  cilios: { svc: 'Volume russo, Mega volume, Remoção de extensão', mat: 'fios 0,10 C · cola · primer', prod: 'Cola para cílios 5 ml', exp: 'fios e cola', pkg: 'Manutenção de cílios · 3 sessões' },
  sobrancelhas: { svc: 'Design com henna, Brow lamination, Micropigmentação', mat: 'henna castanha · linha · tom 3', prod: 'Henna castanha 10 g', exp: 'henna e linha', pkg: '4 sessões de design' },
  unhas: { svc: 'Banho de gel, Esmaltação em gel, Spa dos pés', mat: 'gel construtor nude · molde F1', prod: 'Gel construtor nude 30 g', exp: 'gel construtor', pkg: '4 manutenções de gel' },
  cabelo: { svc: 'Escova modelada, Botox capilar, Corte feminino', mat: 'tom 7.3 · oxidante 20 vol · matizador', prod: 'Pó descolorante 500 g', exp: 'coloração e oxidante', pkg: '3 hidratações' },
  maquiagem: { svc: 'Maquiagem social, Make de noiva, Aula de automaquiagem', mat: 'base tom 40 · cílios fio a fio', prod: 'Base líquida tom 40', exp: 'bases e pincéis', pkg: '2 sessões de maquiagem' },
  estetica: { svc: 'Limpeza de pele, Drenagem linfática, Depilação', mat: 'cera quente · máscara calmante', prod: 'Cera quente 1 kg', exp: 'cera e descartáveis', pkg: '6 sessões de depilação' }
};
const exFor = (k, area) => { const a = AREA_EX[area] ? area : ((typeof activeAreas === 'function' && S && S.settings ? activeAreas() : []).find((x) => AREA_EX[x]) || 'unhas'); return AREA_EX[a][k]; };
const AREA_REWARD = { cilios: 'Sérum para cílios de cortesia', sobrancelhas: 'Design de sobrancelhas de cortesia', unhas: 'Esmaltação em gel de cortesia', cabelo: 'Hidratação de cortesia', maquiagem: 'Retoque de maquiagem de cortesia', estetica: 'Limpeza de pele express de cortesia' };
const OLD_REWARDS = '10% de desconto no próximo atendimento|Esmaltação em gel de cortesia|Hidratação de cortesia';
function rewardsFor(areas) { // prêmios sugeridos conforme as áreas que a profissional atende
  const a = (areas || []).filter((k) => AREA_REWARD[k]), r = [{ id: 'r1', name: '10% de desconto no próximo atendimento', pts: 300 }];
  r.push({ id: 'r2', name: a[0] ? AREA_REWARD[a[0]] : 'Brinde de cortesia', pts: 600 }); r.push({ id: 'r3', name: a[1] ? AREA_REWARD[a[1]] : '30% de desconto em um procedimento', pts: 900 }); return r;
}
const LOYALTY_DEFAULT = () => ({ on: true, per: 1, birthday: '10% de desconto no mês do seu aniversário', custom: false, rewards: rewardsFor(typeof activeAreas === 'function' && S && S.settings ? activeAreas() : []) });
const TPL_DEFAULT = {
  lembrete: 'Oi, {nome}! Passando para lembrar do seu horário {quando}, {data} às {hora} ({procedimento}) no {estudio}. Posso confirmar sua presença? Se precisar remarcar, é só me avisar por aqui 💗',
  manutencao: 'Oi, {nome}! Já está chegando a hora da sua manutenção de {procedimento} ({manutencao}). Tenho horários livres esta semana, quer que eu reserve um para você? {link}',
  aniversario: 'Parabéns, {nome}! 🎉 Que seu novo ciclo seja lindo! Como presente, preparei um mimo para você no {estudio}: {presente}. Me chama para agendar! {link}',
  inativa: 'Oi, {nome}, quanto tempo! Sentimos sua falta no {estudio}. Que tal voltar a se cuidar? Tenho horários nesta semana. {link}',
  posvenda: 'Oi, {nome}! Como está o resultado do seu procedimento ({procedimento})? Se puder, me conte e deixe uma avaliação, ajuda muito o meu trabalho! {avaliacao}',
  confirmacao: 'Oi, {nome}! Seu horário está confirmado: {data} às {hora} ({procedimento}). Te espero no {estudio}! 💗'
};
const EXT_DEFAULT = () => ({ pros: [], products: [], packages: [], cpk: [], expenses: [], sales: [], blocks: [], redeemed: [], log: {}, bookings: [], cloud: {}, svc: {}, recipe: {} });

/* ---------- formatação ---------- */
const fmtBRL = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtBRL0 = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ymOf = (s) => s.slice(0, 7);
const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return MESL[m - 1].replace(/^./, (c) => c.toUpperCase()) + ' de ' + y; };
const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const monthRange = (ym) => { const [y, m] = ym.split('-').map(Number); return [ym + '-01', ym + '-' + pad(new Date(y, m, 0).getDate())]; };
const inRange = (d, a, b) => d >= a && d <= b;

/* ---------- equipe ---------- */
function ensureExt() {
  S.ext = Object.assign(EXT_DEFAULT(), S.ext || {});
  if (!S.ext.pros.length) S.ext.pros.push({ id: 'pro0', name: S.settings.owner || 'Profissional', color: PRO_COLORS[0], commission: 0, active: true });
  if (typeof applySvc === 'function') applySvc();
  S.settings.prices = S.settings.prices || {}; S.settings.hours = Object.assign(HOURS_DEFAULT(), S.settings.hours || {});
  S.settings.loyalty = Object.assign(LOYALTY_DEFAULT(), S.settings.loyalty || {});
  if (!S.settings.loyalty.custom && (S.settings.loyalty.rewards || []).map((x) => x.name).join('|') === OLD_REWARDS && S.settings.areasSet) S.settings.loyalty.rewards = rewardsFor(activeAreas()); // ajusta o padrão antigo às áreas
  S.settings.tpl = Object.assign({}, TPL_DEFAULT, S.settings.tpl || {});
  S.settings.booking = Object.assign({ on: false, url: 'https://glow-agenda.pages.dev', slug: '', auto: false, advance: 60, minHours: 2, review: '' }, S.settings.booking || {});
  if (/guigon96-glitch\.github\.io\/glow-agendar/.test(S.settings.booking.url || '')) S.settings.booking.url = 'https://glow-agenda.pages.dev'; // endereço antigo da página -> novo
}
const pros = () => S.ext.pros;
const activePros = () => S.ext.pros.filter((p) => p.active !== false);
const pro = (id) => S.ext.pros.find((p) => p.id === id);
const proOf = (s) => pro(s.proId) || S.ext.pros[0];
const proColor = (id) => (pro(id) || S.ext.pros[0] || {}).color || PRO_COLORS[0];
const multiPro = () => activePros().length > 1;

/* ---------- situação do atendimento ---------- */
const isOff = (s) => s.status === 'cancelado' || s.status === 'faltou';
const isOpenSess = (s) => s.status === 'agendado' || s.status === 'andamento';
const STATUS_TXT = { agendado: 'Agendado', andamento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado', faltou: 'Faltou' };

/* ---------- preços e cobrança ---------- */
const priceOf = (svc) => { const v = S.settings.prices && S.settings.prices[svc]; return v != null && v !== '' ? Number(v) || 0 : (DEFAULT_PRICE[svc] || 0); };
const sessGross = (s) => (s.price != null && s.price !== '' ? Number(s.price) || 0 : priceOf(s.service));
const sessNet = (s) => Math.max(0, round2(sessGross(s) - (Number(s.discount) || 0)));
const cpkOf = (id) => S.ext.cpk.find((x) => x.id === id);
const pkgUnit = (s) => { const k = cpkOf(s.pkgUseId); return k && k.total ? round2(k.price / k.total) : 0; };
const sessBase = (s) => (s.pkgUseId ? pkgUnit(s) : sessNet(s)); // valor do serviço prestado (comissão e ranking)
const isPaid = (s) => !!(s.pkgUseId || (s.pay && s.pay.paid));
const cashIn = (s) => (s.pkgUseId || !(s.pay && s.pay.paid) ? 0 : sessNet(s)); // dinheiro recebido por este atendimento
const receivables = () => S.sessions.filter((s) => s.status === 'concluido' && !isPaid(s) && sessNet(s) > 0);
function markPaid(s, method, at) { s.pay = { paid: true, method: method || (s.pay && s.pay.method) || 'Pix', at: at || todayISO() }; }

function finPeriod(a, b) {
  const income = [];
  S.sessions.forEach((s) => { if (s.status === 'concluido' && cashIn(s) > 0 && s.pay && inRange(s.pay.at || s.date, a, b)) income.push({ date: s.pay.at || s.date, value: cashIn(s), method: s.pay.method || 'Pix', kind: 'Atendimento', label: (client(s.clientId) || { name: '?' }).name + ' · ' + SERVICES[s.service].name, s }); });
  S.ext.sales.forEach((x) => { if (inRange(x.date, a, b)) income.push({ date: x.date, value: x.value, method: x.method || 'Pix', kind: x.kind || 'Pacote', label: (client(x.clientId) || { name: '?' }).name + ' · ' + x.desc, sale: x }); });
  const exp = S.ext.expenses.filter((x) => inRange(x.date, a, b));
  const sum = (l) => round2(l.reduce((n, x) => n + x.value, 0));
  const byMethod = {}; income.forEach((i) => { byMethod[i.method] = round2((byMethod[i.method] || 0) + i.value); });
  const svc = {}, pr = {};
  S.sessions.forEach((s) => {
    if (s.status !== 'concluido' || !inRange(s.date, a, b)) return;
    const v = sessBase(s); const k = SERVICES[s.service].name; svc[k] = svc[k] || { n: 0, v: 0 }; svc[k].n++; svc[k].v = round2(svc[k].v + v);
    const p = proOf(s); if (p) { pr[p.id] = pr[p.id] || { n: 0, v: 0, com: 0 }; pr[p.id].n++; pr[p.id].v = round2(pr[p.id].v + v); pr[p.id].com = round2(pr[p.id].com + v * (Number(p.commission) || 0) / 100); }
  });
  const totalIn = sum(income), totalOut = sum(exp), com = round2(Object.values(pr).reduce((n, x) => n + x.com, 0));
  return { income: income.sort((x, y) => y.date.localeCompare(x.date)), exp: exp.slice().sort((x, y) => y.date.localeCompare(x.date)), totalIn, totalOut, com, profit: round2(totalIn - totalOut - com), byMethod, svc, pr, n: S.sessions.filter((s) => s.status === 'concluido' && inRange(s.date, a, b)).length };
}
const clientSpent = (cid) => round2(S.sessions.filter((s) => s.clientId === cid).reduce((n, s) => n + cashIn(s), 0) + S.ext.sales.filter((x) => x.clientId === cid).reduce((n, x) => n + x.value, 0));

/* ---------- estoque ---------- */
const prod = (id) => S.ext.products.find((p) => p.id === id);
const lowStock = () => S.ext.products.filter((p) => p.active !== false && Number(p.qty) <= Number(p.min));
function applyStock(s) {
  (s.stockApplied || []).forEach((u) => { const p = prod(u.pid); if (p) p.qty = round2(p.qty + u.qty); });
  s.stockApplied = [];
  const own = (s.use || []).filter((u) => { const p = prod(u.pid); return !(p && p.shared); });
  if (s.status === 'concluido') { own.forEach((u) => { const p = prod(u.pid); if (p) p.qty = round2(p.qty - u.qty); }); s.stockApplied = JSON.parse(JSON.stringify(own)); }
  applyShared(s);
}
/* itens compartilhados (cola, removedor...): contam usos; a unidade só baixa quando acaba */
function applyShared(s) {
  const want = s.status === 'concluido' ? (s.use || []).filter((u) => { const p = prod(u.pid); return p && p.shared; }).map((u) => u.pid) : [];
  const have = s.sharedApplied || [];
  have.forEach((h) => { if (!want.includes(h.pid)) { const p = prod(h.pid); if (p && (p.epoch || 0) === h.e) p.uses = Math.max(0, (p.uses || 0) - 1); } });
  const keep = have.filter((h) => want.includes(h.pid));
  want.forEach((pid) => { if (!keep.some((h) => h.pid === pid)) { const p = prod(pid); p.uses = (p.uses || 0) + 1; keep.push({ pid, e: p.epoch || 0 }); } });
  s.sharedApplied = keep;
}
const yieldOf = (p) => { const h = (p.hist || []).slice(-5).filter((x) => x > 0); return h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : Number(p.yield) || 0; };
const unitCost = (p, qty) => (p.shared ? (Number(p.cost) || 0) / (yieldOf(p) || 20) : (Number(p.cost) || 0) * (Number(qty) || 0));
const costOf = (s) => round2((s.use || []).reduce((n, u) => { const p = prod(u.pid); return n + (p ? unitCost(p, u.qty) : 0); }, 0));

/* ---------- pacotes ---------- */
const activePkgs = (cid, svc) => { const t = todayISO(); return S.ext.cpk.filter((k) => k.clientId === cid && k.used < k.total && k.expires >= t && (!svc || k.svc === svc)); };
function sellPackage(cid, pkgId, method) {
  const pk = S.ext.packages.find((x) => x.id === pkgId); if (!pk) return null;
  const k = { id: uid(), clientId: cid, pkgId, name: pk.name, svc: pk.svc, total: pk.sessions, used: 0, price: pk.price, bought: todayISO(), expires: addDays(todayISO(), pk.validDays || 180), sessions: [] };
  S.ext.cpk.push(k); S.ext.sales.push({ id: uid(), date: todayISO(), clientId: cid, cpkId: k.id, value: pk.price, method: method || 'Pix', kind: 'Pacote', desc: 'Pacote ' + pk.name }); return k;
}
function syncPkg(s) {
  if (s.pkgDebited && s.pkgDebited !== s.pkgUseId) { const o = cpkOf(s.pkgDebited); if (o) { o.used = Math.max(0, o.used - 1); o.sessions = o.sessions.filter((x) => x !== s.id); } s.pkgDebited = null; }
  if (s.pkgUseId && !s.pkgDebited && s.status === 'concluido') { const k = cpkOf(s.pkgUseId); if (k) { k.used++; k.sessions.push(s.id); s.pkgDebited = k.id; } }
}
function releaseSession(s) { s.status = 'cancelado'; applyStock(s); s.pkgUseId = null; syncPkg(s); }

/* ---------- fidelização ---------- */
const lo = () => S.settings.loyalty;
const ptsEarned = (cid) => lo().on ? Math.floor(clientSpent(cid) * (Number(lo().per) || 0)) : 0;
const ptsUsed = (cid) => S.ext.redeemed.filter((r) => r.clientId === cid).reduce((n, r) => n + r.pts, 0);
const ptsBalance = (cid) => ptsEarned(cid) - ptsUsed(cid);
const visits = (cid) => S.sessions.filter((s) => s.clientId === cid && s.status === 'concluido').length;

/* ---------- mensagens e filas de relacionamento ---------- */
const bookingUrl = () => (S.settings.booking.url || '').replace(/\/$/, '') && S.settings.booking.slug ? S.settings.booking.url.replace(/\/$/, '') + '/?e=' + encodeURIComponent(S.settings.booking.slug) : '';
function fillTpl(key, v) {
  const m = Object.assign({ estudio: S.settings.studio, link: bookingUrl(), avaliacao: S.settings.booking.review || '', presente: lo().birthday }, v);
  return (S.settings.tpl[key] || TPL_DEFAULT[key]).replace(/\{(\w+)\}/g, (_, k) => (m[k] != null ? m[k] : '')).replace(/[ \t]+\n/g, '\n').replace(/ +$/g, '').trim();
}
const logged = (key) => S.ext.log[key];
function sendTo(phone, text, key) {
  const n = waNumber(phone); if (!n) { toast('Cadastre o WhatsApp da cliente'); return false; }
  openExternal('https://wa.me/' + n + '?text=' + encodeURIComponent(text)); if (key) { S.ext.log[key] = todayISO(); save(); } return true;
}
const sessVars = (s) => { const c = client(s.clientId) || { name: '' }; const t = todayISO(); return { nome: (c.name || '').split(' ')[0], data: fmtDate(s.date).slice(0, 6) + ' (' + DIAL[parseISO(s.date).getDay()].split('-')[0] + ')', hora: s.time, procedimento: procTitle(s).toLowerCase(), quando: s.date === t ? 'de hoje' : s.date === addDays(t, 1) ? 'de amanhã' : '', manutencao: SERVICES[s.service].nextTxt }; };
function queueReminders() {
  const t = todayISO(), t2 = addDays(t, 1), nw = new Date(), nowM = nw.getHours() * 60 + nw.getMinutes();
  return S.sessions.filter((s) => s.status === 'agendado' && ((s.date === t && mins(s.time) > nowM + 30) || s.date === t2)).sort(sortSessions).map((s) => ({ s, c: client(s.clientId), key: 'lem:' + s.id + ':' + s.date + s.time, text: fillTpl('lembrete', sessVars(s)) })).filter((x) => x.c);
}
function queueReturns() {
  return returnsList().filter((r) => r.diff <= 7).map((r) => ({ c: r.c, key: 'man:' + r.c.id + ':' + r.last.id, info: SERVICES[r.last.service].name + ' · ' + diffTxt(r.diff), text: fillTpl('manutencao', Object.assign(sessVars(r.last), { nome: r.c.name.split(' ')[0] })) }));
}
function queueBirthdays() {
  const t = parseISO(todayISO()), out = [];
  S.clients.forEach((c) => {
    if (!c.birth) return; const b = parseISO(c.birth); let n = new Date(t.getFullYear(), b.getMonth(), b.getDate()); if (n < t) n = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    const diff = Math.round((n - t) / 864e5); if (diff <= 7) out.push({ c, diff, key: 'niv:' + c.id + ':' + n.getFullYear(), info: diff === 0 ? 'aniversário hoje' : 'aniversário em ' + diff + (diff === 1 ? ' dia' : ' dias'), text: fillTpl('aniversario', { nome: c.name.split(' ')[0] }) });
  });
  return out.sort((a, b) => a.diff - b.diff);
}
function queueInactive(days) {
  const t = todayISO(), out = []; days = days || 60;
  S.clients.forEach((c) => {
    const last = clientSessions(c.id).find((x) => x.status === 'concluido'); if (!last) return;
    if (S.sessions.some((x) => x.clientId === c.id && isOpenSess(x) && x.date >= t)) return;
    const ago = Math.round((parseISO(t) - parseISO(last.date)) / 864e5); if (ago >= days) out.push({ c, ago, key: 'ina:' + c.id + ':' + last.id, info: 'última visita há ' + ago + ' dias · ' + SERVICES[last.service].name, text: fillTpl('inativa', { nome: c.name.split(' ')[0] }) });
  });
  return out.sort((a, b) => b.ago - a.ago);
}
function queuePosvenda() {
  const t = todayISO();
  return S.sessions.filter((s) => s.status === 'concluido' && s.date >= addDays(t, -3) && s.date < t).sort(sortSessions).reverse().map((s) => ({ s, c: client(s.clientId), key: 'pos:' + s.id, info: SERVICES[s.service].name + ' · ' + fmtDate(s.date), text: fillTpl('posvenda', sessVars(s)) })).filter((x) => x.c);
}

/* ---------- horários, bloqueios, conflitos ---------- */
const HRS = () => S.settings.hours;
function dayOpen(date) { const h = HRS(); return h.days.includes(parseISO(date).getDay()); }
function busyOf(date, proId, ignoreId) {
  const out = []; const h = HRS();
  S.sessions.forEach((s) => { if (s.date !== date || s.id === ignoreId || isOff(s)) return; if (proId && (proOf(s) || {}).id !== proId) return; out.push([mins(s.time), mins(s.time) + (s.dur || 30)]); });
  S.ext.blocks.forEach((b) => { if (b.date !== date) return; if (proId && b.proId && b.proId !== proId) return; out.push([mins(b.from), mins(b.to)]); });
  if (h.lunchFrom && h.lunchTo) out.push([mins(h.lunchFrom), mins(h.lunchTo)]);
  return out;
}
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1];
function hasConflict(date, time, dur, proId, ignoreId) { const iv = [mins(time), mins(time) + dur]; return busyOf(date, proId, ignoreId).some((b) => overlaps(iv, b)); }
function freeSlots(date, dur, proId, ignoreId) {
  const h = HRS(), out = []; if (!dayOpen(date)) return out;
  const busy = busyOf(date, proId, ignoreId), step = Number(h.step) || 30, now = new Date(), isToday = date === todayISO(), nowM = now.getHours() * 60 + now.getMinutes();
  for (let m = mins(h.open); m + dur <= mins(h.close); m += step) { if (isToday && m < nowM) continue; if (!busy.some((b) => overlaps([m, m + dur], b))) out.push(hhmm(m)); }
  return out;
}

/* ---------- alertas da tela inicial ---------- */
function homeAlerts() {
  const out = [], t = todayISO();
  const rem = queueReminders().filter((x) => !logged(x.key) && x.s.date !== t).length; if (rem) out.push(['#/relacionamento', rem + (rem === 1 ? ' lembrete de horário para enviar' : ' lembretes de horário para enviar'), 'Amanhã']);
  const bk = S.ext.bookings.filter((b) => b.status === 'pendente').length; if (bk) out.push(['#/agenda', bk + (bk === 1 ? ' pedido de agendamento online' : ' pedidos de agendamento online'), 'Confirmar']);
  const low = lowStock().length; if (low) out.push(['#/estoque', low + (low === 1 ? ' produto com estoque baixo' : ' produtos com estoque baixo'), 'Estoque']);
  const rc = receivables().length; if (rc) out.push(['#/financeiro', rc + (rc === 1 ? ' atendimento sem pagamento registrado' : ' atendimentos sem pagamento registrado') + ' · ' + fmtBRL0(receivables().reduce((n, s) => n + sessNet(s), 0)), 'A receber']);
  const bd = queueBirthdays().filter((x) => x.diff <= 2).length; if (bd) out.push(['#/relacionamento', bd + (bd === 1 ? ' aniversariante' : ' aniversariantes') + ' nos próximos dias', 'Aniversário']);
  const pk = S.ext.cpk.filter((k) => k.used < k.total && k.expires >= t && k.expires <= addDays(t, 15)).length; if (pk) out.push(['#/pacotes', pk + (pk === 1 ? ' pacote vence' : ' pacotes vencem') + ' em até 15 dias', 'Pacotes']);
  return out;
}

/* ---------- dados de exemplo dos módulos de gestão ---------- */
function loadSampleExt() {
  const t = todayISO(), tm = addDays(t, 1);
  S.ext = null; ensureExt();
  S.ext.pros = [{ id: 'pro0', name: S.settings.owner || 'Bia Martins', color: PRO_COLORS[0], commission: 0, active: true }, { id: 'pro1', name: 'Camila Rocha', color: PRO_COLORS[1], commission: 40, active: true }, { id: 'pro2', name: 'Renata Dias', color: PRO_COLORS[2], commission: 40, active: true }];
  const areaPro = { unhas: 'pro1', cabelo: 'pro2' };
  S.sessions.forEach((s) => { s.proId = areaPro[SERVICES[s.service].area] || 'pro0'; });
  // pacotes à venda e vendidos
  S.ext.packages = [{ id: 'pk1', name: '6 sessões de depilação', svc: 'depil', sessions: 6, price: 300, validDays: 180 }, { id: 'pk2', name: 'Manutenção de cílios · 3 sessões', svc: 'cilios', sessions: 3, price: 480, validDays: 90 }, { id: 'pk3', name: '4 hidratações capilares', svc: 'tratam', sessions: 4, price: 440, validDays: 120 }, { id: 'pk4', name: 'Esmaltação em gel · 4 sessões', svc: 'esmalt', sessions: 4, price: 250, validDays: 90 }];
  const byName = (n) => S.clients.find((c) => c.name === n);
  const al = byName('Aline Barros'), ana = byName('Ana Beatriz Lima');
  if (al) { const k = sellPackage(al.id, 'pk1', 'Pix'); k.bought = addDays(t, -20); k.expires = addDays(t, 160); k.used = 2; S.ext.sales[S.ext.sales.length - 1].date = addDays(t, -20); const sd = S.sessions.find((s) => s.clientId === al.id && s.status === 'agendado'); if (sd) { sd.pkgUseId = k.id; } }
  if (ana) { const k = sellPackage(ana.id, 'pk2', 'Cartão de crédito'); k.bought = addDays(t, -30); k.expires = addDays(t, 60); k.used = 1; S.ext.sales[S.ext.sales.length - 1].date = addDays(t, -30); }
  // pagamentos: tudo pago, exceto os 3 atendimentos mais recentes concluídos
  const done = S.sessions.filter((s) => s.status === 'concluido').sort(sortSessions);
  done.forEach((s, i) => { if (i >= done.length - 3) return; markPaid(s, PAYM[(i * 3 + 1) % 4], s.date); });
  // produtos usados em alguns atendimentos
  S.ext.products = [{ id: 'pd1', name: 'Gel construtor nude', unit: 'pote 30 g', qty: 6, min: 2, cost: 38, area: 'unhas' }, { id: 'pd2', name: 'Esmalte em gel (cores variadas)', unit: 'frasco', qty: 14, min: 4, cost: 22, area: 'unhas' }, { id: 'pd3', name: 'Cola para extensão de cílios', unit: 'frasco', qty: 3, min: 2, cost: 48, area: 'cilios', shared: true, yield: 40, uses: 12, hist: [38, 41, 40], epoch: 3 }, { id: 'pd4', name: 'Fios fio a fio C 0,10', unit: 'cartela', qty: 9, min: 3, cost: 24, area: 'cilios' }, { id: 'pd5', name: 'Coloração 8.3 louro dourado', unit: 'tubo', qty: 5, min: 2, cost: 28, area: 'cabelo' }, { id: 'pd6', name: 'Cera quente', unit: 'kg', qty: 3, min: 1, cost: 42, area: 'estetica' }, { id: 'pd7', name: 'Henna para sobrancelhas', unit: 'pote', qty: 4, min: 2, cost: 19, area: 'sobrancelhas' }, { id: 'pd8', name: 'Máscara calmante facial', unit: 'unidade', qty: 2, min: 2, cost: 35, area: 'estetica' }];
  const gel = S.sessions.find((s) => s.service === 'gel' && s.status === 'concluido'); if (gel) { gel.use = [{ pid: 'pd1', qty: 1 }, { pid: 'pd2', qty: 1 }]; }
  const cil = S.sessions.find((s) => s.service === 'cilios' && s.status === 'concluido'); if (cil) { cil.use = [{ pid: 'pd4', qty: 1 }, { pid: 'pd3', qty: 1 }]; cil.sharedApplied = [{ pid: 'pd3', e: 3 }]; }
  S.ext.recipe = { cilios: [{ pid: 'pd4', qty: 1 }, { pid: 'pd3', qty: 1 }], lifting: [{ pid: 'pd3', qty: 1 }], gel: [{ pid: 'pd1', qty: 1 }, { pid: 'pd2', qty: 1 }], henna: [{ pid: 'pd7', qty: 1 }], depil: [{ pid: 'pd6', qty: 0.1 }], color: [{ pid: 'pd5', qty: 2 }] };
  // despesas dos últimos 3 meses
  const ex = [];
  for (let i = 0; i <= 2; i++) { const m = shiftMonth(t.slice(0, 7), -i); ex.push([m + '-05', 'Aluguel da sala', 'Aluguel', 450], [m + '-10', 'Reposição de produtos', 'Produtos', 180 + i * 20], [m + '-15', 'Anúncios no Instagram', 'Marketing', 80]); }
  S.ext.expenses = ex.filter((e) => e[0] <= t).map((e) => ({ id: uid(), date: e[0], desc: e[1], cat: e[2], value: e[3] }));
  // aniversários, cliente inativa e agenda de amanhã (lembretes)
  const bd = (n, days) => { const c = byName(n); if (c) { const d = parseISO(addDays(t, days)); c.birth = (1992 + days) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); } };
  bd('Isabela Moraes', 2); bd('Patrícia Nunes', 5); bd('Fernanda Duarte', 40);
  const lu = Object.assign({ id: uid(), name: 'Luana Prates', phone: '(11) 9 9611-2480', birth: '', email: '', insta: '', city: '', origin: 'Instagram', notes: '', anam: {}, termo: { aceite: true, fotos: true, divulgacao: false }, created: addDays(t, -200) });
  S.clients.push(lu); S.sessions.push(Object.assign(newSession(lu.id, { date: addDays(t, -75), time: '10:00', dur: 90, service: 'corte', status: 'concluido', proId: 'pro2' }), { pay: { paid: true, method: 'Pix', at: addDays(t, -75) } }));
  [['Camila Ferreira', 'design', '10:00', 'pro0'], ['Mariana Costa', 'lifting', '14:00', 'pro0'], ['Patrícia Nunes', 'esmalt', '11:00', 'pro1'], ['Vanessa Lopes', 'corte', '15:30', 'pro2']].forEach(([n, sv, h, p]) => { const c = byName(n); if (c) S.sessions.push(newSession(c.id, { date: tm, time: h, dur: SERVICES[sv].dur, service: sv, proId: p, confirmed: n === 'Camila Ferreira' })); });
  S.ext.blocks.push({ id: uid(), date: tm, from: '16:30', to: '18:30', proId: 'pro0', note: 'Curso' });
  S.ext.bookings = [{ id: 'bk_demo', status: 'pendente', name: 'Larissa Mendes', phone: '(11) 9 9000-0000', service: 'design', date: addDays(t, 2), time: '09:30', proId: 'pro0', created: t, demo: true }];
  S.settings.hours.lunchFrom = ''; 
}


/* ---------- exemplo só com as áreas escolhidas ---------- */
function trimSampleToAreas(areas) {
  const inA = (k) => SERVICES[k] && areas.includes(SERVICES[k].area);
  S.sessions = S.sessions.filter((s) => inA(s.service));
  const keepC = new Set(S.sessions.map((s) => s.clientId)); S.clients = S.clients.filter((c) => keepC.has(c.id));
  const E = S.ext;
  E.packages = E.packages.filter((p) => inA(p.svc)); const pk = new Set(E.packages.map((p) => p.id));
  E.cpk = E.cpk.filter((k) => pk.has(k.pkgId) && keepC.has(k.clientId)); const ck = new Set(E.cpk.map((k) => k.id));
  E.sales = E.sales.filter((x) => (!x.clientId || keepC.has(x.clientId)) && (!x.cpkId || ck.has(x.cpkId)));
  E.products = E.products.filter((p) => !p.area || areas.includes(p.area)); const pp = new Set(E.products.map((p) => p.id));
  Object.keys(E.recipe).forEach((k) => { if (!inA(k)) delete E.recipe[k]; else E.recipe[k] = E.recipe[k].filter((r) => pp.has(r.pid)); });
  S.sessions.forEach((s) => { if (s.use) s.use = s.use.filter((u) => pp.has(u.pid)); if (s.sharedApplied) s.sharedApplied = s.sharedApplied.filter((u) => pp.has(u.pid)); });
  const usedPro = new Set(S.sessions.map((s) => s.proId)); E.pros = E.pros.filter((p) => p.id === 'pro0' || usedPro.has(p.id));
  S.sessions.forEach((s) => { if (!E.pros.some((p) => p.id === s.proId)) s.proId = 'pro0'; });
  E.redeemed = (E.redeemed || []).filter((r) => keepC.has(r.clientId)); save();
}
