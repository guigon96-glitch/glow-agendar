'use strict';
/* ===== Anamnese e termo de consentimento por área, com assinatura e PDF ===== */
const ANAM_COMMON = [['alergia', 'Alergia a cosméticos, esmaltes, látex ou adesivos'], ['gestante', 'Gestante ou lactante'], ['medic', 'Usa medicamento contínuo ou anticoagulante'], ['cicatriz', 'Tendência a queloide ou cicatrização difícil'], ['doenca', 'Diabetes, problema de coagulação ou doença autoimune']];
const ANAM_AREA = {
  cilios: [['infeccao', 'Conjuntivite, blefarite ou infecção ocular'], ['lentes', 'Usa lentes de contato'], ['derma', 'Tratamento dermatológico na região dos olhos'], ['jafez', 'Já fez extensão de cílios antes']],
  sobrancelhas: [['isotret', 'Usa ou usou isotretinoína nos últimos 6 meses'], ['acido', 'Usa ácidos ou retinoides no rosto'], ['henna', 'Já teve reação a henna ou tintura'], ['sensivel', 'Pele muito sensível ou com rosácea']],
  unhas: [['micose', 'Micose, infecção ou ferida nas unhas ou cutículas'], ['monomero', 'Alergia a gel, acrílico ou monômeros'], ['circ', 'Problema circulatório ou diabetes nas mãos e pés'], ['quebr', 'Unhas muito finas, quebradiças ou descoladas']],
  cabelo: [['quimica', 'Química recente (progressiva, relaxamento, descoloração)'], ['tintura', 'Alergia ou reação a tintura'], ['couro', 'Couro cabeludo sensível, dermatite ou feridas'], ['queda', 'Queda de cabelo ou tratamento capilar em andamento']],
  maquiagem: [['acne', 'Acne ativa, dermatite ou herpes labial'], ['olhos', 'Alergia ou sensibilidade nos olhos'], ['lentes2', 'Usa lentes de contato'], ['pele', 'Pele muito sensível ou reativa']],
  estetica: [['isotret2', 'Usa ou usou isotretinoína nos últimos 6 meses'], ['acido2', 'Usa ácidos, retinoides ou fez peeling recente'], ['sol', 'Exposição solar ou bronzeamento nos últimos 7 dias'], ['varizes', 'Varizes, trombose ou problema circulatório'], ['herpes', 'Herpes ativa ou lesões na região'], ['implante', 'Marcapasso ou implantes metálicos']]
};
const TERMO_BASE = ['Declaro que as informações prestadas na ficha de anamnese são verdadeiras e completas, e que informei qualquer condição de saúde, alergia ou medicamento relevante para o procedimento.', 'Fui informada sobre o procedimento, os produtos utilizados, o resultado esperado e os cuidados antes e depois da sessão, e tive a oportunidade de esclarecer minhas dúvidas.'];
const TERMO_AREA = {
  cilios: 'Estou ciente de que podem ocorrer, ainda que raramente, irritação, vermelhidão, coceira ou reação alérgica ao adesivo, e de que devo interromper o uso e procurar orientação se isso acontecer. A durabilidade das extensões depende dos meus cuidados e do ciclo natural dos fios.',
  sobrancelhas: 'Estou ciente de que podem ocorrer vermelhidão temporária, sensibilidade ou reação a henna, tintura ou produtos da pele, e de que o resultado e a fixação variam conforme o tipo de pele e de pelo. Devo evitar sol, vapor e esfoliação nos dias indicados.',
  unhas: 'Estou ciente de que o gel, o acrílico e os monômeros podem causar sensibilização ou dermatite de contato, e de que o procedimento não deve ser feito sobre unhas ou cutículas com micose, infecção ou ferida. Devo seguir a manutenção indicada para evitar descolamento e infiltração.',
  cabelo: 'Estou ciente de que procedimentos químicos (coloração, descoloração, mechas, progressivas) dependem do histórico do meu cabelo e podem causar ressecamento, quebra, sensibilidade no couro cabeludo ou variação de tom. Autorizo o teste de mecha ou de sensibilidade quando indicado.',
  maquiagem: 'Estou ciente de que cosméticos podem causar reação alérgica em peles sensíveis e de que devo avisar imediatamente sobre qualquer ardência ou desconforto. Os produtos e acessórios são higienizados e de uso individual.',
  estetica: 'Estou ciente de que depilação, limpeza de pele e peeling podem causar vermelhidão, sensibilidade, descamação e, se houver exposição solar sem proteção, manchas. Devo informar o uso de ácidos ou isotretinoína e seguir as orientações de proteção solar e hidratação.'
};
const TERMO_FIM = 'Autorizo a realização do procedimento e estou ciente de que posso interromper a sessão a qualquer momento.';
const termoParas = (area) => { const o = S.settings.termos && S.settings.termos[area]; if (o && o.trim()) return o.split('\n').map((x) => x.trim()).filter(Boolean); return TERMO_BASE.concat([TERMO_AREA[area] || '', TERMO_FIM]).filter(Boolean); };
const anamQs = (area) => ANAM_COMMON.concat(ANAM_AREA[area] || []);
const areaOfSess = (s) => (SERVICES[s.service] || SERVICES.cilios).area;
const CONSENT_DAYS = 365;
function consentOf(c, area) {
  const k = c.consents && c.consents[area]; if (k) return k;
  if ((area === 'cilios' || area === 'sobrancelhas') && c.termo && c.termo.aceite) return { legacy: true, at: c.created || todayISO() };
  return null;
}
const consentValid = (c, area) => { const k = consentOf(c, area); return !!k && (k.legacy || k.at >= addDays(todayISO(), -CONSENT_DAYS)); };
function consentBanner(s) {
  const c = client(s.clientId); if (!c) return ''; const a = areaOfSess(s); if (consentValid(c, a)) return '';
  const k = consentOf(c, a);
  return '<div class="card stack" style="gap:8px;border-color:#C9AE86;background:#F8EEE9"><h2 class="h3">Termo e anamnese pendentes</h2><div class="muted sm">' + (k ? 'O termo de ' + AREAS[a].name + ' passou de 1 ano e precisa ser renovado.' : esc(c.name.split(' ')[0]) + ' ainda não assinou a anamnese e o termo de ' + AREAS[a].name + '.') + '</div><a class="btn sm" href="#/termo/' + c.id + '/' + a + '">Colher anamnese e termo</a></div>';
}

