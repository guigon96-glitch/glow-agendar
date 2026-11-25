'use strict';
/* ===== Procedimentos editáveis, receita de produtos e itens compartilhados ===== */
const SERVICES_BASE = JSON.parse(JSON.stringify(SERVICES));
const ANGLES_BY_AREA = { cilios: ['od', 'oe'], sobrancelhas: ['sob'], unhas: ['maos'], cabelo: ['cab'], maquiagem: ['rosto'], estetica: ['reg'] };

/* aplica na tabela SERVICES o que a profissional editou ou criou (S.ext.svc) */
function applySvc() {
  Object.keys(SERVICES).forEach((k) => { if (SERVICES_BASE[k]) SERVICES[k] = JSON.parse(JSON.stringify(SERVICES_BASE[k])); else delete SERVICES[k]; });
  const o = (S.ext && S.ext.svc) || {};
  Object.keys(o).forEach((k) => {
    const v = o[k], nx = Number(v.next) > 0 ? Number(v.next) : 0;
    if (SERVICES_BASE[k]) {
      const b = SERVICES[k]; if (v.name) b.name = v.name; if (Number(v.dur) > 0) b.dur = Number(v.dur);
      if (nx) { b.next = nx; b.nextTxt = 'em ' + nx + ' dias'; }
    } else if (v.custom && AREAS[v.area]) {
      const ag = ANGLES_BY_AREA[v.area] || ['cab'];
      SERVICES[k] = { area: v.area, name: v.name || 'Procedimento', short: AREAS[v.area].name, dur: Number(v.dur) || 60, next: nx || 30, nextTxt: 'em ' + (nx || 30) + ' dias', angle: ag[0], angles: ag };
    }
  });
}
const svcHidden = (k) => !!(S.ext.svc[k] && S.ext.svc[k].hidden);
const recipeOf = (k) => (S.ext.recipe[k] || []).filter((r) => prod(r.pid));
const recipeCost = (k) => round2(recipeOf(k).reduce((n, r) => n + unitCost(prod(r.pid), r.qty), 0));

/* ---------- tela de procedimentos ---------- */
async function vProcedimentos() {
  const areas = activeAreas();
  const rowOf = (k) => {
    const sv = SERVICES[k], pr = priceOf(k), cost = recipeCost(k), nrec = recipeOf(k).length, margin = pr > 0 ? Math.round(((pr - cost) / pr) * 100) : 0;
    return '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:200px"><div style="font-weight:500">' + esc(sv.name) + (svcHidden(k) ? ' <span class="tag off">oculto</span>' : '') + '</div><div class="muted sm">' + sv.dur + ' min · retorno em ' + sv.next + ' dias · ' + (nrec ? nrec + ' produto(s) na receita' : 'sem produtos na receita') + '</div></div>' +
      '<div style="text-align:right"><div style="font-weight:500">' + fmtBRL(pr) + '</div><div class="muted sm">' + (nrec ? 'gasto ' + fmtBRL(cost) + ' · margem ' + margin + '%' : 'defina o gasto') + '</div></div><button class="btn ghost sm" data-act="sv-edit" data-k="' + k + '">' + ic('edit') + 'Editar</button></div>';
  };
  const blocks = areas.map((a) => {
    const ks = Object.keys(SERVICES).filter((k) => SERVICES[k].area === a && !svcHidden(k)); if (!ks.length) return '';
    return '<div class="card"><h2 class="h2" style="margin-bottom:4px">' + AREAS[a].icon + ' ' + AREAS[a].name + '</h2>' + ks.map(rowOf).join('') + '</div>';
  }).join('');
  const hid = Object.keys(SERVICES).filter((k) => svcHidden(k) && areas.includes(SERVICES[k].area));
  return { nav: 'procedimentos', html: head('Gestão', 'Procedimentos', '<button class="btn" data-act="sv-edit" data-k="">+ Novo procedimento</button>') +
    '<div class="muted sm">Cadastre ou edite seus serviços, o preço e quanto de cada produto é gasto. O gasto entra no cálculo da margem e o estoque baixa sozinho ao concluir o atendimento.</div>' + blocks +
    (hid.length ? '<div class="card"><h2 class="h3">Ocultos</h2>' + hid.map(rowOf).join('') + '</div>' : '') };
}
ROUTEX.procedimentos = vProcedimentos;

