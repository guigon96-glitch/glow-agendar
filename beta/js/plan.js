'use strict';
/* ===== Planos: Grátis, Essencial, Pro e Studio (teste de 30 dias com tudo do Pro) ===== */
const TRIAL_DAYS = 30, APP_VERSION = '1.3 (v14)';
const SALES_WHATS = ''; // WhatsApp de vendas (preencher quando a assinatura for aberta)
const TIERS = ['free', 'ess', 'pro', 'studio'];
const PLANS = {
  free: { name: 'Grátis', m: 0, y: 0, clients: 30, pros: 1, devices: 1, for: 'Para conhecer o app' },
  ess: { name: 'Essencial', m: 24.9, y: 249, clients: Infinity, pros: 1, devices: 1, for: 'Atende sozinha e quer organização e agendamento' },
  pro: { name: 'Pro', m: 39.9, y: 399, clients: Infinity, pros: 3, devices: 2, for: 'Quer controlar estoque, pacotes e usar em 2 aparelhos' },
  studio: { name: 'Studio', m: 69.9, y: 699, clients: Infinity, pros: 5, devices: 5, for: 'Estúdio com equipe' }
};
/* recurso -> [descrição, plano mínimo] */
const FEAT = {
  cloud: ['Nuvem automática e login Google', 'ess'],
  booking: ['Link de agendamento online', 'ess'],
  sinal: ['Sinal ou pagamento por Pix no agendamento', 'ess'],
  rel: ['Lembretes e relacionamento com clientes', 'ess'],
  estoque: ['Estoque, receita de produtos e itens compartilhados', 'pro'],
  pacotes: ['Pacotes de sessões', 'pro'],
  fid: ['Programa de fidelidade', 'pro'],
  sync: ['Sincronização entre aparelhos', 'pro']
};
const PLAN_KEY = 'plan';
let PLAN = { trialStart: '', tier: 'free', until: '', test: '', tester: false };
async function planInit() {
  const p = await DB.get('kv', PLAN_KEY); PLAN = Object.assign(PLAN, p || {});
  if (!PLAN.trialStart) { PLAN.trialStart = todayISO(); await DB.put('kv', PLAN_KEY, PLAN); }
}
const planSave = () => DB.put('kv', PLAN_KEY, PLAN);
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const trialLeft = () => Math.max(0, TRIAL_DAYS - daysBetween(PLAN.trialStart || todayISO(), todayISO()));
const paidTier = () => (PLAN.tier !== 'free' && (!PLAN.until || PLAN.until >= todayISO()) ? PLAN.tier : 'free');
function effTier() { if (PLAN.test) return PLAN.test; const p = paidTier(); if (p !== 'free') return p; return trialLeft() > 0 ? 'pro' : 'free'; }
const inTrial = () => !PLAN.test && paidTier() === 'free' && trialLeft() > 0;
const tierRank = (t) => TIERS.indexOf(t);
const can = (f) => tierRank(effTier()) >= tierRank((FEAT[f] || ['', 'free'])[1]);
const planInfo = () => PLANS[effTier()];
const planLabel = () => (PLAN.test ? 'Teste: ' + PLANS[PLAN.test].name : inTrial() ? 'Teste do Pro · faltam ' + trialLeft() + (trialLeft() === 1 ? ' dia' : ' dias') : PLANS[effTier()].name);
const needName = (f) => PLANS[(FEAT[f] || ['', 'pro'])[1]].name;
async function planRefresh() {
  if (typeof cloudLinked !== 'function' || !cloudLinked()) return;
  try {
    const r = await cloudApi('plan_get', { auth: CL().auth }); if (!r.ok) return;
    PLAN.tier = r.plan === 'trial' ? 'free' : r.tier; PLAN.until = r.until || '';
    if (r.created && r.created < PLAN.trialStart && r.plan !== 'trial') PLAN.trialStart = r.created;
    if (r.plan === 'trial' && r.created) PLAN.trialStart = r.created < PLAN.trialStart ? r.created : PLAN.trialStart;
    await planSave();
  } catch (e) { /* sem conexão: vale o último plano conhecido */ }
}
const money = (v) => (v ? 'R$ ' + String(v.toFixed(2)).replace('.', ',') : 'R$ 0');
const planLimitTxt = (n) => (n === Infinity ? 'ilimitadas' : 'até ' + n);

