'use strict';
/* ===== Pix direto na conta da profissional: cobrança no atendimento e sinal no agendamento online ===== */
const PIX_TYPES = [['aleatoria', 'Chave aleatória (recomendado)'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['cpfcnpj', 'CPF ou CNPJ']];
function pixCfg() { S.settings.pix = Object.assign({ type: 'aleatoria', key: '', name: '', city: '', mode: 'off', pct: 30, disc: 0 }, S.settings.pix || {}); return S.settings.pix; }
const pixKey = () => { const c = pixCfg(); return PixCore.normKey(c.type, c.key); };
const pixReady = () => !!pixKey();
function pixCode(amount, txid) { const c = pixCfg(); return PixCore.payload({ key: pixKey(), name: c.name || S.settings.owner || S.settings.studio, city: c.city || 'BRASIL', amount: amount, txid: txid || '***' }); }
const dueOf = (s) => Math.max(0, round2(sessNet(s) - (s.deposit && s.deposit.ok ? Number(s.deposit.value) || 0 : 0)));
const depTxt = (s) => (s.deposit && s.deposit.ok ? ' (sinal de ' + fmtBRL(s.deposit.value) + ' já recebido)' : '');
let PIXCTX = null;
function pixModal(o) { // { amount, title, who, phone, got: 'texto do botão', ctx }
  if (!pixReady()) { toast('Cadastre sua chave Pix em Ajustes > Pix'); return; }
  PIXCTX = o; const code = pixCode(o.amount, o.txid);
  openModal('<h2 class="h2">' + esc(o.title || 'Cobrar com Pix') + '</h2><div class="muted">' + esc(o.who || '') + ' · <b>' + fmtBRL(o.amount) + '</b>' + (o.note ? '<br>' + esc(o.note) : '') + '</div><div style="display:flex;justify-content:center;background:#fff;border-radius:16px;padding:10px">' + PixCore.qrSvg(code, 220) + '</div><div class="muted sm" style="text-align:center">Peça para a cliente abrir o app do banco e ler o QR Code. O valor cai direto na sua conta.</div><div style="font:12px/1.35 ui-monospace,Menlo,monospace;background:var(--blush2);border-radius:12px;padding:10px;word-break:break-all;max-height:84px;overflow:auto">' + esc(code) + '</div><div class="acts" style="flex-wrap:wrap;justify-content:flex-end"><button class="btn ghost sm" data-act="cl-copy" data-v="' + esc(code) + '">Copiar código</button>' + (o.phone ? '<button class="btn wa sm" data-act="pix-wa">Enviar por WhatsApp</button>' : '') + '<button class="btn ghost" data-act="pix-back">' + esc(o.backTxt || 'Voltar') + '</button><button class="btn" data-act="pix-got">' + esc(o.got || 'Recebi o Pix') + '</button></div>');
}
function pixRestorePicker() {
  const s = sess(UI.payFor); if (!s) { closeModal(); return; }
  const later = payResolve ? '<button class="btn ghost" data-act="pay-later">Receber depois</button>' : '<button class="btn ghost" data-act="modal-close">Cancelar</button>';
  openModal(payPicker('Receber pagamento', esc((client(s.clientId) || {}).name || '') + ' · ' + fmtBRL(dueOf(s)) + esc(depTxt(s)), '<div class="acts" style="justify-content:flex-end">' + later + '</div>'));
}
(function () {
  const _pp = ACTX['pay-pick'];
  ACTX['pay-pick'] = function (el, e) {
    if (el.dataset.v === 'Pix' && pixReady() && UI.payFor) {
      const s = sess(UI.payFor); if (s && dueOf(s) > 0) { const c = client(s.clientId) || {}; pixModal({ amount: dueOf(s), title: 'Cobrar com Pix', who: c.name || '', phone: c.phone, txid: 'GLOW' + String(s.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 12), kind: 'pay', backTxt: 'Outra forma', got: 'Recebi o Pix', note: depTxt(s).trim() ? 'Sinal já recebido: ' + fmtBRL(s.deposit.value) : '' }); return; }
    }
    return _pp(el, e);
  };
  Object.assign(ACTX, {
    'pix-got'() { const o = PIXCTX; PIXCTX = null; if (o && o.kind === 'pay') _pp({ dataset: { v: 'Pix' } }); else closeModal(); if (o && o.onGot) o.onGot(); },
    'pix-back'() { const o = PIXCTX; PIXCTX = null; if (o && o.kind === 'pay') pixRestorePicker(); else closeModal(); },
    'pix-wa'() { const o = PIXCTX; if (!o || !o.phone) return; const t = (o.msg || ('Oi, ' + String(o.who || '').split(' ')[0] + '! Segue o Pix de ' + fmtBRL(o.amount) + ' (' + S.settings.studio + '). Pix copia e cola:')) + '\n\n' + pixCode(o.amount, o.txid); sendTo(o.phone, t, null); },
    'pix-test'() { pixModal({ amount: 1, title: 'Teste do seu QR Code', who: 'Valor de teste', note: 'Leia com o app do seu banco e confira se o nome do recebedor está certo. Não é necessário pagar.', backTxt: 'Fechar', got: 'Ok' }); },
    'pix-noop'() {}
  });
  document.addEventListener('change', (e) => { const t = e.target; if (t && (t.id === 'px_m' || t.id === 'px_t')) setTimeout(() => route({ keep: true }), 30); });
})();
function ajPix() {
  const c = pixCfg(), ok = pixReady(), bad = c.key && !ok, sinalOk = can('sinal');
  const ex = { aleatoria: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', email: 'voce@email.com', telefone: '(11) 9 0000-0000', cpfcnpj: 'somente números' }[c.type];
  return '<div class="card stack"><h2 class="h2">Pix direto na sua conta</h2><div class="muted sm">O dinheiro vai direto para a sua conta, sem intermediário e sem taxa do app. O app gera o QR Code e o código “copia e cola” a partir da sua chave. Você confirma quando o dinheiro chegar.</div>' +
    '<div><label class="lb" for="px_t">Tipo da chave</label><select class="in" id="px_t" data-o="st" data-f="pix.type">' + PIX_TYPES.map(([k, l]) => '<option value="' + k + '"' + (c.type === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
    '<div><label class="lb" for="px_k">Sua chave Pix</label><input class="in" id="px_k" data-o="st" data-f="pix.key" autocomplete="off" placeholder="' + ex + '" value="' + esc(c.key) + '">' + (bad ? '<div class="sm" style="color:#9A3A36;margin-top:6px">Esta chave não parece válida para o tipo escolhido.</div>' : '') + (c.type === 'cpfcnpj' ? '<div class="sm" style="color:#9A3A36;margin-top:6px">Atenção: com CPF o número aparece para quem escanear o código. Prefira chave aleatória ou e-mail.</div>' : '') + '</div>' +
    '<div class="grid2"><div><label class="lb" for="px_n">Nome do recebedor (até 25 letras)</label><input class="in" id="px_n" maxlength="25" data-o="st" data-f="pix.name" placeholder="' + esc(S.settings.owner || 'Seu nome') + '" value="' + esc(c.name) + '"></div><div><label class="lb" for="px_c">Cidade (até 15 letras)</label><input class="in" id="px_c" maxlength="15" data-o="st" data-f="pix.city" placeholder="São Paulo" value="' + esc(c.city) + '"></div></div>' +
    '<div class="acts"><button class="btn ghost sm" data-act="pix-test"' + (ok ? '' : ' disabled') + '>Ver QR Code de teste</button></div></div>' +
    '<div class="card stack"><h2 class="h2">Cobrança no agendamento online</h2>' + (sinalOk ? '' : '<div class="muted sm" style="color:#9A3A36">O sinal por Pix no link de agendamento faz parte do plano Essencial ou superior. Seu plano: <b>' + esc(planLabel()) + '</b>.</div>') +
    '<div class="muted sm">Quando a cliente pedir um horário pelo link, ela já vê o QR Code. O horário fica reservado até você confirmar o recebimento. Sem aviso de pagamento em 12 horas, o horário volta a ficar livre.</div>' +
    '<div><label class="lb" for="px_m">O que cobrar</label><select class="in" id="px_m" data-o="st" data-f="pix.mode"' + (sinalOk ? '' : ' disabled') + '><option value="off"' + (c.mode === 'off' ? ' selected' : '') + '>Não cobrar nada na hora</option><option value="sinal"' + (c.mode === 'sinal' ? ' selected' : '') + '>Sinal (parte do valor)</option><option value="total"' + (c.mode === 'total' ? ' selected' : '') + '>Pagamento integral</option></select></div>' +
    (c.mode === 'sinal' ? '<div><label class="lb" for="px_p">Sinal (% do valor do procedimento)</label><input class="in" id="px_p" type="number" min="5" max="100" step="5" data-o="st" data-f="pix.pct" data-num="1" value="' + (Number(c.pct) || 30) + '"></div>' : '') +
    (c.mode !== 'off' ? '<div><label class="lb" for="px_d">Desconto para quem pagar adiantado (%) — opcional</label><input class="in" id="px_d" type="number" min="0" max="30" step="1" data-o="st" data-f="pix.disc" data-num="1" placeholder="0 = sem desconto" value="' + (Number(c.disc) || '') + '"><div class="muted sm" style="margin-top:6px">Quem pagar ' + (c.mode === 'total' ? 'o valor integral' : 'o sinal') + ' pelo link ganha esse desconto sobre o valor do procedimento' + (Number(c.disc) > 0 ? '. Ex.: procedimento de R$ 100 → ela paga ' + fmtBRL(100 * (1 - Math.min(30, Number(c.disc)) / 100) * (c.mode === 'sinal' ? (Number(c.pct) || 30) / 100 : 1)) + (c.mode === 'sinal' ? ' de sinal e o total do atendimento fica R$ ' + (100 - Math.min(30, Number(c.disc))) : '') : '. Deixe vazio para não dar desconto') + '.</div></div>' : '') +
    (c.mode !== 'off' && !ok ? '<div class="sm" style="color:#9A3A36">Cadastre uma chave Pix válida acima para ativar.</div>' : '') + '<div class="muted sm">Procedimentos sem preço cadastrado não geram cobrança. Mude o preço em Ajustes > Horários e preços.</div></div>';
}
(function () { AJ_EXTRA.push(['pix', 'Pix (sinal e cobrança)']); const _aj = ajExtra; ajExtra = function (tab) { return tab === 'pix' ? ajPix() : _aj(tab); }; })(); // eslint-disable-line no-func-assign
/* catálogo público: só leva o Pix quando está ativo e o plano permite */
function pixCatalog() { const c = pixCfg(); if (!pixReady() || !can('sinal') || !['sinal', 'total'].includes(c.mode)) return null; return { key: pixKey(), name: c.name || S.settings.owner || S.settings.studio, city: c.city || 'BRASIL', mode: c.mode, pct: Number(c.pct) || 30, disc: Math.min(30, Math.max(0, Number(c.disc) || 0)) }; }