/* ---------- editar / criar ---------- */
function svcModal() {
  const d = UI.svcEdit, isNew = !d.k, builtin = !!SERVICES_BASE[d.k];
  const pOpts = S.ext.products.filter((p) => p.active !== false && !d.recipe.some((r) => r.pid === p.id)).map((p) => '<option value="' + p.id + '">' + esc(p.name) + (p.shared ? ' (compartilhado)' : ' · em ' + (isMl(p) ? 'ml' : esc(p.unit))) + '</option>').join('');
  const rows = d.recipe.map((r, i) => { const p = prod(r.pid); if (!p) return ''; return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--line)"><span style="flex:1;font-size:14px">' + esc(p.name) + '</span>' + (p.shared ? '<span class="muted sm">compartilhado · rende ~' + (yieldOf(p) || 20) + ' usos</span>' : '<input class="in" style="width:90px;height:40px" type="number" step="any" min="0" data-rq="' + i + '" value="' + r.qty + '"><span class="muted sm" style="width:46px">' + esc(p.unit) + '</span>') + '<button class="btn ghost sm" style="height:34px;padding:0 10px" data-act="sv-del-prod" data-i="' + i + '" aria-label="Remover">' + ic('trash') + '</button></div>'; }).join('');
  const cost = round2(d.recipe.reduce((n, r) => { const p = prod(r.pid); return n + (p ? unitCost(p, r.qty) : 0); }, 0));
  openModal('<h2 class="h2">' + (isNew ? 'Novo procedimento' : 'Editar procedimento') + '</h2>' +
    '<div><label class="lb" for="sv_n">Nome</label><input class="in" id="sv_n" value="' + esc(d.name) + '" placeholder="Ex.: ' + esc(exFor('svc', d.area || activeAreas()[0])) + '"></div>' +
    (isNew ? '<div><label class="lb" for="sv_a">Área</label><select class="in" id="sv_a">' + activeAreas().map((a) => '<option value="' + a + '"' + (d.area === a ? ' selected' : '') + '>' + AREAS[a].name + '</option>').join('') + '</select></div>' : '') +
    '<div class="grid2" style="gap:10px"><div><label class="lb" for="sv_p">Preço (R$)</label><input class="in" id="sv_p" type="number" step="0.01" min="0" value="' + esc(d.price) + '"></div><div><label class="lb" for="sv_d">Duração (min)</label><input class="in" id="sv_d" type="number" min="10" step="5" value="' + esc(d.dur) + '"></div><div><label class="lb" for="sv_x">Retorno em (dias)</label><input class="in" id="sv_x" type="number" min="1" value="' + esc(d.next) + '"></div></div>' +
    '<div class="card stack" style="gap:6px;background:var(--blush2)"><h3 class="h3">Produtos gastos neste procedimento</h3><div class="muted sm">Quanto de cada produto é usado por atendimento. Itens compartilhados (cola, removedor) contam um uso e o app pergunta ao concluir se a unidade acabou.</div>' + (rows || '<div class="muted sm">Nenhum produto ainda.</div>') +
    (pOpts ? '<div style="display:flex;gap:8px;margin-top:6px"><select class="in" id="sv_pp" aria-label="Produto">' + pOpts + '</select><input class="in" id="sv_pq" type="number" step="any" min="0" value="1" style="width:90px" aria-label="Quantidade"><button class="btn ghost" data-act="sv-add-prod">Adicionar</button></div>' : (S.ext.products.length ? '' : '<div class="muted sm">Cadastre os produtos em Estoque para usá-los aqui.</div>')) +
    (d.recipe.length ? '<div class="muted sm">Gasto estimado por atendimento: <b>' + fmtBRL(cost) + '</b></div>' : '') + '</div>' +
    '<div class="acts" style="justify-content:flex-end">' + (!isNew ? '<button class="btn danger" data-act="sv-hide" data-k="' + d.k + '">' + (svcHidden(d.k) ? 'Mostrar' : (builtin ? 'Ocultar' : 'Excluir')) + '</button>' : '') + '<button class="btn ghost" data-act="modal-close">Cancelar</button><button class="btn" data-act="sv-save">Salvar</button></div>');
}
function svcCollect() {
  const d = UI.svcEdit; if (!d || !$('#sv_n')) return;
  d.name = $('#sv_n').value; d.price = $('#sv_p').value; d.dur = $('#sv_d').value; d.next = $('#sv_x').value; if ($('#sv_a')) d.area = $('#sv_a').value;
  document.querySelectorAll('[data-rq]').forEach((el) => { const r = d.recipe[+el.dataset.rq]; if (r) r.qty = Number(el.value) || 0; });
}
Object.assign(ACTX, {
  'sv-edit'(el) {
    const k = el.dataset.k, sv = k ? SERVICES[k] : null;
    UI.svcEdit = { k, name: sv ? sv.name : '', area: sv ? sv.area : activeAreas()[0], price: k ? priceOf(k) : '', dur: sv ? sv.dur : 60, next: sv ? sv.next : 30, recipe: k ? JSON.parse(JSON.stringify(S.ext.recipe[k] || [])) : [] };
    svcModal();
  },
  'sv-add-prod'() { svcCollect(); const pid = $('#sv_pp').value, q = Number($('#sv_pq').value) || 0; const p = prod(pid); if (!p || (!p.shared && !(q > 0))) { toast('Informe a quantidade'); return; } UI.svcEdit.recipe.push({ pid, qty: p.shared ? 1 : q }); svcModal(); },
  'sv-del-prod'(el) { svcCollect(); UI.svcEdit.recipe.splice(+el.dataset.i, 1); svcModal(); },
  'sv-save'() {
    svcCollect(); const d = UI.svcEdit, n = d.name.trim(); if (!n) { toast('Informe o nome'); return; }
    const price = round2(d.price), dur = Math.max(10, Math.round(Number(d.dur) || 60)), nx = Math.max(1, Math.round(Number(d.next) || 30)); let k = d.k;
    if (!k) { k = 'c_' + uid().slice(0, 6); S.ext.svc[k] = { custom: true, area: d.area, name: n, dur, next: nx }; }
    else S.ext.svc[k] = Object.assign(S.ext.svc[k] || {}, { name: n, dur, next: nx });
    S.settings.prices[k] = price; S.ext.recipe[k] = d.recipe.filter((r) => prod(r.pid)).map((r) => ({ pid: r.pid, qty: prod(r.pid).shared ? 1 : round2(r.qty) }));
    applySvc(); save(); closeModal(); if (typeof catDirty !== 'undefined') catDirty = true; route({ keep: true }); toast('Procedimento salvo');
  },
  async 'sv-hide'(el) {
    const k = el.dataset.k, builtin = !!SERVICES_BASE[k], hid = svcHidden(k);
    if (!hid && !(await confirmBox(builtin ? 'Ocultar procedimento?' : 'Excluir procedimento?', builtin ? 'Ele deixa de aparecer nas listas e na página de agendamento. Os atendimentos antigos são mantidos.' : 'Ele deixa de aparecer nas listas. Os atendimentos antigos são mantidos.', builtin ? 'Ocultar' : 'Excluir'))) return;
    S.ext.svc[k] = Object.assign(S.ext.svc[k] || {}, { hidden: !hid }); applySvc(); save(); closeModal(); if (typeof catDirty !== 'undefined') catDirty = true; route({ keep: true });
  }
});

/* ---------- produto: item compartilhado ---------- */
const _stkEdit = ACTX['stk-edit'];
ACTX['stk-edit'] = function (el) {
  _stkEdit.call(this, el); const p = el.dataset.id ? prod(el.dataset.id) : {}; const acts = document.querySelector('#modal .acts'); if (!acts) return;
  const x = document.createElement('div'); x.className = 'stack'; x.style.gap = '8px';
  x.innerHTML = '<label class="ck"><input type="checkbox" id="pd_sh"' + (p.shared ? ' checked' : '') + '>Item compartilhado: uma unidade rende vários atendimentos (cola, removedor, base…)</label><div><label class="lb" for="pd_y">Rende cerca de quantos atendimentos? (opcional)</label><input class="in" id="pd_y" type="number" min="1" value="' + esc(p.yield || '') + '" placeholder="Ex.: 40. O app aprende sozinho ao marcar \'acabou\'"></div>';
  acts.parentNode.insertBefore(x, acts);
};
ACTX['stk-save'] = function () {
  const n = $('#pd_n').value.trim(); if (!n) { toast('Informe o nome'); return; }
  const med = $('#pd_med') ? $('#pd_med').value : 'un', size = round2($('#pd_sz') ? $('#pd_sz').value : 0);
  if (med === 'ml' && !(size > 0)) { toast('Informe quantos ml tem a embalagem'); return; }
  const o = { name: n, med, size: med === 'ml' ? size : 0, unit: med === 'ml' ? 'ml' : ($('#pd_u').value.trim() || 'un'), area: $('#pd_a').value, qty: round2($('#pd_q').value), min: round2($('#pd_m').value), cost: round2($('#pd_c').value), shared: !!($('#pd_sh') && $('#pd_sh').checked), yield: Number($('#pd_y') && $('#pd_y').value) || 0 }, id = $('#pd_id').value;
  if (id) Object.assign(prod(id), o); else S.ext.products.push(Object.assign({ id: uid(), uses: 0, hist: [], epoch: 0 }, o));
  save(); closeModal(); route({ keep: true }); toast('Produto salvo');
};

/* a unidade acabou: baixa 1 do estoque, aprende o rendimento e avisa se chegou ao mínimo */
function emptyUnit(p) {
  p.hist = p.hist || []; if ((p.uses || 0) > 0) p.hist.push(p.uses);
  p.uses = 0; p.epoch = (p.epoch || 0) + 1; p.qty = Math.max(0, round2(Number(p.qty) - (isMl(p) ? Number(p.size) : 1))); save();
  if (Number(p.qty) <= Number(p.min)) toast('Estoque mínimo: ' + p.name + ' (restam ' + p.qty + ' ' + p.unit + ')');
}
function askShared(s) {
  const list = (s.use || []).map((u) => prod(u.pid)).filter((p) => p && p.shared); let i = 0;
  const next = () => new Promise((res) => {
    if (i >= list.length) { res(); return; } const p = list[i++], y = yieldOf(p);
    modalResolve = (yes) => { if (yes) emptyUnit(p); res(); };
    openModal('<h2 class="h2">A unidade acabou?</h2><div class="muted"><b>' + esc(p.name) + '</b> foi usada em ' + (p.uses || 0) + ' atendimento(s) desta unidade' + (y ? ' (costuma render ~' + y + ')' : '') + '. Em estoque: ' + p.qty + ' ' + esc(p.unit) + ' · mínimo ' + p.min + '.</div><div class="acts" style="justify-content:flex-end"><button class="btn ghost" data-act="modal-no">Ainda tem</button><button class="btn" data-act="modal-yes">Acabou</button></div>');
  });
  return (async () => { while (i < list.length) await next(); })();
}
Object.assign(ACTX, {
  async 'stk-empty'(el) { const p = prod(el.dataset.id); if (!p || !(await confirmBox('Acabou a unidade?', 'Baixa 1 ' + p.unit + ' de ' + p.name + ' do estoque e reinicia a contagem de usos.', 'Acabou'))) return; emptyUnit(p); route({ keep: true }); }
});

/* receita do procedimento entra sozinha nos produtos usados do atendimento */
const _useAdd = ACTX['use-add'], _useDel = ACTX['use-del'];
ACTX['use-add'] = function (el) { const s = curSession(); if (s) s.useTouched = true; return _useAdd.call(this, el); };
ACTX['use-del'] = function (el) { const s = curSession(); if (s) s.useTouched = true; return _useDel.call(this, el); };
function prefillRecipe(s) {
  if (!s || s.status === 'concluido' || s.useTouched || (s.use && s.use.length)) return;
  const r = recipeOf(s.service); if (!r.length) return;
  s.use = r.map((x) => ({ pid: x.pid, qty: x.qty })); s.useAuto = true; save();
}
if (typeof atendimentoExtra === 'function') { const _ae = atendimentoExtra; atendimentoExtra = function (s) { prefillRecipe(s); return _ae(s); }; } // eslint-disable-line no-func-assign

// cadastro de produto: troca os campos entre unidade e ml
document.addEventListener('change', (e) => {
  const t = e.target; if (!t || t.id !== 'pd_med') return; const ml = t.value === 'ml';
  document.querySelectorAll('.pd-ml').forEach((x) => { x.hidden = !ml; }); document.querySelectorAll('.pd-un').forEach((x) => { x.hidden = ml; });
  document.querySelectorAll('.pd-mu').forEach((x) => { x.textContent = ml ? 'ml' : 'und'; }); document.querySelectorAll('.pd-cl').forEach((x) => { x.textContent = ml ? 'Custo da embalagem' : 'Custo por unidade'; });
});
document.addEventListener('change', (e) => { const t = e.target; if (t && t.id === 'sv_a') { const n = $('#sv_n'); if (n) n.placeholder = 'Ex.: ' + exFor('svc', t.value); } });