/* ---------- avisos e bloqueios ---------- */
function upsell(f, msg) {
  const need = needName(f);
  openModal('<h2 class="h2">Disponível no plano ' + need + '</h2><div class="muted">' + esc(msg || FEAT[f][0]) + ' faz parte do plano ' + need + ' ou superior. Seu plano agora: <b>' + esc(planLabel()) + '</b>.</div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Agora não</button><button class="btn" data-act="pl-go">Ver planos</button></div>');
}
const gate = (f, msg) => { if (can(f)) return true; upsell(f, msg); return false; };
function lockedCard(f, title) {
  const need = needName(f);
  return '<div class="card stack" style="align-items:flex-start;border-color:#E5D6CE;background:#F8EEE9"><h2 class="h2">' + esc(title || FEAT[f][0]) + '</h2><div class="muted">Este recurso faz parte do plano <b>' + need + '</b> ou superior. Seu plano agora: <b>' + esc(planLabel()) + '</b>.</div><a class="btn" href="#/plano">Ver planos</a></div>';
}
function lockedView(nav, title, f) { return { nav, html: head('Plano ' + needName(f), title) + lockedCard(f, title) }; }
['estoque:estoque:Estoque', 'pacotes:pacotes:Pacotes', 'relacionamento:rel:Relacionamento'].forEach((x) => {
  const [k, f, t] = x.split(':'), orig = ROUTEX[k];
  ROUTEX[k] = async () => (can(f) ? orig() : lockedView(k, t, f));
});
(function () {
  const _aj = ajExtra; ajExtra = function (tab) { return tab === 'fid' && !can('fid') ? lockedCard('fid', 'Programa de fidelidade') : _aj(tab); }; // eslint-disable-line no-func-assign
  const _ha = homeAlerts;
  homeAlerts = function () { // eslint-disable-line no-func-assign
    const o = _ha(), l = trialLeft();
    if (inTrial() && l <= 7) o.unshift(['#/plano', 'Seu teste do plano Pro termina em ' + l + (l === 1 ? ' dia' : ' dias') + '. Veja como continuar.', 'Plano']);
    else if (!PLAN.test && effTier() === 'free' && paidTier() === 'free') o.unshift(['#/plano', 'Você está no plano Grátis (até ' + PLANS.free.clients + ' clientes, sem nuvem). Veja os planos.', 'Plano']);
    return o;
  };
  /* limites: clientes e profissionais */
  ACTX['save-client'] = function (el, e) {
    const d = UI.draft, isNew = d && !S.clients.some((c) => c.id === d.id);
    if (isNew && S.clients.length >= planInfo().clients) { upsell('cloud', 'O plano Grátis permite até ' + PLANS.free.clients + ' clientes.'); return; }
    return ACT['save-client'](el, e);
  };
  const _ps = ACTX['pro-save'];
  ACTX['pro-save'] = function (el, e) {
    const id = $('#pr_id') && $('#pr_id').value;
    if (!id && pros().length >= planInfo().pros) { upsell(planInfo().pros < 3 ? 'estoque' : 'sync', 'Seu plano permite ' + planInfo().pros + (planInfo().pros === 1 ? ' profissional' : ' profissionais') + '. Mais profissionais fazem parte do Pro (até 3) e do Studio (até 5).'); return; }
    return _ps(el, e);
  };
  const _pe = ACTX['pro-edit'];
  ACTX['pro-edit'] = function (el, e) { if (!el.dataset.id && pros().length >= planInfo().pros) { upsell('estoque', 'Seu plano permite ' + planInfo().pros + (planInfo().pros === 1 ? ' profissional' : ' profissionais') + '. Mais profissionais fazem parte do Pro (até 3) e do Studio (até 5).'); return; } return _pe(el, e); };
})();