/* ---------- painel na ficha ---------- */
function consentPanel(c) {
  const areas = activeAreas().concat(Object.keys(c.consents || {}).filter((a) => !activeAreas().includes(a) && AREAS[a]));
  return '<div class="card stack"><h2 class="h2">Anamnese e termos por área</h2><div class="muted sm">Cada área tem a sua ficha de saúde e o seu termo, com assinatura da cliente na tela. Eles valem por 1 ano.</div>' + areas.map((a) => {
    const k = consentOf(c, a), ok = consentValid(c, a), yes = k && k.answers ? anamQs(a).filter((q) => k.answers[q[0]]).map((q) => q[1]) : [];
    return '<div style="border-top:1px solid #EFE4DD;padding-top:14px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b style="font-weight:500;font-size:17px">' + AREAS[a].name + '</b>' + (ok ? '<span class="tag done">' + (k.legacy ? 'Termo aceito (cadastro)' : 'Assinado em ' + fmtDate(k.at)) + '</span>' : k ? '<span class="tag off">Vencido</span>' : '<span class="tag next">Pendente</span>') + '<span class="sp"></span>' + (k && !k.legacy ? '<button class="btn ghost sm" data-act="termo-pdf" data-c="' + c.id + '" data-a="' + a + '">' + ic('dl') + 'PDF</button><button class="btn ghost sm" data-act="termo-wa" data-c="' + c.id + '" data-a="' + a + '">' + ic('chat') + (k.sentAt ? 'Enviado ' + fmtDate(k.sentAt) : 'Enviar') + '</button>' : '') + '<a class="btn ' + (ok ? 'ghost ' : '') + 'sm" href="#/termo/' + c.id + '/' + a + '">' + (k && !k.legacy ? 'Refazer' : 'Colher agora') + '</a></div>' + (k && !k.legacy ? (yes.length ? '<div class="chips">' + yes.map((x) => '<span class="tag sand" style="height:auto;padding:5px 12px;white-space:normal">' + esc(x) + '</span>').join('') + '</div>' : '<div class="muted sm">Nenhuma condição de atenção informada.</div>') + (k.obs ? '<div class="muted sm">Obs.: ' + esc(k.obs) + '</div>' : '') + (k.fotos === false ? '<div class="sm" style="color:#B42318">Não autorizou fotos de antes e depois.</div>' : '') : '') + '</div>';
  }).join('') + '</div>';
}