/* ---------- tela Meu plano ---------- */
const FEATROWS = [['Agenda, fichas, termo assinado, fotos e PDF', 'free'], ['Financeiro e Pix na cobrança do atendimento', 'free'], ['Procedimentos editáveis', 'free'], ['Nuvem automática e login Google', 'ess'], ['Link de agendamento e sinal por Pix', 'ess'], ['Lembretes e relacionamento', 'ess'], ['Estoque, receita e itens compartilhados', 'pro'], ['Pacotes e fidelidade', 'pro'], ['Sincronização entre aparelhos', 'pro']];
async function vPlano() {
  const cur = effTier(), ann = !!UI.plAnn;
  const cards = TIERS.map((t) => {
    const p = PLANS[t], on = t === cur, price = t === 'free' ? 'R$ 0' : ann ? money(p.y) + '<span class="muted sm"> /ano</span>' : money(p.m) + '<span class="muted sm"> /mês</span>';
    const sub = t === 'free' ? 'Depois do teste' : ann ? 'equivale a ' + money(p.y / 12) + ' por mês · 2 meses grátis' : 'ou ' + money(p.y) + ' por ano (2 meses grátis)';
    const rows = FEATROWS.map(([l, mt]) => '<div style="display:flex;gap:8px;font-size:14px;' + (tierRank(t) >= tierRank(mt) ? '' : 'opacity:.4;text-decoration:line-through') + '"><span>' + (tierRank(t) >= tierRank(mt) ? '✓' : '–') + '</span><span>' + l + '</span></div>').join('');
    const lim = '<div class="muted sm" style="margin-top:4px">Clientes ' + planLimitTxt(p.clients) + ' · ' + p.pros + (p.pros === 1 ? ' profissional' : ' profissionais') + ' · ' + p.devices + (p.devices === 1 ? ' aparelho' : ' aparelhos') + '</div>';
    return '<div class="card stack" style="gap:8px;' + (on ? 'border:2px solid #A45F5C;background:#F3E1DC' : '') + '"><div style="display:flex;justify-content:space-between;align-items:center"><h2 class="h2" style="margin:0">' + p.name + '</h2>' + (on ? '<span class="tag">Seu plano</span>' : '') + '</div><div class="muted sm">' + p.for + '</div><div style="font:800 25px/1.1 var(--sans)">' + price + '</div><div class="muted sm">' + sub + '</div>' + rows + lim + (t === 'free' || on ? '' : '<button class="btn sm" style="margin-top:6px" data-act="pl-sub" data-v="' + t + '">Assinar ' + p.name + '</button>') + '</div>';
  }).join('');
  const tester = PLAN.tester ? '<div class="card stack" style="border-style:dashed"><h2 class="h2">Modo teste</h2><div class="muted sm">Só neste aparelho: simula cada plano para testar os bloqueios. Não altera a cobrança.</div><div class="chips">' + TIERS.map((t) => '<button class="chip ' + (PLAN.test === t ? 'on' : '') + '" data-act="pl-test" data-v="' + t + '">' + PLANS[t].name + '</button>').join('') + '<button class="chip ' + (!PLAN.test ? 'on' : '') + '" data-act="pl-test" data-v="">Plano real</button></div></div>' : '';
  const status = inTrial() ? 'Você está no teste do plano Pro, com tudo liberado. Faltam <b>' + trialLeft() + (trialLeft() === 1 ? ' dia' : ' dias') + '</b>. Depois, quem não assina continua no plano Grátis e não perde os dados.' : PLAN.test ? 'Modo teste ativo: simulando o plano <b>' + PLANS[PLAN.test].name + '</b>.' : cur === 'free' ? 'Seu teste terminou. Você está no plano Grátis: seus dados continuam aqui, mas os recursos acima do Grátis ficam bloqueados.' : 'Plano <b>' + PLANS[cur].name + '</b> ativo' + (PLAN.until ? ' até ' + fmtDate(PLAN.until) : '') + '.';
  return { nav: 'plano', html: head('Conta', 'Meu plano') + '<div class="card stack"><div class="muted">' + status + '</div><div class="chips"><button class="chip ' + (!ann ? 'on' : '') + '" data-act="pl-bill" data-v="0">Mensal</button><button class="chip ' + (ann ? 'on' : '') + '" data-act="pl-bill" data-v="1">Anual · 2 meses grátis</button></div></div><div class="grid2" style="align-items:start">' + cards + '</div>' + tester + '<div class="muted sm" style="text-align:center;margin-top:8px" data-act="pl-ver">Glow Studio · versão ' + APP_VERSION + '</div>' };
}
ROUTEX.plano = vPlano;
let _verTaps = 0;
Object.assign(ACTX, {
  'pl-go'() { closeModal(); go('#/plano'); },
  'pl-bill'(el) { UI.plAnn = el.dataset.v === '1'; route({ keep: true }); },
  'pl-sub'(el) {
    const p = PLANS[el.dataset.v], wa = digits(SALES_WHATS);
    openModal('<h2 class="h2">Assinar o plano ' + p.name + '</h2><div class="muted">A assinatura ainda não está aberta nesta versão de teste. Durante o teste, todos os recursos do Pro ficam liberados por ' + TRIAL_DAYS + ' dias.' + (wa ? ' Para contratar agora, chame no WhatsApp.' : '') + '</div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-close">Fechar</button>' + (wa ? '<button class="btn wa" data-act="pl-wa" data-v="' + el.dataset.v + '">Chamar no WhatsApp</button>' : '') + '</div>');
  },
  'pl-wa'(el) { openExternal('https://wa.me/' + waNumber(SALES_WHATS) + '?text=' + encodeURIComponent('Oi! Quero assinar o plano ' + PLANS[el.dataset.v].name + ' do Glow Studio.')); },
  'pl-ver'() { _verTaps++; clearTimeout(ACTX['pl-ver']._t); ACTX['pl-ver']._t = setTimeout(() => { _verTaps = 0; }, 2500); if (_verTaps >= 7) { _verTaps = 0; PLAN.tester = !PLAN.tester; if (!PLAN.tester) PLAN.test = ''; planSave(); toast(PLAN.tester ? 'Modo teste ligado' : 'Modo teste desligado'); route({ keep: true }); } },
  'pl-test'(el) { PLAN.test = el.dataset.v; planSave(); toast(PLAN.test ? 'Simulando: ' + PLANS[PLAN.test].name : 'Plano real'); route({ keep: true }); }
});
NAV.splice(NAV.findIndex((n) => n[0] === 'ajustes'), 0, ['plano', 'spark', 'Meu plano']);