/* ---------- tela de coleta ---------- */
async function vTermo(cid, area) {
  const c = client(cid); if (!c || !AREAS[area]) return notFound('clientes');
  const old = c.consents && c.consents[area]; const ans = (old && old.answers) || {};
  const qs = anamQs(area);
  UI.consBack = UI.consBack && UI.consBack.indexOf('#/termo') < 0 ? UI.consBack : '#/clientes/' + cid;
  return { nav: 'clientes', html: head('Clientes · ' + esc(c.name), 'Anamnese e termo · ' + AREAS[area].name, '<a class="btn ghost" href="' + UI.consBack + '">Cancelar</a><button class="btn" data-act="consent-save" data-c="' + cid + '" data-a="' + area + '">Salvar e assinar</button>') +
    '<section class="cols"><div class="stack grow"><div class="card" style="padding:22px 24px 10px"><h2 class="h2" style="margin-bottom:4px">Ficha de saúde</h2><div class="muted sm">Marque o que se aplica à cliente.</div>' + qs.map(([k, l]) => '<label class="ck"><input type="checkbox" id="an_' + k + '"' + (ans[k] ? ' checked' : '') + '>' + esc(l) + '</label>').join('') + '<div style="padding:14px 0"><label class="lb" for="an_obs">Outras informações importantes</label><textarea class="in" id="an_obs" placeholder="Alergias específicas, medicamentos, cirurgias recentes…">' + esc((old && old.obs) || '') + '</textarea></div></div></div>' +
    '<div class="stack" style="width:480px;flex:none"><div class="card stack" style="gap:12px"><h2 class="h2">Termo de consentimento</h2><div class="stack" style="gap:10px;font-size:14px;line-height:1.5;max-height:300px;overflow:auto;padding-right:6px">' + termoParas(area).map((p) => '<p style="margin:0">' + esc(p) + '</p>').join('') + '</div><label class="ck"><input type="checkbox" id="t_aceite"' + (old ? ' checked' : '') + '>Li e aceito o termo</label><label class="ck"><input type="checkbox" id="t_fotos"' + (!old || old.fotos !== false ? ' checked' : '') + '>Autorizo fotos de antes e depois para acompanhamento</label><label class="ck"><input type="checkbox" id="t_div"' + (old && old.divulgacao ? ' checked' : '') + '>Autorizo usar minhas fotos em divulgação (opcional)</label><div><div class="lb">Assinatura da cliente</div><canvas class="sig" id="sig" aria-label="Área de assinatura"></canvas><button class="btn ghost sm" style="margin-top:8px" data-act="sig-clear">Limpar</button></div></div></div></section>' };
}
ROUTEX.termo = async () => { const p = parts(); return vTermo(p[1], p[2]); };