/* ---------- boas-vindas (primeiro uso) ---------- */
function openWelcome() {
  openModal('<h2 class="h2">Bem-vinda ao Glow Studio</h2><div class="muted">Vamos configurar o seu estúdio. Você pode mudar tudo depois em Ajustes.</div><div><label class="lb" for="wl_s">Nome do estúdio</label><input class="in" id="wl_s" placeholder="Ex.: Studio Ana Souza" autocomplete="off"></div><div><label class="lb" for="wl_o">Seu nome</label><input class="in" id="wl_o" placeholder="Ex.: Ana Souza" autocomplete="off"></div><div><label class="lb" for="wl_w">Seu WhatsApp (opcional)</label><input class="in" id="wl_w" type="tel" inputmode="tel" placeholder="(11) 9 0000-0000"></div><div class="muted sm">Você tem ' + TRIAL_DAYS + ' dias com todos os recursos do plano Pro, sem cartão.</div><div class="acts" style="justify-content:space-between;flex-wrap:wrap"><button class="btn ghost" data-act="wl-google">Já tenho conta · Entrar com Google</button><button class="btn ghost" data-act="wl-demo">Ver com dados de exemplo</button><button class="btn" data-act="wl-ok">Começar</button></div>');
}
Object.assign(ACTX, {
  'wl-ok'() {
    const s = ($('#wl_s').value || '').trim(), o = ($('#wl_o').value || '').trim(), w = ($('#wl_w').value || '').trim();
    if (!s) { toast('Informe o nome do seu estúdio'); $('#wl_s').focus(); return; }
    if (!o) { toast('Informe o seu nome'); $('#wl_o').focus(); return; }
    S.settings.studio = s; S.settings.owner = o; if (w) S.settings.whats = w;
    if (S.ext.pros[0] && o) S.ext.pros[0].name = o;
    save(); closeModal(); route(); openAreasSetup();
  },
  async 'wl-google'() {
    const s0 = (($('#wl_s') || {}).value || '').trim(), o0 = (($('#wl_o') || {}).value || '').trim(), w0 = (($('#wl_w') || {}).value || '').trim();
    if (s0) S.settings.studio = s0; if (o0) S.settings.owner = o0; if (w0) S.settings.whats = w0;
    try { await googleFlow(); } catch (e) { if (e && e.message !== 'Login cancelado') toast(e.message || 'Falha no login Google'); if (!document.getElementById('wl_s')) openWelcome(); return; }
    if (!S.settings.areasSet) openAreasSetup(); else route();
  },
  async 'wl-demo'() { closeModal(); toast('Carregando exemplo…'); await loadSample(); await flush(); UI.demoTrim = true; S.settings.areasSet = false; route(); openAreasSetup(); }
});


/* ---------- primeiros passos (tela inicial) ---------- */
function stepsList() {
  const st = (S.settings.steps = S.settings.steps || {});
  return [
    ['hor', 'Conferir dias e horário de atendimento', !!st.hor, 'Define os horários livres da agenda e do link', '#/ajustes', 'hor'],
    ['pre', 'Conferir os preços dos procedimentos', !!st.pre, 'Aparecem na cobrança, no financeiro e no link', '#/ajustes', 'hor'],
    ['cli', 'Cadastrar a primeira cliente', S.clients.length > 0, 'Ou importe do exemplo em Ajustes', '#/clientes/novo', null],
    ['lnk', 'Ativar o link de agendamento', !!(S.settings.booking && S.settings.booking.on && typeof cloudOn === 'function' && cloudOn()), 'Em Ajustes > Nuvem. Vale para Instagram e WhatsApp', '#/ajustes', 'nuv'],
    ['pix', 'Cadastrar sua chave Pix (opcional)', !!(typeof pixReady === 'function' && pixReady() && pixCfg().mode !== 'off'), 'Para cobrar sinal ou valor adiantado, com desconto se quiser', '#/ajustes', 'pix']
  ];
}
(function () {
  const _v = vInicio;
  vInicio = async function () { // eslint-disable-line no-func-assign
    const r = await _v(); if (!r || !r.html || S.settings.stepsHide) return r;
    const L = stepsList(), n = L.filter((x) => x[2]).length; if (n === L.length) return r;
    const card = '<div class="card stack" style="gap:6px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2 class="h2" style="margin:0">Primeiros passos <span class="muted sm">· ' + n + ' de ' + L.length + '</span></h2><button class="btn ghost sm" data-act="steps-hide">Ocultar</button></div>' +
      L.map((x) => '<a href="' + x[4] + '" data-act="step-go" data-k="' + x[0] + '" data-tab="' + (x[5] || '') + '" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #EFE4DD;text-decoration:none;color:inherit"><span style="width:24px;height:24px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:' + (x[2] ? 'var(--sage)' : 'var(--blush)') + ';color:' + (x[2] ? '#3E6B47' : 'var(--rose-d)') + ';font-weight:700">' + (x[2] ? '✓' : '') + '</span><span style="flex:1"><span style="font-weight:500;' + (x[2] ? 'text-decoration:line-through;opacity:.6' : '') + '">' + esc(x[1]) + '</span><br><span class="muted sm">' + esc(x[3]) + '</span></span></a>').join('') + '</div>';
    const i = topAt(r.html); r.html = r.html.slice(0, i) + card + r.html.slice(i); return r;
  };
  Object.assign(ACTX, {
    'steps-hide'() { S.settings.stepsHide = true; save(); route(); },
    'step-go'(el) { const k = el.dataset.k; S.settings.steps = S.settings.steps || {}; if (k === 'hor' || k === 'pre') S.settings.steps[k] = true; if (el.dataset.tab) UI.ajTab = el.dataset.tab; save(); }
  });
})();