/* ---------- PDF do termo ---------- */
// multi: o termo passou de uma página; reserva o rodapé para a assinatura repetir em todas as páginas
async function renderTermo(c, area, multi) {
  await ensureFonts(); const k = c.consents && c.consents[area]; if (!k) return [];
  const sign = k.signId ? (await Photo.preload([k.signId]), PC.get(k.signId)) : null;
  const pages = []; let cv, ctx, y, sigPage = -1; const LIM = multi ? RH - 250 : RH - 120;
  const newPage = () => { cv = document.createElement('canvas'); cv.width = RW; cv.height = RH; ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, RW, RH); pages.push(cv); ctx.fillStyle = '#3B2E2E'; ctx.font = "italic 500 52px 'Cormorant Garamond'"; ctx.textAlign = 'left'; ctx.fillText(S.settings.studio, RM, RM + 44); ctx.textAlign = 'right'; ctx.fillStyle = '#7F6538'; ctx.font = "500 19px 'Jost'"; ctx.fillText('ANAMNESE E TERMO · ' + AREAS[area].name.toUpperCase(), RW - RM, RM + 26); ctx.fillStyle = '#756560'; ctx.font = "400 22px 'Jost'"; ctx.fillText(fmtLong(k.at), RW - RM, RM + 58); ctx.textAlign = 'left'; ctx.fillStyle = '#C9AE86'; ctx.fillRect(RM, RM + 84, RW - RM * 2, 2); y = RM + 150; };
  const need = (h) => { if (y + h > LIM) newPage(); };
  newPage();
  ctx.fillStyle = '#756560'; ctx.font = "400 22px 'Jost'"; ctx.fillText('Cliente', RM, y - 18); ctx.fillStyle = '#3B2E2E'; ctx.font = "500 38px 'Jost'"; ctx.fillText(c.name, RM, y + 22); y += 84;
  ctx.fillStyle = '#3B2E2E'; ctx.font = "600 40px 'Cormorant Garamond'"; ctx.fillText('Ficha de saúde', RM, y); y += 40;
  ctx.font = "400 26px 'Jost'";
  anamQs(area).forEach(([key, l]) => { const yes = !!(k.answers && k.answers[key]); const lines = wrap(ctx, l, RW - RM * 2 - 120); need(lines.length * 32 + 10); ctx.fillStyle = yes ? '#8F504D' : '#3B2E2E'; ctx.font = (yes ? '500' : '400') + " 26px 'Jost'"; lines.forEach((ln, i) => ctx.fillText(ln, RM, y + i * 32)); ctx.textAlign = 'right'; ctx.fillText(yes ? 'SIM' : 'Não', RW - RM, y); ctx.textAlign = 'left'; y += lines.length * 32 + 10; });
  if (k.obs) { y += 10; ctx.fillStyle = '#756560'; ctx.font = "400 22px 'Jost'"; ctx.fillText('Outras informações', RM, y); y += 34; ctx.fillStyle = '#3B2E2E'; ctx.font = "400 26px 'Jost'"; wrap(ctx, k.obs, RW - RM * 2).forEach((ln) => { need(34); ctx.fillText(ln, RM, y); y += 34; }); }
  y += 40; need(120); ctx.fillStyle = '#3B2E2E'; ctx.font = "600 40px 'Cormorant Garamond'"; ctx.fillText('Termo de consentimento', RM, y); y += 44; ctx.font = "400 25px 'Jost'";
  (k.text || termoParas(area)).forEach((p) => { const lines = wrap(ctx, p, RW - RM * 2); need(lines.length * 34 + 18); ctx.fillStyle = '#3B2E2E'; ctx.font = "400 25px 'Jost'"; lines.forEach((ln, i) => ctx.fillText(ln, RM, y + i * 34)); y += lines.length * 34 + 18; });
  y += 6; need(3 * 36 + 16 + 200); /* aceite e assinatura ficam juntos */ ctx.font = "400 25px 'Jost'"; ctx.fillStyle = '#3B2E2E';
  [['Li e aceito o termo', true], ['Autorizo fotos de antes e depois para acompanhamento', k.fotos !== false], ['Autorizo o uso das fotos em divulgação', !!k.divulgacao]].forEach(([l, v]) => { ctx.fillText((v ? '☑  ' : '☐  ') + l, RM, y); y += 38; });
  y += 16; sigPage = pages.length - 1; if (sign) { const im = await loadImg(sign); const h = 110, w = Math.min(520, im.width / im.height * h); ctx.drawImage(im, RM, y, w, h); }
  ctx.fillStyle = '#E5D6CE'; ctx.fillRect(RM, y + 120, 520, 2); ctx.fillStyle = '#756560'; ctx.font = "400 22px 'Jost'"; ctx.fillText(c.name + ' · assinado em ' + fmtDate(k.at), RM, y + 152);
  pages.forEach((p, i) => { const g = p.getContext('2d'); g.fillStyle = '#756560'; g.font = "400 20px 'Jost'"; g.textAlign = 'center'; g.fillText(S.settings.studio + (pages.length > 1 ? '  ·  ' + (i + 1) + '/' + pages.length : ''), RW / 2, RH - 60); g.textAlign = 'left'; });
  if (!multi && pages.length > 1) return renderTermo(c, area, true);
  if (multi) {
    const im = sign ? await loadImg(sign) : null;
    pages.forEach((p, i) => {
      if (i === sigPage) return; const g = p.getContext('2d'), x1 = RW - RM - 420;
      if (im) { const h = 72, w = Math.min(420, im.width / im.height * h); g.drawImage(im, RW - RM - w, RH - 210, w, h); }
      g.fillStyle = '#E5D6CE'; g.fillRect(x1, RH - 132, 420, 2);
      g.fillStyle = '#756560'; g.font = "400 20px 'Jost'"; g.textAlign = 'right'; g.fillText('Assinatura de ' + c.name + ' · ' + fmtDate(k.at), RW - RM, RH - 104); g.textAlign = 'left';
    });
  }
  return pages;
}
/* envia o PDF assinado para a cliente: no Android vai anexado na conversa; na web baixa o PDF e abre o WhatsApp com o texto */
async function sendTermo(c, area) {
  const phone = waNumber(c.phone); if (!phone) { toast('Cadastre o WhatsApp da cliente'); return; }
  toast('Gerando PDF…'); const pages = await renderTermo(c, area); if (!pages.length) return;
  const name = 'Termo-' + slug(AREAS[area].name) + '-' + slug(c.name) + '.pdf', b64s = bytesToB64(buildPdf(pages));
  const text = 'Oi, ' + c.name.split(' ')[0] + '! Segue a sua ficha de anamnese e o termo de consentimento de ' + AREAS[area].name + ', assinados em ' + fmtDate(c.consents[area].at) + '. Qualquer dúvida, é só falar. ' + S.settings.studio;
  if (hasNative() && window.Native.shareWhatsApp) {
    const r = String(window.Native.shareWhatsApp(phone, text, JSON.stringify([{ name, mime: 'application/pdf', b64: b64s }])));
    if (r.indexOf('error') === 0) { toast('Não foi possível abrir o WhatsApp'); return; }
    toast('Confira o PDF anexado e toque em enviar no WhatsApp');
  } else { downloadB64(name, 'application/pdf', b64s); openExternal('https://wa.me/' + phone + '?text=' + encodeURIComponent(text)); toast('PDF baixado: anexe-o na conversa do WhatsApp'); }
  c.consents[area].sentAt = todayISO(); save(); route({ keep: true });
}
Object.assign(ACTX, {
  async 'consent-save'(el) {
    const c = client(el.dataset.c), area = el.dataset.a, old = c.consents && c.consents[area];
    if (!$('#t_aceite').checked) { toast('A cliente precisa aceitar o termo'); return; }
    const sg = $('#sig'); if (!sigInk) { toast('Peça a assinatura da cliente'); return; }
    const answers = {}; anamQs(area).forEach(([k]) => { answers[k] = $('#an_' + k).checked; });
    const signId = await Photo.add(sg.toDataURL('image/png')); if (old && old.signId) await Photo.del(old.signId);
    c.consents = c.consents || {};
    c.consents[area] = { at: todayISO(), ver: 1, answers, obs: $('#an_obs').value.trim(), fotos: $('#t_fotos').checked, divulgacao: $('#t_div').checked, signId, text: termoParas(area) };
    c.termo = Object.assign({ aceite: true, fotos: true, divulgacao: false }, c.termo || {}, { aceite: true, fotos: $('#t_fotos').checked, divulgacao: $('#t_div').checked });
    c.anam = Object.assign(c.anam || {}, answers);
    save(); toast('Anamnese e termo salvos'); const b = UI.consBack; UI.consBack = null; go(b || '#/clientes/' + c.id);
    if (waNumber(c.phone) && await confirmBox('Enviar o termo assinado?', 'O PDF com a anamnese e o termo assinados vai para o WhatsApp de ' + c.name.split(' ')[0] + '.', 'Enviar')) await sendTermo(c, area);
  },
  async 'termo-wa'(el) { await sendTermo(client(el.dataset.c), el.dataset.a); },
  async 'termo-pdf'(el) { const c = client(el.dataset.c); toast('Gerando PDF…'); const pages = await renderTermo(c, el.dataset.a); if (!pages.length) return; saveFileOut('Termo-' + slug(AREAS[el.dataset.a].name) + '-' + slug(c.name) + '.pdf', 'application/pdf', bytesToB64(buildPdf(pages))); }
});
/* termo editável nos Ajustes */
AJ_EXTRA.push(['ter', 'Termos de consentimento']);
const _ajExtra = ajExtra;
ajExtra = function (tab) { // eslint-disable-line no-func-assign
  if (tab !== 'ter') return _ajExtra(tab);
  const a = AREAS[UI.ajTer] && activeAreas().includes(UI.ajTer) ? UI.ajTer : activeAreas()[0];
  return '<div class="card stack"><h2 class="h2">Termos de consentimento</h2><div class="muted sm">Um texto para cada área. Um parágrafo por linha. Este é um modelo genérico: revise com o responsável técnico ou com um advogado antes de usar com clientes.</div><div class="chips">' + activeAreas().map((k) => '<button class="chip ' + (k === a ? 'on' : '') + '" data-act="ter-area" data-v="' + k + '">' + AREAS[k].name + '</button>').join('') + '</div><textarea class="in" rows="14" data-termo="' + a + '">' + esc(termoParas(a).join('\n')) + '</textarea><button class="btn ghost sm" style="align-self:flex-start" data-act="ter-reset" data-v="' + a + '">Restaurar texto padrão</button></div>';
};
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.termo) { S.settings.termos = S.settings.termos || {}; S.settings.termos[t.dataset.termo] = t.value; save(); } });
Object.assign(ACTX, {
  'ter-area'(el) { UI.ajTer = el.dataset.v; route({ keep: true }); },
  'ter-reset'(el) { if (S.settings.termos) delete S.settings.termos[el.dataset.v]; save(); route({ keep: true }); toast('Texto restaurado'); }
});
/* exemplo: assinaturas e termos dos clientes de demonstração */
async function demoConsents() {
  await ensureFonts();
  for (const c of S.clients) {
    const areas = Array.from(new Set(S.sessions.filter((s) => s.clientId === c.id).map(areaOfSess)));
    const cv = document.createElement('canvas'); cv.width = 600; cv.height = 200; const g = cv.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0)'; g.font = "italic 600 78px 'Cormorant Garamond'"; g.fillStyle = '#3B2E2E'; g.fillText(c.name.split(' ')[0] + ' ' + (c.name.split(' ').pop()[0] || '') + '.', 24, 120); g.strokeStyle = '#3B2E2E'; g.lineWidth = 3; g.beginPath(); g.moveTo(24, 150); g.bezierCurveTo(180, 130, 320, 175, 540, 140); g.stroke();
    const signId = await Photo.add(cv.toDataURL('image/png')); c.signId = c.signId || signId; c.consents = {};
    areas.forEach((a, i) => { const answers = {}; if (a === 'cilios' && c.anam && c.anam.lentes) answers.lentes = true; if (c.name === 'Tatiane Melo') answers.quimica = true; if (c.name === 'Daniela Freitas') answers.acido2 = true; c.consents[a] = { at: addDays(todayISO(), -(30 + i * 7)), ver: 1, answers, obs: '', fotos: true, divulgacao: false, signId, text: termoParas(a), demo: true }; });
  }
}
